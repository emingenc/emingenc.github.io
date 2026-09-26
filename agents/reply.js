// reply.js — every way the agent answers without running a tool: the LLM
// consent gate, a streamed generation with its own grounded self-check, and
// the canned fallback when consent is declined. Reply never decides whether
// a tool should run; the orchestrator's reply effect hands it a turn that is
// already past that decision, and each mode below ends that turn exactly
// once.
'use strict';
var Reply;
{
  const GENERATION_TIMEOUT_MS = 90000; // matches chat-worker's own dead-request budget
  const CONTEXT_HINT_PCT = 90;
  const GROUNDED_ACCEPT_CONFIDENCE = 60;
  const CANNED_DELAY_BASE_MS = 400;
  const CANNED_DELAY_JITTER_MS = 300;
  const CANNED_WORD_BASE_MS = 30;
  const CANNED_WORD_JITTER_MS = 20;
  const GENERATION_TIMEOUT_LINE = '─── generation timed out ───';
  const UNSUPPORTED_ANSWER = 'I don\'t have enough verified information to answer that reliably.';

  let store = null;

  function escapeHtml(value) {
    return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // ─── Shared by every mode that just speaks a FAQ line and stops ────────
  function faqContentOr(text, fallback) {
    const faq = Tools.faqMatch(text);
    return faq ? faq.content : fallback;
  }

  function replyFaqOr(turn, text, fallback) {
    turn.dispatch({ type: 'MESSAGE_ADD', message: { role: 'agent', type: 'faq', content: faqContentOr(text, fallback), ts: '' } });
    turn.end();
  }

  // Opens a streamed message and hands back a closer that is safe to call
  // more than once. Stop, a supersede and a natural finish all reach for the
  // same closer — an abort fires it too, so a stream never outlives its turn.
  function openStream(turn, id) {
    turn.dispatch({ type: 'MESSAGE_ADD', message: { id, role: 'agent', type: 'stream', content: '', ts: '', _streaming: true } });
    let closed = false;
    function close() {
      if (closed) return;
      closed = true;
      turn.dispatch({ type: 'MESSAGE_STREAM_DONE', id });
    }
    turn.signal.addEventListener('abort', close, { once: true });
    return close;
  }

  // ─── Consent pending ─────────────────────────────────────────────────
  function sendConsentPending(turn) {
    turn.dispatch({ type: 'MESSAGE_ADD', message: { role: 'agent', type: 'llm-consent', content: Tools.llmConsentMessage(), ts: '' } });
    turn.end();
  }

  // ─── No consent: a canned answer that still holds the turn's lock ─────
  function writeCannedWord(turn, stream) {
    if (!turn.isCurrent()) return;
    if (stream.index >= stream.words.length) { stream.close(); turn.end(); return; }
    turn.dispatch({ type: 'MESSAGE_STREAM', id: stream.id, chunk: `${stream.words[stream.index]} ` });
    const next = { ...stream, index: stream.index + 1 };
    turn.after(CANNED_WORD_BASE_MS + Math.random() * CANNED_WORD_JITTER_MS, () => writeCannedWord(turn, next));
  }

  function beginCannedStream(turn) {
    if (!turn.isCurrent()) return;
    // No turn id in this fallback id: nothing keys off it beyond this closure.
    const id = `msg_${Date.now()}`;
    const words = Tools.faqFallback().split(' ');
    writeCannedWord(turn, { id, words, index: 0, close: openStream(turn, id) });
  }

  function sendCanned(turn) {
    turn.busy('responding', 'generating response');
    turn.after(CANNED_DELAY_BASE_MS + Math.random() * CANNED_DELAY_JITTER_MS, () => beginCannedStream(turn));
  }

  // ─── Consent given, model still loading or dead ────────────────────────
  function sendModelNotReady(turn, text) {
    const state = store.getState();
    if (!state.models.llmLoading) Classifier.enableLLM();
    if (state.models.llmLoading) {
      const progress = state.models.llmDownloadProgress || 0;
      return replyFaqOr(turn, text, `Text generation model is downloading... (${progress}%). Try again soon.`);
    }
    return replyFaqOr(turn, text, Tools.reducedModeMessage());
  }

  // ─── Consent given, model ready: stream a generation ───────────────────
  function makeTokenSink(turn, id) {
    let text = '';
    function onToken(chunk) {
      text += chunk;
      turn.dispatch({ type: 'MESSAGE_STREAM', id, chunk });
    }
    return { onToken, text: () => text };
  }

  function hintIfContextHigh(turn) {
    if (store.getState().ui.contextPct < CONTEXT_HINT_PCT) return;
    turn.dispatch({ type: 'MESSAGE_ADD', message: { role: 'agent', type: 'faq', content: Tools.contextExhaustedMessage(), ts: '' } });
  }

  function onGenerationTimeout(turn, close) {
    close();
    turn.dispatch({ type: 'MESSAGE_ADD', message: { role: 'system', type: 'system', content: GENERATION_TIMEOUT_LINE, ts: '', noTs: true } });
    turn.end();
  }

  // Rides into working memory as an OBSERVE, ahead of the grounded check, so
  // the evaluator's compactErrors carries a generation error to the model.
  function observeGenerationError(turn, result) {
    if (!result?.error) return;
    turn.dispatch({ type: 'OBSERVE', tool: 'chat', satisfied: false, confidence: 0, error: result.error, reason: 'generation-error' });
  }

  function sendGenerated(turn, text) {
    turn.busy('responding', 'generating response');
    hintIfContextHigh(turn);
    const id = `msg_${turn.id}_${Date.now()}`;
    const sink = makeTokenSink(turn, id);
    const pending = Classifier.generate(text, Context.forGeneration(store.getState()), { id, signal: turn.signal, onToken: sink.onToken });
    if (!pending) return replyFaqOr(turn, text, Tools.faqFallback());

    const close = openStream(turn, id);
    const cancelTimeout = turn.after(GENERATION_TIMEOUT_MS, () => onGenerationTimeout(turn, close));
    pending.then((result) => {
      if (!turn.isCurrent()) return;
      cancelTimeout();
      close();
      observeGenerationError(turn, result);
      groundedEvaluate(turn, { question: text, text: sink.text() });
    });
  }

  // ─── Grounded evaluation of a generated answer ─────────────────────────
  function dispatchGroundedReply(turn, question, summary) {
    if (summary) {
      turn.dispatch({ type: 'MESSAGE_ADD', message: { role: 'agent', type: 'llm-summary', content: `<div class="llm-summary">${escapeHtml(summary)}</div>`, ts: '' } });
      return;
    }
    turn.dispatch({ type: 'MESSAGE_ADD', message: { role: 'agent', type: 'faq', content: faqContentOr(question, UNSUPPORTED_ANSWER), ts: '' } });
  }

  function settleGroundedEvaluation(turn, answer, result) {
    if (!turn.isCurrent()) return;
    const confidence = result?.confidence || 0;
    const accepted = Boolean(result?.stop) && confidence >= GROUNDED_ACCEPT_CONFIDENCE &&
      Evaluator.groundedAgainstProfile(answer.text);
    turn.trace(`eval → ${accepted ? 'grounded pass' : 'replan'} · confidence ${confidence}`);
    dispatchGroundedReply(turn, answer.question, accepted ? result.summary : null);
    turn.trace(accepted ? 'stop → grounded summary ready' : 'stop → unsupported claim rejected');
    turn.end();
  }

  // Evaluator's own contract always resolves, but a stray rejection (a worker
  // crash mid-check) must not strand the turn holding its lock forever.
  function abortGroundedEvaluation(turn) {
    if (!turn.isCurrent()) return;
    turn.trace('eval → error, stopping turn');
    turn.end();
  }

  function groundedEvaluate(turn, answer) {
    turn.trace('eval → grounded chat response');
    turn.busy('evaluating', 'checking grounded response');
    Evaluator.evaluate(answer.question, [{ toolName: 'chat', content: answer.text, data: null }], { signal: turn.signal })
      .then((result) => settleGroundedEvaluation(turn, answer, result))
      .catch(() => abortGroundedEvaluation(turn));
  }

  // ─── Public API ─────────────────────────────────────────────────────────
  function send(turn, text) {
    if (Classifier.isLLMConsentPending()) return sendConsentPending(turn);
    if (!Classifier.hasLLMConsent()) return sendCanned(turn);
    return Classifier.isLLMReady() ? sendGenerated(turn, text) : sendModelNotReady(turn, text);
  }

  function init(boundStore) { store = boundStore; }

  Reply = { init, send };
}

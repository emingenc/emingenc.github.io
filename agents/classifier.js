// classifier.js — the page's two on-device models, each behind its own
// worker: Needle (needle-router.js) classifies a question's intent, and
// SmolLM2-360M (chat-worker.js) generates, evaluates and aligns. Every
// request carries an id and settles once, on whichever comes first: the
// reply that echoes its id, its caller's abort, or (for classify) its own
// timeout. A reply that finds no request waiting, late after Stop or a
// timeout, is dropped, so it never reaches a later turn or the store.
'use strict';

var Classifier;

{
  const CLASSIFY_TIMEOUT_MS = 2000;
  const NEEDLE_URL = '/agents/needle-router.js';
  const CHAT_URL = '/agents/chat-worker.js';

  let store = null;
  let needleWorker = null;
  let llmWorker = null;
  // A crash or load failure ends the chat model for the session: enabling it
  // again would re-download 272-363MB in a loop, so the page stays on its
  // FAQ and canned answers instead.
  let llmFailedThisSession = false;
  // id -> {resolve, signal, onAbort, onToken?, error?} for each request a
  // reply may still settle.
  const pending = new Map();
  const seamCounters = { cls: 0, eval: 0, align: 0 };

  function modelStatus(model, status, detail) {
    store.dispatch({ type: 'MODEL_STATUS', model, status, ...detail });
  }

  // ─── Needle: intent classification ─────────────────────────────────────
  const NEEDLE_LIFECYCLE = {
    ready: () => modelStatus('needle', 'ready'),
    decoderReady: () => modelStatus('needleFc', 'ready'),
    status: (msg) => store.dispatch({ type: 'MODEL_PROGRESS', model: 'needle', text: msg.data }),
    error: (msg) => needleFailed(msg.data),
  };

  function initNeedle() {
    modelStatus('needle', 'loading');
    try {
      needleWorker = new Worker(NEEDLE_URL, { type: 'module' });
      needleWorker.onmessage = (event) => NEEDLE_LIFECYCLE[event.data.type]?.(event.data);
      needleWorker.onerror = (event) => needleFailed(`Worker load failed: ${event.message}`);
      needleWorker.postMessage({ type: 'init' });
    } catch (err) {
      needleFailed(err.message);
    }
  }

  function needleFailed(error) {
    console.warn('[needle]', error);
    modelStatus('needle', 'error', { error });
  }

  // Resolves Needle's {type, label, score, a?}, or null when Needle is not
  // ready or does not answer in time. Only the reply echoing this call's id
  // settles it: after Stop and a fresh question inside the timeout, a late
  // reply for the old question must not route the new one.
  function classify(text) {
    if (!store.getState().models.needleReady || !needleWorker) return Promise.resolve(null);
    const worker = needleWorker;
    const id = seamId('cls');
    return new Promise((resolve) => {
      const timer = setTimeout(() => settle(null), CLASSIFY_TIMEOUT_MS);
      const onReply = (event) => {
        if (event.data.type === 'intent' && event.data.id === id) settle(event.data.data);
      };
      function settle(intent) {
        clearTimeout(timer);
        worker.removeEventListener('message', onReply);
        resolve(intent);
      }
      worker.addEventListener('message', onReply);
      worker.postMessage({ type: 'classify', id, data: { text } });
    });
  }

  // ─── SmolLM2: the chat worker's lifecycle ──────────────────────────────
  // chat-worker.js says 'ready' once the model can answer; any other status,
  // 'ready (webgpu)' included, names a loading step. A per-request error
  // carries its request's id and fails only that request, so the model stays
  // loaded for the next one; a crash or load failure is marked fatal:true
  // and drops it.
  const CHAT_LIFECYCLE = {
    status: (msg) => (msg.data === 'ready' ? modelStatus('llm', 'ready') : modelStatus('llm', 'loading', { statusText: msg.data })),
    progress: (msg) => modelStatus('llm', 'loading', { progress: msg.pct }),
    error: (msg) => (msg.fatal ? dropLLMWorker(msg.data) : console.warn('[chat-worker]', msg.data)),
  };

  function initDecoder() {
    if (llmWorker) return; // already loading or loaded
    modelStatus('llm', 'loading');
    try {
      llmWorker = new Worker(CHAT_URL, { type: 'module' });
      llmWorker.onmessage = (event) => onChatReply(event.data);
      // A worker-level failure (a script error, say) is as fatal as a crash
      // reported from inside the worker.
      llmWorker.onerror = (event) => dropLLMWorker(`Worker failed: ${event.message}`);
      llmWorker.postMessage({ type: 'load' });
    } catch (err) {
      dropLLMWorker(err.message);
    }
  }

  // A reply for a request still waiting settles it; otherwise only the
  // worker's lifecycle messages mean anything. A token, done or verdict for
  // a request already settled or dropped falls through both and is ignored.
  function onChatReply(msg) {
    if (routeReply(msg)) return;
    CHAT_LIFECYCLE[msg.type]?.(msg);
  }

  // Drops the resident worker rather than leave one no future turn can
  // reach; its pending requests end on their callers' own timeouts.
  function dropLLMWorker(reason) {
    console.warn('[chat-worker]', reason);
    modelStatus('llm', 'error', { error: reason });
    if (llmWorker) llmWorker.terminate();
    llmWorker = null;
    llmFailedThisSession = true;
  }

  // ─── The model-request seam ────────────────────────────────────────────
  // A generation keeps its caller's id, which is already the id of the
  // message it streams into; classify, evaluate and align number their own.
  function seamId(prefix) {
    seamCounters[prefix] += 1;
    return `${prefix}_${seamCounters[prefix]}`;
  }

  // Tracks a request until a reply or the caller's abort settles it,
  // whichever comes first; the other then finds nothing left to settle.
  // False means the signal had already fired, so the caller must not post.
  function trackRequest(id, signal, entry) {
    if (signal.aborted) {
      entry.resolve(null);
      return false;
    }
    const onAbort = () => settleRequest(id, null);
    pending.set(id, { ...entry, signal, onAbort });
    signal.addEventListener('abort', onAbort);
    return true;
  }

  function settleRequest(id, value) {
    const entry = pending.get(id);
    if (!entry) return;
    pending.delete(id);
    entry.signal.removeEventListener('abort', entry.onAbort);
    entry.resolve(value);
  }

  // evalResult and alignResult carry their own id; a generation's token,
  // error and done all carry the requestId its caller chose.
  function replyIdFor(msg) {
    if (msg.type === 'evalResult') return msg.evalId;
    if (msg.type === 'alignResult') return msg.alignId;
    return msg.requestId;
  }

  function routeReply(msg) {
    const id = replyIdFor(msg);
    const entry = pending.get(id);
    if (!entry) return false;
    deliver(id, entry, msg);
    return true;
  }

  // A generation's error is held for its done, which always follows it;
  // evalResult and alignResult settle with their data.
  function deliver(id, entry, msg) {
    if (msg.type === 'token') entry.onToken(msg.token);
    else if (msg.type === 'error') entry.error = msg.data;
    else if (msg.type === 'done') settleRequest(id, entry.error ? { error: entry.error } : {});
    else settleRequest(id, msg.data);
  }

  // generate, evaluate and align return null outright with no worker to
  // ask, and resolve null the moment their signal fires, or at once if it
  // already has.
  function generate(text, context, { id, signal, onToken }) {
    if (!llmWorker) return null;
    return new Promise((resolve) => {
      if (trackRequest(id, signal, { resolve, onToken })) llmWorker.postMessage({ type: 'generate', text, context, requestId: id });
    });
  }

  function evaluate(request, { signal }) {
    return requestVerdict('eval', signal, (evalId) => ({
      type: 'evaluate',
      question: request.question,
      results: (request.results || []).map(toEvaluatedResult),
      evalId,
      context: request.context,
      compactErrors: request.compactErrors,
    }));
  }

  function toEvaluatedResult(result) {
    return { toolName: result.toolName || 'tool', content: result.content || '' };
  }

  function align(request, { signal }) {
    return requestVerdict('align', signal, (alignId) => ({
      type: 'align',
      alignId,
      text: request.text,
      intent: { label: request.intent?.label || 'faq' },
      toolScopes: request.toolScopes,
    }));
  }

  function requestVerdict(prefix, signal, messageFor) {
    if (!llmWorker) return null;
    const id = seamId(prefix);
    return new Promise((resolve) => {
      if (trackRequest(id, signal, { resolve })) llmWorker.postMessage(messageFor(id));
    });
  }

  // ─── Consent and readiness ─────────────────────────────────────────────
  function isLLMReady() { return store.getState().models.llmReady; }
  function hasLLMConsent() { return store.getState().models.llmConsent === true; }
  function isLLMConsentPending() { return store.getState().models.llmConsent === null; }

  // Loads the chat model on the visitor's opt-in, or when a reply finds it
  // neither ready nor loading; after a crash the page stays on its FAQ and
  // canned answers rather than download it again. Needle's function-calling
  // decoder loads alongside it.
  function enableLLM() {
    if (llmFailedThisSession) return;
    store.dispatch({ type: 'LLM_CONSENT', value: true });
    initDecoder();
    if (needleWorker && store.getState().models.needleReady) needleWorker.postMessage({ type: 'initDecoder' });
  }

  // On-device AI is on by default. init never reads a stored consent: store.js
  // still writes the 'llm-consent' key, but nothing reads it back.
  function init(nextStore) {
    store = nextStore;
    initNeedle();
    store.dispatch({ type: 'LLM_CONSENT', value: true });
    initDecoder();
  }

  Classifier = { init, classify, generate, evaluate, align, enableLLM, isLLMReady, hasLLMConsent, isLLMConsentPending };
}

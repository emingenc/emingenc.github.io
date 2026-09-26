// evaluator.js — checks whether a turn's result actually answers the
// visitor's question: the chat model's semantic read when it is ready, a
// keyword rule when it is not or has no worker to ask. The model's read
// races a 12s budget, so a slow model still leaves the turn with a verdict
// instead of a wait with no end.
'use strict';
var Evaluator;
{
  const EVAL_TIMEOUT_MS = 12000;
  const EVAL_TIMEOUT_RESULT = Object.freeze({ stop: false, summary: null, confidence: 50, nextTool: '', next: '' });
  const FALLBACK_SUMMARY_CHARS = 300;
  const RELEVANCE_ACCEPT = 0.3;
  const RELEVANCE_WORD_CHARS = 3;
  const CONFIDENCE_PERCENT = 100;
  const IDENTITY_QUESTION = /who|about|emin|gench|bio|background|career/i;
  const IDENTITY_ANSWER = /emin|engineer|cresta|developer/i;

  let store = null;

  // ─── Reads the loop and the registry both share ─────────────────────────
  function isSelfContained(toolName) {
    return (Tools.getTool(toolName) || {}).selfContained || false;
  }

  // Deterministic guard for a high-risk personal fact: the trusted profile
  // says Vancouver, so a generated answer that places Emin somewhere else is
  // rejected outright, whatever confidence the model gave it.
  function groundedAgainstProfile(text) {
    const claim = /\b(?:lives?|resides?|located|based|from|currently\s+(?:in|lives?\s+in))\b[^.\n]{0,80}\b(new york|nyc|los angeles|san francisco|toronto|london|istanbul)\b/i;
    const lower = (text || '').toLowerCase();
    return !(claim.test(lower) && !lower.includes('vancouver'));
  }

  // ─── Keyword fallback: no model ready, or no worker to ask ─────────────
  function keywordVerdict(toolName, result, question) {
    if (!result) return { satisfied: false, confidence: 0, reason: 'no result' };
    if (result.toolError) return { satisfied: false, confidence: 0, reason: 'tool error' };
    if (result.redirect) return { satisfied: true, confidence: 1, reason: 'redirect' };
    if (isSelfContained(toolName)) return { satisfied: true, confidence: 1, reason: 'self-contained' };
    return relevanceVerdict(result.content, question);
  }

  function relevanceVerdict(content, question) {
    const lowerContent = (content || '').toLowerCase();
    const lowerQuestion = (question || '').toLowerCase();
    if (IDENTITY_QUESTION.test(lowerQuestion) && IDENTITY_ANSWER.test(lowerContent)) return { satisfied: true, confidence: 0.9, reason: 'identity match' };
    const relevance = wordOverlap(lowerQuestion, lowerContent);
    if (relevance >= RELEVANCE_ACCEPT) return { satisfied: true, confidence: relevance, reason: 'keyword overlap' };
    if (relevance > 0) return { satisfied: true, confidence: 0.5, reason: 'partial match' };
    return { satisfied: false, confidence: 0, reason: 'low relevance' };
  }

  // The share of the question's words (more than three letters) the content
  // also contains.
  function wordOverlap(question, content) {
    const words = question.split(/\s+/).filter((word) => word.length > RELEVANCE_WORD_CHARS);
    return words.length ? words.filter((word) => content.includes(word)).length / words.length : 0;
  }

  function fallbackSummary(result) {
    return result?.content ? result.content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, FALLBACK_SUMMARY_CHARS) : null;
  }

  function fallbackResult(question, results) {
    const last = results.length ? results[results.length - 1] : null;
    const verdict = keywordVerdict(last ? last.toolName || 'faq' : 'faq', last, question);
    return { stop: verdict.satisfied, summary: fallbackSummary(last), confidence: Math.round(verdict.confidence * CONFIDENCE_PERCENT), nextTool: '', next: '' };
  }

  // ─── The model seam ───────────────────────────────────────────────────
  function compactToolErrors(observations) {
    return observations.filter((observation) => observation.error).map((observation) => {
      const hint = observation.hint ? ` — ${observation.hint}` : '';
      return `${observation.tool}: ${observation.error}${hint}`.slice(0, Context.LIMITS.compactErrorChars);
    });
  }

  function evaluationRequest(question, results) {
    const state = store.getState();
    const evaluation = Context.forEvaluation(state);
    return { question, results, context: evaluation.context, compactErrors: compactToolErrors(state.workingMemory?.observations || []) };
  }

  // Races the worker against evaluator's own budget; Promise.race takes
  // whichever settles first, and the timer that didn't win is cleared so it
  // never fires again after the turn has moved on.
  function settle(pending) {
    let timer;
    const timeout = new Promise((resolve) => {
      timer = setTimeout(() => resolve(EVAL_TIMEOUT_RESULT), EVAL_TIMEOUT_MS);
    });
    return Promise.race([pending, timeout]).finally(() => clearTimeout(timer));
  }

  function evaluate(question, results, { signal }) {
    if (!Classifier.isLLMReady()) return Promise.resolve(fallbackResult(question, results));
    const pending = Classifier.evaluate(evaluationRequest(question, results), { signal });
    return pending ? settle(pending) : Promise.resolve(fallbackResult(question, results));
  }

  function init(nextStore) { store = nextStore; }

  Evaluator = { init, evaluate, isSelfContained, groundedAgainstProfile };
}

// align-gate.js — turns Needle's proposed intent into a tool decision: a
// deterministic rule first, the chat model when the rules don't cover it,
// and a fuzzy-match fallback when there is no model to ask or it answers
// too slowly. Every path resolves the same {action, tool, sink, reason,
// confidence, source} shape, so the router never needs to know which one
// decided.
'use strict';
var AlignmentGate;
{
  // Bounds a ready but slow worker: past it, the keyword redirect decides,
  // so a question no rule settles never stalls its turn. With no model
  // ready, the redirect decides at once.
  const ALIGN_TIMEOUT_MS = 1200;
  const SHORT_KEYWORD_CHARS = 3;
  const CASUAL_MAX_WORDS = 3;
  const FAQ_CASUAL_MAX_WORDS = 4;
  const FAQ_EXTENDED_MAX_WORDS = 6;
  const AMBIGUOUS_MAX_WORDS = 2;
  const SCOPE_BASE_CONFIDENCE = 55;
  const SCOPE_PER_MATCH_CONFIDENCE = 10;
  const SCOPE_MAX_CONFIDENCE = 95;
  const CASUAL_ONLY = /^\s*(hi|hello|hey|thanks|thank|bye|ok|okay|nice|great|good\s+(morning|afternoon|evening))[\s!.?,]*$/i;
  const CASUAL_WORD = /\b(hi|hello|hey|thanks|thank|bye|ok|okay|nice|great|cool|awesome|sweet|perfect|got it|alright|goodbye|see you|catch you|later|what's up|sup|howdy|yo)\b/i;

  function decision({ action, tool, reason, confidence = 0, source = 'fallback' }) {
    return { action, tool, sink: action === 'sink' ? 'out_of_scope' : null, reason, confidence, source };
  }

  function words(text) {
    return (text || '').toLowerCase().match(/[a-z][a-z0-9_-]*/g) || [];
  }

  // A short keyword must match a standalone word ("he" must not match inside
  // "where"); a longer one is fine as a substring.
  function kwMatch(keyword, joined, ws) {
    const kw = String(keyword).toLowerCase();
    return kw.length <= SHORT_KEYWORD_CHARS ? ws.includes(kw) : joined.includes(kw);
  }

  // ─── Deterministic rules: no model needed for the common cases ─────────
  function deterministic(text, intent) {
    const label = (intent && intent.label) || 'faq';
    const ws = words(text);
    if (label === 'chat' || label === 'stop') return chatProposal(text, ws);
    if (label === 'faq') return faqProposal(text, ws);
    return toolProposal(label, ws);
  }

  // A pure greeting fast-paths to chat; anything else tries a fuzzy tool
  // match first, so "hi, can you show me your repos" still reaches /repos.
  function chatProposal(text, ws) {
    if (CASUAL_ONLY.test(text) && ws.length <= CASUAL_MAX_WORDS) return decision({ action: 'execute', tool: 'chat', reason: 'conversational proposal', confidence: 80, source: 'deterministic' });
    return fuzzyRedirect(text, 'chat proposal redirected via fuzzy match');
  }

  // A short greeting stays casual; a longer one tries FAQ before chat; real
  // content past a greeting prefix falls through to LLM alignment.
  function faqProposal(text, ws) {
    if (!CASUAL_WORD.test(text)) return faqOrFuzzy(text);
    if (ws.length <= FAQ_CASUAL_MAX_WORDS) return decision({ action: 'execute', tool: 'chat', reason: 'casual conversation', confidence: 90, source: 'deterministic' });
    if (ws.length <= FAQ_EXTENDED_MAX_WORDS) return casualFaqOrChat(text);
    return null;
  }

  function casualFaqOrChat(text) {
    if (Tools.faqMatch(text)) return decision({ action: 'execute', tool: 'faq', reason: 'FAQ match for casual query', confidence: 90, source: 'deterministic' });
    return decision({ action: 'execute', tool: 'chat', reason: 'extended casual conversation', confidence: 80, source: 'deterministic' });
  }

  // Tools take priority over the FAQ; only once neither matches does
  // alignment fall through to the LLM.
  function faqOrFuzzy(text) {
    const redirect = fuzzyRedirect(text, 'faq proposal redirected via fuzzy match');
    if (redirect) return redirect;
    if (Tools.faqMatch(text)) return decision({ action: 'execute', tool: 'faq', reason: 'FAQ match', confidence: 100, source: 'deterministic' });
    return null;
  }

  function fuzzyRedirect(text, reasonPrefix) {
    const fuzzy = Tools.fuzzyMatch(text);
    if (!fuzzy || !fuzzy.tool) return null;
    return decision({ action: 'redirect', tool: fuzzy.tool, reason: `${reasonPrefix} (${fuzzy.score})`, confidence: fuzzy.score, source: 'deterministic' });
  }

  // A registry tool Needle already named: a scope-word match confirms it
  // outright, unless the query is so short (e.g. "blog?") that the LLM
  // should still confirm it.
  function toolProposal(label, ws) {
    const meta = Tools.getTool(label);
    if (!meta) return decision({ action: 'sink', tool: 'out_of_scope', reason: 'unknown proposed tool', confidence: 100, source: 'deterministic' });
    const matches = scopeMatches(meta, ws);
    if (matches === 0 || ws.length <= AMBIGUOUS_MAX_WORDS) return null;
    const confidence = Math.min(SCOPE_MAX_CONFIDENCE, SCOPE_BASE_CONFIDENCE + matches * SCOPE_PER_MATCH_CONFIDENCE);
    return decision({ action: 'execute', tool: label, reason: 'registry scope match', confidence, source: 'deterministic' });
  }

  function scopeMatches(meta, ws) {
    const joined = ws.join(' ');
    const domainWords = (meta.scopeWords || meta.keywords || []).map((word) => String(word).toLowerCase());
    return domainWords.filter((word) => kwMatch(word, joined, ws)).length;
  }

  // ─── Fallback: no model to ask, or it never answers in time ────────────
  function defaultToolFor(intent) {
    return intent && intent.label === 'chat' ? 'chat' : 'out_of_scope';
  }

  function keywordRedirect(text, defaultTool) {
    const fuzzy = Tools.fuzzyMatch(text);
    if (fuzzy && fuzzy.tool) return decision({ action: 'redirect', tool: fuzzy.tool, reason: `fuzzy match: ${fuzzy.tool} (score ${fuzzy.score})`, confidence: fuzzy.score, source: 'fallback' });
    const fallbackAction = defaultTool === 'chat' ? 'execute' : 'sink';
    return decision({ action: fallbackAction, tool: defaultTool || 'out_of_scope', reason: 'no fuzzy match — sinking', confidence: 40, source: 'fallback' });
  }

  // ─── The model seam ───────────────────────────────────────────────────
  function alignRequest(text, intent) {
    const toolScopes = (Tools.TOOL_REGISTRY || []).map((tool) => ({ name: tool.name, description: tool.description, scope: tool.scopeWords || tool.keywords || [] }));
    return { text, intent: { label: (intent && intent.label) || 'faq' }, toolScopes };
  }

  // The model's own verdict: out of scope sinks, a registry tool redirects
  // to it, and anything else executes the intent Needle already proposed.
  function fromWorkerResult(data, intent) {
    const verdict = data || {};
    if (verdict.inScope === false) return sinkResult(verdict);
    if (isKnownTool(verdict.suggestedTool)) return redirectResult(verdict);
    if (verdict.suggestedTool === 'out_of_scope') return sinkResult(verdict);
    return executeResult(verdict, intent);
  }

  function isKnownTool(suggested) {
    return Boolean(suggested && suggested !== 'out_of_scope' && Tools.getTool(suggested));
  }

  function sinkResult(verdict) {
    return decision({ action: 'sink', tool: 'out_of_scope', reason: verdict.reason || 'out of scope', confidence: verdict.confidence, source: 'llm' });
  }

  function redirectResult(verdict) {
    return decision({ action: 'redirect', tool: verdict.suggestedTool, reason: verdict.reason || 'model-selected tool', confidence: verdict.confidence, source: 'llm' });
  }

  function executeResult(verdict, intent) {
    return decision({ action: 'execute', tool: (intent && intent.label) || 'chat', reason: verdict.reason || 'aligned proposal', confidence: verdict.confidence, source: 'llm' });
  }

  // Races the worker against the timeout above; Promise.race takes whichever
  // settles first. A stopped turn's request resolves null, which maps to the
  // 'alignment cancelled' sink, so its alignment never outlives the turn.
  function settle(pending, text, intent) {
    const mapped = pending.then((data) => (data === null ? decision({ action: 'sink', tool: 'out_of_scope', reason: 'alignment cancelled' }) : fromWorkerResult(data, intent)));
    let timer;
    const timeout = new Promise((resolve) => {
      timer = setTimeout(() => resolve(keywordRedirect(text, defaultToolFor(intent))), ALIGN_TIMEOUT_MS);
    });
    return Promise.race([mapped, timeout]).finally(() => clearTimeout(timer));
  }

  // Only a model request can outlive its turn, so only it takes the turn's
  // signal: the rules and the keyword redirect decide without waiting.
  function check(text, intent, { signal }) {
    const proposed = deterministic(text, intent || {});
    if (proposed) return Promise.resolve(proposed);
    if (!Classifier.isLLMReady()) return Promise.resolve(keywordRedirect(text, defaultToolFor(intent)));
    const pending = Classifier.align(alignRequest(text, intent), { signal });
    return pending ? settle(pending, text, intent) : Promise.resolve(keywordRedirect(text, defaultToolFor(intent)));
  }

  AlignmentGate = { check };
}

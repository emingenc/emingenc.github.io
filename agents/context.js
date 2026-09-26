// context.js — the agent's one bounded context window. Generation,
// evaluation and the context meter all read these budgets from here, never
// a private copy of their own. Pure and store-free: every export takes the
// state (or plain data) it needs to read. Tools is the one outside call,
// made lazily at read time, never at load time — context.js loads before
// tools.js in index.astro's script order.
'use strict';
var Context;
{
  const LIMITS = {
    historyMessages: 24,      // conversation() message window
    messageChars: 200,        // per-message cap inside that window
    charsPerToken: 4,         // rough token estimate shared by every budget below
    generationTokens: 900,    // forGeneration's conversation budget
    evaluationTokens: 800,    // forEvaluation's conversation budget
    toolResultChars: 500,     // this turn's tool chars, capped per result
    promptClampChars: 7500,   // forGeneration's final clamp (SmolLM2's real window)
    meterTokens: 1600,        // SmolLM2-360M's real window the meter reads against
    compactErrorChars: 150,   // evaluator's compact tool-error strings are cut to this
    summaryEveryUserTurns: 4, // rolling-summary cadence
    summaryQuestionChars: 80,
    summaryAnswerChars: 120,
    summaryPairs: 4,          // pairs kept in the rolling summary
    summaryChars: 600         // final clamp on the joined summary
  };
  const METER_MAX_PCT = 100;

  // The one cleaner every card and message goes through before it can ride
  // in a trace line or the conversation buffer: strip markup, blank
  // anything that is not a word, space or ordinary sentence punctuation
  // (so box-drawing art collapses to nothing rather than leaking into a
  // trace), collapse whitespace, cut to length.
  function plainText(text, max) {
    return (text || '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/[^\w\s.,;:!?@#&()\[\]{}\/"'-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, max);
  }

  // The conversation buffer's own cap on plainText's cleaner.
  function conversationText(text) {
    return plainText(text, LIMITS.messageChars);
  }

  // A gentler cleaner for text that is already prose, not a rendered card:
  // strips markup and collapses whitespace, but keeps punctuation like
  // '→' or '—' that plainText's stricter whitelist would blank. The
  // rolling summary's Q and A use this.
  function simpleText(text, max) {
    return (text || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
  }

  function estimateTokens(text) {
    return Math.ceil(text.length / LIMITS.charsPerToken);
  }

  // Oldest turns drop first once the buffer is over budget, so a long
  // session still reads as a recent, coherent exchange rather than an
  // arbitrary truncation.
  function withinTokenBudget(buf, maxTokens) {
    const rest = buf.slice();
    let totalTokens = rest.reduce((sum, entry) => sum + estimateTokens(entry.content), 0);
    while (totalTokens > maxTokens && rest.length > 0) {
      const removed = rest.shift();
      totalTokens -= estimateTokens(removed.content);
    }
    return rest;
  }

  // Only the real user/agent exchange feeds a model — a turn also emits
  // react-step and tool-card messages, which are trace, not conversation.
  function conversation(messages, maxTokens) {
    const start = Math.max(0, messages.length - LIMITS.historyMessages);
    const buf = [];
    for (let i = start; i < messages.length; i++) {
      const msg = messages[i];
      if (msg.role !== 'user' && msg.role !== 'agent') continue;
      const content = conversationText(msg.content);
      if (content) buf.push({ role: msg.role, content: content });
    }
    return withinTokenBudget(buf, maxTokens);
  }

  function conversationLine(state) {
    const buf = conversation(state.messages, LIMITS.generationTokens);
    if (!buf.length) return '';
    const joined = buf.map((entry) => entry.role + ': ' + entry.content).join(' | ');
    return 'RECENT CONVERSATION: ' + joined;
  }

  function truncate(text, max) {
    return text.length > max ? text.slice(0, max) : text;
  }

  // SmolLM2's real window is 2048 tokens; an overshoot makes ONNX throw
  // ("Generation failed" → worker death). The assembled prompt is clamped
  // hard after assembly — each part is already cleaned on its own, and
  // re-cleaning here would flatten the '\n' part separators.
  function forGeneration(state) {
    const parts = [Tools.profileFacts()];
    if (state.summary) parts.push('SESSION SUMMARY: ' + state.summary);
    const line = conversationLine(state);
    if (line) parts.push(line);
    return truncate(parts.join('\n'), LIMITS.promptClampChars);
  }

  // The evaluator's trusted-context row rides first, ahead of the same
  // bounded history generation sees, just to a tighter budget.
  function forEvaluation(state) {
    const buf = conversation(state.messages, LIMITS.evaluationTokens);
    return { context: [{ role: 'trusted-context', content: Tools.profileFacts() }].concat(buf) };
  }

  function conversationChars(state) {
    const buf = conversation(state.messages, LIMITS.generationTokens);
    return buf.reduce((sum, entry) => sum + entry.content.length, 0);
  }

  // Walks back only to the user message that opened this turn, so a
  // running turn's own tool card counts before its reply lands.
  function currentTurnToolChars(messages) {
    let chars = 0;
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      if (msg.role === 'user') break;
      if (msg.role !== 'tool') continue;
      const stripped = (msg.content || '').replace(/<[^>]*>/g, ' ');
      chars += Math.min(stripped.length, LIMITS.toolResultChars);
    }
    return chars;
  }

  // An estimate of context-window usage, built from the conversation
  // buffer, the rolling summary and this turn's tool cards — not profile
  // facts, and never the whole session's raw history — clamped to the
  // prompt limit.
  function meterPct(state) {
    const rawChars = conversationChars(state) + (state.summary || '').length + currentTurnToolChars(state.messages);
    const totalChars = Math.min(rawChars, LIMITS.promptClampChars);
    const pct = Math.round(totalChars / LIMITS.charsPerToken / LIMITS.meterTokens * METER_MAX_PCT);
    return Math.max(0, Math.min(METER_MAX_PCT, pct));
  }

  function qaPairs(messages) {
    const pairs = [];
    let current = null;
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      if (msg.role === 'user') {
        current = { q: simpleText(msg.content, LIMITS.summaryQuestionChars) };
      } else if (msg.role === 'agent' && current) {
        current.a = simpleText(msg.content, LIMITS.summaryAnswerChars);
        pairs.push('Q: ' + current.q + ' → A: ' + current.a);
        current = null;
      }
    }
    return pairs;
  }

  // Every 4 user turns folds the exchange into a deterministic slot — no
  // LLM here: the 360M model must not write its own memory.
  function rollingSummary(state) {
    const count = state.session.messageCount;
    if (!count || count % LIMITS.summaryEveryUserTurns !== 0) return null;
    const pairs = qaPairs(state.messages);
    if (!pairs.length) return null;
    return pairs.slice(-LIMITS.summaryPairs).join(' | ').slice(0, LIMITS.summaryChars);
  }

  Context = { LIMITS, plainText, forGeneration, forEvaluation, meterPct, rollingSummary };
}

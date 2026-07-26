// evaluator.js — result evaluation (LLM semantic check, fallback keyword, entity preservation)
var Evaluator = (function() {
  "use strict";
  var store = null;
  var evalResolvers = {}; // {evalId: resolve} for LLM evaluator correlation

  // Check that key entities (numbers, proper nouns) from original survive LLM polish
  function entityPreserved(original, summary) {
    if (!original || !summary) return true; // nothing to check
    var strip = function(s) { return s.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(); };
    var orig = strip(original).toLowerCase();
    var summ = summary.toLowerCase();
    // Extract numbers (years, star counts, etc.)
    var nums = orig.match(/\b\d+\b/g) || [];
    for (var n = 0; n < nums.length; n++) {
      if (summ.indexOf(nums[n]) === -1) return false;
    }
    // Extract capitalized proper nouns (names, products)
    var propers = strip(original).match(/\b[A-Z][a-z]{2,}\b/g) || [];
    var missing = 0;
    for (var p = 0; p < propers.length; p++) {
      if (summ.indexOf(propers[p].toLowerCase()) === -1) missing++;
    }
    // Allow at most 1 proper noun missing
    if (missing > 1) return false;
    return true;
  }

  // Fast path: tools that always satisfy without LLM evaluation
  // Uses TOOL_REGISTRY metadata; falls back to hardcoded list for backward compat
  function isSelfContained(toolName) {
    return (Tools.getTool(toolName) || {}).selfContained || false;
    // PREVIOUS HARDCODED LIST (kept for reference):
    // return toolName === 'help' || toolName === 'status' || toolName === 'lucky' ||
    //        toolName === 'about' || toolName === 'repos' || toolName === 'contact' ||
    //        toolName === 'skills' || toolName === 'blog' ||
    //        toolName === 'time' || toolName === 'device' || toolName === 'screen' ||
    //        toolName === 'network' || toolName === 'session' || toolName === 'g1' ||
    //        toolName === 'faq' || toolName === 'chat' || toolName === 'stop';
  }

  // Fallback keyword evaluator (used when LLM not loaded)
  function evaluateResultFallback(toolName, result, userText) {
    if (!result) return { satisfied: false, confidence: 0, reason: 'no result' };
    if (result.toolError) return { satisfied: false, confidence: 0, reason: 'tool error' };
    if (result.redirect) return { satisfied: true, confidence: 1, reason: 'redirect' };
    if (isSelfContained(toolName)) return { satisfied: true, confidence: 1, reason: 'self-contained' };

    var content = (result.content || '').toLowerCase();
    var question = (userText || '').toLowerCase();
    var qWords = question.split(/\s+/).filter(function(w) { return w.length > 3; });
    var matches = 0;
    for (var i = 0; i < qWords.length; i++) {
      if (content.indexOf(qWords[i]) !== -1) matches++;
    }
    var relevance = qWords.length > 0 ? matches / qWords.length : 0;
    if (/who|about|emin|gench|bio|background|career/i.test(question) && /emin|engineer|cresta|developer/i.test(content)) {
      return { satisfied: true, confidence: 0.9, reason: 'identity match' };
    }
    if (relevance >= 0.3) return { satisfied: true, confidence: relevance, reason: 'keyword overlap' };
    if (matches > 0) return { satisfied: true, confidence: 0.5, reason: 'partial match' };
    return { satisfied: false, confidence: 0, reason: 'low relevance' };
  }

  function groundedAgainstProfile(text) {
    var s = (text || '').toLowerCase();
    // Deterministic contradiction guard for high-risk personal facts.
    // The trusted profile says Vancouver; reject an answer that asserts a
    // different city/country as Emin's residence or current location.
    var locationClaim = /\b(?:lives?|resides?|located|based|from|currently\s+(?:in|lives?\s+in))\b[^.\n]{0,80}\b(new york|nyc|los angeles|san francisco|toronto|london|istanbul)\b/i;
    if (locationClaim.test(s) && s.indexOf('vancouver') === -1) return false;
    return true;
  }

  // ─── LLM Evaluator: semantic check + summary generation ─────
  function evaluateWithLLM(question, results, turnId) {
    var llmWorker = Classifier._getLLMWorker ? Classifier._getLLMWorker() : null;
    var evalPrompt = (Classifier.isLLMReady() && llmWorker) ? Classifier.loadPrompt('evaluate') : null;
    return new Promise(function(resolve) {
      // If LLM not loaded, fall back to keyword evaluation
      if (!Classifier.isLLMReady() || !llmWorker) {
        var lastResult = results.length > 0 ? results[results.length - 1] : null;
        var toolName = lastResult ? (lastResult.toolName || 'faq') : 'faq';
        var fb = evaluateResultFallback(toolName, lastResult, question);
        var fallbackSummary = lastResult && lastResult.content
          ? lastResult.content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 300)
          : null;
        resolve({ stop: fb.satisfied, summary: fallbackSummary, confidence: Math.round(fb.confidence * 100), nextTool: '', next: '' });
        return;
      }

      var evalId = 'eval_' + turnId + '_' + Date.now();
      evalResolvers[evalId] = resolve;

      // Timeout safety: 12s
      setTimeout(function() {
        if (evalResolvers[evalId]) {
          delete evalResolvers[evalId];
          resolve({ stop: false, summary: null, confidence: 50, nextTool: '', next: '' });
        }
      }, 12000);

      var convBuf = (typeof Orchestrator !== 'undefined' && Orchestrator._getConversationBuffer)
        ? Orchestrator._getConversationBuffer()
        : [];
      if (typeof Tools !== 'undefined' && Tools.profileFacts) {
        convBuf.unshift({ role: 'trusted-context', content: Tools.profileFacts() });
      }

      var compactErrors = (typeof Orchestrator !== 'undefined' && Orchestrator.getCompactErrors)
        ? Orchestrator.getCompactErrors()
        : [];

      llmWorker.postMessage({
        type: 'evaluate',
        question: question,
        results: results.map(function(r) {
          return { toolName: r.toolName || 'tool', content: r.content || '' };
        }),
        evalId: evalId,
        context: convBuf, // Last 3 exchanges for context
        compactErrors: compactErrors // Error strings from failed tool calls
      });
    });
  }

  function _cancelAllEvals() {
    for (var eid in evalResolvers) { evalResolvers[eid]({ stop: false, summary: null, confidence: 0, nextTool: '', next: '' }); delete evalResolvers[eid]; }
  }

  // Called by classifier.js when chat-worker returns evalResult
  function _handleEvalResult(evalId, data) {
    if (evalResolvers[evalId]) {
      evalResolvers[evalId](data);
      delete evalResolvers[evalId];
    }
  }

  function init(_store) { store = _store; }

  return {
    init: init,
    evaluate: evaluateWithLLM,
    evaluateFallback: evaluateResultFallback,
    entityPreserved: entityPreserved,
    groundedAgainstProfile: groundedAgainstProfile,
    isSelfContained: isSelfContained,
    _cancelAllEvals: _cancelAllEvals,
    _handleEvalResult: _handleEvalResult
  };
})();

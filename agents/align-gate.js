// align-gate.js — validate Needle proposals before tool execution
var AlignmentGate = (function() {
  "use strict";
  var store = null;
  var resolvers = {};
  var nextId = 0;

  function decision(action, tool, reason, confidence, source) {
    return { action: action, tool: tool, sink: action === 'sink' ? 'out_of_scope' : null, reason: reason, confidence: confidence || 0, source: source || 'fallback' };
  }

  function words(text) {
    return (text || '').toLowerCase().match(/[a-z][a-z0-9_-]*/g) || [];
  }

  // Match a keyword against text — uses word-boundary for short keywords (≤3 chars)
  function kwMatch(keyword, joined, ws) {
    var kw = String(keyword).toLowerCase();
    if (kw.length <= 3) {
      // Short keywords: must match a standalone word (avoids "he" in "where")
      for (var wi = 0; wi < ws.length; wi++) {
        if (ws[wi] === kw) return true;
      }
      return false;
    }
    // Longer keywords: substring match is fine
    return joined.indexOf(kw) !== -1;
  }

  function deterministic(text, intent) {
    var label = intent && intent.label || 'faq';
    var meta = Tools.getTool(label);
    var ws = words(text);
    var joined = ws.join(' ');
    if (label === 'chat' || label === 'stop') {
      // Only fast-path pure greetings; otherwise check for better tool matches
      var casualOnly = text.match(/^\s*(hi|hello|hey|thanks|thank|bye|ok|okay|nice|great|good\s+(morning|afternoon|evening))[\s!.?,]*$/i);
      if (casualOnly && ws.length <= 3) return decision('execute', 'chat', 'conversational proposal', 80, 'deterministic');
      // Two-pass routing: check if substantive content matches a registered tool
      var toolNames = Object.keys(Tools.TOOL_REGISTRY ? Tools.getSelfContainedTools() : {});
      // Use keyword-based lookup to find a better tool match
      var bestTool = null, bestScore = 0;
      var registry = Tools.TOOL_REGISTRY || [];
      for (var ti = 0; ti < registry.length; ti++) {
        var rt = registry[ti];
        if (rt.name === 'chat' || rt.name === 'stop' || rt.name === 'faq' || rt.name === 'out_of_scope') continue;
        var kws = (rt.scopeWords && rt.scopeWords.length > 0) ? rt.scopeWords : (rt.keywords || []);
        var score = 0;
        for (var ki = 0; ki < kws.length; ki++) {
          if (kwMatch(kws[ki], joined, ws)) score++;
        }
        if (score > bestScore) { bestScore = score; bestTool = rt.name; }
      }
      if (bestTool && bestScore >= 1) {
        return decision('redirect', bestTool, 'chat proposal redirected via keyword match', 75, 'deterministic');
      }
      return null; // has substantive content — let LLM check against tool scopes
    }
    if (label === 'faq') {
      // Only treat as casual if the query is primarily a greeting (≤3 words or no tool keywords)
      var casualMatch = text.match(/\b(hi|hello|hey|thanks|thank|bye|ok|okay|nice|great)\b/i);
      if (casualMatch && ws.length <= 3) return decision('execute', 'chat', 'casual conversation', 90, 'deterministic');
      if (casualMatch) return null; // has greeting prefix but also substantive content — let LLM align
      // Two-pass routing: check tool keywords BEFORE FAQ — tools take priority
      var bestTool = null, bestScore = 0;
      var registry = Tools.TOOL_REGISTRY || [];
      for (var ti = 0; ti < registry.length; ti++) {
        var rt = registry[ti];
        if (rt.name === 'chat' || rt.name === 'stop' || rt.name === 'faq' || rt.name === 'out_of_scope') continue;
        var kws = (rt.scopeWords && rt.scopeWords.length > 0) ? rt.scopeWords : (rt.keywords || []);
        var kwScore = 0;
        for (var ki = 0; ki < kws.length; ki++) {
          if (joined.indexOf(String(kws[ki]).toLowerCase()) !== -1) kwScore++;
        }
        if (kwScore > bestScore) { bestScore = kwScore; bestTool = rt.name; }
      }
      if (bestTool && bestScore >= 1) {
        return decision('redirect', bestTool, 'faq proposal redirected via keyword match', 75, 'deterministic');
      }
      // No tool keyword match — try FAQ, then fall through to LLM
      if (Tools.faqMatch(text)) return decision('execute', 'faq', 'FAQ match', 100, 'deterministic');
      return null;
    }
    if (!meta) return decision('sink', 'out_of_scope', 'unknown proposed tool', 100, 'deterministic');
    var domainWords = (meta.scopeWords || meta.keywords || []).map(function(k) { return String(k).toLowerCase(); });
    var matches = 0;
    for (var i = 0; i < domainWords.length; i++) {
      if (kwMatch(domainWords[i], joined, ws)) matches++;
    }
    if (matches > 0) {
      // Ultra-short queries (e.g. "blog?") are ambiguous — let LLM alignment confirm
      if (ws.length <= 2) return null;
      return decision('execute', label, 'registry scope match', Math.min(95, 55 + matches * 10), 'deterministic');
    }
    return null;
  }

  // Broader keyword scan across all tools — used as fallback when LLM unavailable or times out
  function keywordRedirect(text, defaultTool) {
    var ws = words(text);
    var joined = ws.join(' ');
    var bestTool = null, bestScore = 0;
    var registry = Tools.TOOL_REGISTRY || [];
    for (var ti = 0; ti < registry.length; ti++) {
      var rt = registry[ti];
      if (rt.name === 'chat' || rt.name === 'stop' || rt.name === 'faq' || rt.name === 'out_of_scope') continue;
      // Prefer scopeWords (narrow) over keywords (broad) to avoid false matches
      var kws = (rt.scopeWords && rt.scopeWords.length > 0) ? rt.scopeWords : (rt.keywords || []);
      var score = 0;
      for (var ki = 0; ki < kws.length; ki++) {
        if (kwMatch(kws[ki], joined, ws)) score++;
      }
      if (score > bestScore) { bestScore = score; bestTool = rt.name; }
    }
    if (bestTool && bestScore >= 1) {
      return decision('redirect', bestTool, 'keyword fallback after alignment gap', 70, 'fallback');
    }
    var fallbackAction = defaultTool === 'chat' ? 'execute' : 'sink';
    return decision(fallbackAction, defaultTool || 'out_of_scope', 'proposal is ambiguous without alignment model', 40, 'fallback');
  }

  function check(text, intent, opts) {
    var d = deterministic(text, intent || {});
    if (d) return Promise.resolve(d);
    var worker = Classifier._getLLMWorker ? Classifier._getLLMWorker() : null;
    if (!Classifier.isLLMReady || !Classifier.isLLMReady() || !worker) {
      // No LLM — try keyword match before sinking
      var defaultTool = (intent && intent.label === 'chat') ? 'chat' : 'out_of_scope';
      return Promise.resolve(keywordRedirect(text, defaultTool));
    }
    var id = 'align_' + (++nextId);
    var turnId = opts && opts.turnId;
    return new Promise(function(resolve) {
      resolvers[id] = { resolve: resolve, intent: intent || {}, turnId: turnId };
      setTimeout(function() {
        if (!resolvers[id]) return;
        delete resolvers[id];
        // LLM timed out — try keyword match before sinking
        var defaultTool = (intent && intent.label === 'chat') ? 'chat' : 'out_of_scope';
        resolve(keywordRedirect(text, defaultTool));
      }, 6000);
      var scopes = (Tools.TOOL_REGISTRY || []).map(function(t) {
        return { name: t.name, description: t.description, scope: t.scopeWords || t.keywords || [] };
      });
      worker.postMessage({ type: 'align', alignId: id, text: text, intent: { label: intent && intent.label || 'faq' }, toolScopes: scopes });
    });
  }

  function handleResult(id, data) {
    var item = resolvers[id];
    if (!item) return;
    delete resolvers[id];
    var suggested = data && data.suggestedTool;
    var meta = suggested && Tools.getTool(suggested);
    if (data && data.inScope === false) return item.resolve(decision('sink', 'out_of_scope', data.reason || 'out of scope', data.confidence, 'llm'));
    if (meta && suggested !== 'out_of_scope') return item.resolve(decision('redirect', suggested, data.reason || 'model-selected tool', data.confidence, 'llm'));
    if (suggested === 'out_of_scope') return item.resolve(decision('sink', 'out_of_scope', data.reason || 'out of scope', data.confidence, 'llm'));
    item.resolve(decision('execute', item.intent.label || 'chat', data && data.reason || 'aligned proposal', data && data.confidence, 'llm'));
  }

  function cancelAll() {
    for (var id in resolvers) {
      resolvers[id].resolve(decision('sink', 'out_of_scope', 'alignment cancelled', 0, 'fallback'));
      delete resolvers[id];
    }
  }

  function init(s) { store = s; }
  return { init: init, check: check, _handleAlignResult: handleResult, _cancelAllAligns: cancelAll };
})();

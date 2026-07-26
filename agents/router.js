// router.js v2 — ReAct agent loop: main entry point (dispatches to Classifier, Evaluator, Orchestrator)
var Router = (function() {
  "use strict";

  var store = null;
  var humanCallback = null; // for ask_user resume

  // ─── v2: Main entry ──────────────────────────────────────
  function handleInput(text) {
    // An ask_user pause intentionally keeps the turn alive while accepting a choice.
    if (store.getState().ui.needsHumanInput) {
      if (humanCallback) {
        var answer = parseInt(text, 10);
        if (isNaN(answer)) answer = 0;
        store.dispatch({ type: 'MESSAGE_ADD', message: { role: 'user', type: 'text', content: text, ts: '' }});
        store.dispatch({ type: 'USER_RESPONSE', answer: answer });
        humanCallback(answer);
        humanCallback = null;
      }
      return;
    }
    if (store.getState().ui.isProcessing) return;
    Orchestrator.currentTurnId++; // invalidate any stale async callbacks
    var turnId = Orchestrator.currentTurnId;

    // Normal input follows the standard turn path.

    Orchestrator.processingTurnId = Orchestrator.currentTurnId; // lock ownership

    store.dispatch({ type: 'MESSAGE_ADD', message: { role: 'user', type: 'text', content: text, ts: '' }});

    // Stop welcome animation on first user input (delightful → focused)
    if (typeof Renderer !== 'undefined' && Renderer.stopAnimations) Renderer.stopAnimations();

    // Slash command
    if (Tools.isSlash(text)) {
      var cmd = Tools.parseSlash(text);
      if (cmd === 'clear') { store.dispatch({ type: 'CLEAR' }); Orchestrator.done(); return; }
      if (cmd === 'new') { store.dispatch({ type: 'NEW_SESSION' }); Renderer.showWelcome(); store.dispatch({ type: 'THINKING', state: 'hide' }); return; }
      if (cmd === 'blog') { Orchestrator.singleTool('blog', text, turnId); return; }
      if (cmd === 'ask') { Orchestrator.singleTool('ask_user', text, turnId); return; }

      // Session management
      if (cmd === 'sessions') {
        store.dispatch({ type: 'THINKING', state: 'executing', label: 'listing sessions' });
        setTimeout(function() {
          store.dispatch({ type: 'THINKING', state: 'hide' });
          var sessions = store.listSessions();
          var result = Tools.sessions(sessions, store.getSize());
          store.dispatch({ type: 'MESSAGE_ADD', message: { role: 'tool', type: 'tool-call', toolName: 'sessions', content: result.content, ts: '', noTs: false }});
          Orchestrator.done();
        }, 200);
        return;
      }
      if (cmd === 'resume' || cmd === 'r') {
        var sid = text.slice(cmd === 'resume' ? 8 : 3).trim();
        if (!sid) {
          store.dispatch({ type: 'MESSAGE_ADD', message: { role: 'error', type: 'text', content: 'Usage: /resume <session-id>  (use /sessions to list)', ts: '' }});
          Orchestrator.done(); return;
        }
        var ok = store.restoreById(sid);
        if (ok) {
          Renderer.showRestored(store.getState());
          store.dispatch({ type: 'THINKING', state: 'hide' });
          document.getElementById('input').focus();
        } else {
          store.dispatch({ type: 'MESSAGE_ADD', message: { role: 'error', type: 'text', content: 'Session ' + sid + ' not found. Use /sessions to list.', ts: '' }});
          store.dispatch({ type: 'THINKING', state: 'hide' });
          Orchestrator.done();
        }
        return;
      }
      if (cmd === 'forget') {
        store.forgetAll();
        store.dispatch({ type: 'MESSAGE_ADD', message: { role: 'agent', type: 'faq', content: 'All saved sessions cleared. Storage freed.', ts: '' }});
        Orchestrator.done();
        return;
      }

      Orchestrator.singleTool(cmd, text, turnId);
      return;
    }

    // ── Natural language: classify → unified ReAct loop ────
    store.dispatch({ type: 'THINKING', state: 'classifying', label: 'thinking...' });

    Classifier.classify(text).then(function(result) {
      if (turnId !== Orchestrator.currentTurnId) { Orchestrator.done(turnId); return; }
      var intent = result || { type: 'faq', label: 'faq', score: 0 };
      var alignment = typeof AlignmentGate !== 'undefined'
        ? AlignmentGate.check(text, intent, { turnId: turnId })
        : Promise.resolve({ action: 'execute', tool: intent.label || 'faq', confidence: intent.score || 0, reason: 'alignment unavailable' });
      alignment.then(function(decision) {
        if (turnId !== Orchestrator.currentTurnId) { Orchestrator.done(turnId); return; }
        store.dispatch({ type: 'MESSAGE_ADD', message: { role: 'system', type: 'react-step', content: 'align → ' + decision.action + ' ' + decision.tool + ' · ' + decision.reason, ts: '', noTs: true }});

        // Compound query: detect additional tool keywords in the text
        var plan = [{ tool: decision.tool || 'out_of_scope', score: decision.confidence, reason: decision.reason }];
        if ((decision.action === 'execute' || decision.action === 'redirect') && decision.tool !== 'out_of_scope' && decision.tool !== 'chat' && decision.tool !== 'faq') {
          var extraTools = Tools.detectExtraTools(text, decision.tool);
          for (var i = 0; i < extraTools.length; i++) {
            plan.push({ tool: extraTools[i], score: 80, reason: 'compound query expansion' });
          }
        }
        Orchestrator.runLoop(plan, text, turnId);
      }).catch(function(err) {
        if (turnId !== Orchestrator.currentTurnId) { Orchestrator.done(turnId); return; }
        // Alignment failed — fall back to out_of_scope for safety
        store.dispatch({ type: 'MESSAGE_ADD', message: { role: 'system', type: 'react-step', content: 'align → sink out_of_scope · alignment error', ts: '', noTs: true }});
        Orchestrator.runLoop([{ tool: 'out_of_scope', score: 0, reason: 'alignment error' }], text, turnId);
      });
    }).catch(function(err) {
      if (turnId !== Orchestrator.currentTurnId) { Orchestrator.done(turnId); return; }
      store.dispatch({ type: 'MESSAGE_ADD', message: { role: 'system', type: 'react-step', content: 'classify → error · ' + (err.message || 'classification failed'), ts: '', noTs: true }});
      Orchestrator.runLoop([{ tool: 'out_of_scope', score: 0, reason: 'classification error' }], text, turnId);
    });
  }

  function escapeHtml(s) { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  function init(_store) {
    store = _store;
    Tools.setStore(store);
    Classifier.init(store);
    Evaluator.init(store);
    if (typeof AlignmentGate !== 'undefined') AlignmentGate.init(store);
    Orchestrator.init(store);
    window._enableLLM = Classifier.enableLLM;
    window._answerAsk = function(idx) {
      store.dispatch({ type: 'RESUME' });
      if (humanCallback) { humanCallback(idx); humanCallback = null; }
      el_input_focus();
    };
  }

  function el_input_focus() {
    var inp = document.getElementById('input');
    if (inp) inp.focus();
  }

  function _clearHumanCallback() { humanCallback = null; }
  function _setHumanCallback(cb) { humanCallback = cb; }

  return {
    init: init,
    handleInput: handleInput,
    enableLLM: function() { Classifier.enableLLM(); },
    cancel: function() { Orchestrator.cancel(); },
    isProcessing: function() { return store.getState().ui.isProcessing; },
    _clearHumanCallback: _clearHumanCallback,
    _setHumanCallback: _setHumanCallback,
    _store: store
  };

})();

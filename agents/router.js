// router.js v2 — ReAct agent loop: main entry point (dispatches to Classifier, Evaluator, Orchestrator)
// eslint-disable-next-line max-lines-per-function -- legacy module wrapper (IIFE); out of scope for this UI change
var Router = (function() {
  "use strict";

  var store = null;
  var humanCallback = null; // for ask_user resume

  // ─── v2: Main entry ──────────────────────────────────────
  // opts.source === 'url' marks input that arrived from a query param or hash
  // route (agent-ui.js checkURLTriggers) rather than something the visitor
  // typed or clicked in-app — see the isSlash block below.
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: legacy entry point; refactoring it is out of scope for this UI change
  // eslint-disable-next-line max-lines-per-function, complexity -- legacy entry point; refactoring it is out of scope for this UI change
  function handleInput(text, opts) {
    opts = opts || {};
    // An ask_user pause intentionally keeps the turn alive while accepting a choice.
    if (store.getState().ui.needsHumanInput) {
      // A slash command typed while the chooser is open must be honored as a
      // command, not swallowed as a (numeric) answer. Cancel the pending
      // ask_user turn cleanly, then fall through to normal command processing.
      if (Tools.isSlash(text)) {
        store.dispatch({ type: 'RESUME' });   // clear the needsHumanInput modal
        humanCallback = null;                 // drop the pending ask_user callback
        Orchestrator.done();                  // release the isProcessing lock
      } else {
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

      // A URL (query param or hash route, on load or on hashchange) can drive
      // any slash command — that's the whole point of Factor #11 deep links.
      // But /forget and /clear are destructive/stateful, so a link a visitor
      // didn't type must not be able to run them (crafted-link data-loss —
      // e.g. ?q=/forget%20--confirm, or ?q=/clear right after the <30min
      // auto-restore, which would prune the just-restored session as "empty").
      // /new and /resume are left reachable from a URL: neither deletes a
      // saved session (see store.js persist()/restoreById) — /new persists
      // under a fresh, never-before-seen id, and /resume only re-saves the
      // session it loads, so at worst a link changes what's on screen, not
      // what's in storage.
      if (opts.source === 'url' && Tools.isDestructiveCommand(text)) {
        store.dispatch({ type: 'MESSAGE_ADD', message: { role: 'error', type: 'text', content: 'Type /' + cmd + ' yourself in the chat box — a link can\'t ' + (cmd === 'clear' ? 'clear the transcript' : 'delete saved sessions') + '.', ts: '' }});
        Orchestrator.done();
        return;
      }

      if (cmd === 'clear') { store.dispatch({ type: 'CLEAR' }); Orchestrator.resetFollowupState(); Orchestrator.done(); return; }
      if (cmd === 'new') { store.dispatch({ type: 'NEW_SESSION' }); Orchestrator.resetFollowupState(); Renderer.showWelcome(); store.dispatch({ type: 'THINKING', state: 'hide' }); return; }
      if (cmd === 'blog') { Orchestrator.singleTool('blog', text, turnId); return; }
      if (cmd === 'ask') { Orchestrator.singleTool('ask_user', text, turnId); return; }

      // Session management
      if (cmd === 'sessions') {
        store.dispatch({ type: 'THINKING', state: 'executing', label: 'listing sessions' });
        setTimeout(function() {
          // Cancelled meanwhile: adding the card would persist a session
          // again, even one a later /forget --confirm just deleted.
          if (turnId !== Orchestrator.currentTurnId) return;
          store.dispatch({ type: 'THINKING', state: 'hide' });
          var sessions = store.listSessions();
          var result = Tools.sessions(sessions, store.getSize());
          store.dispatch({ type: 'MESSAGE_ADD', message: { role: 'tool', type: 'tool-call', toolName: 'sessions', content: result.content, ts: '', noTs: false }});
          Orchestrator.done();
        }, 200);
        return;
      }
      if (cmd === 'resume' || cmd === 'r') {
        var sid = text.slice(cmd === 'resume' ? 8 : 3).trim().replace(/^\//, '');
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
          // sid is raw user/URL text, but no escaping needed here: renderer.js
          // renders this role:'error' message as plain text, running it
          // through escapeHtml once, live and when a saved session is
          // restored. Escaping it again here double-encodes (verified live:
          // a crafted sid rendered as literal "&amp;lt;...").
          store.dispatch({ type: 'MESSAGE_ADD', message: { role: 'error', type: 'text', content: 'Session ' + sid + ' not found. Use /sessions to list.', ts: '' }});
          store.dispatch({ type: 'THINKING', state: 'hide' });
          Orchestrator.done();
        }
        return;
      }
      if (cmd === 'forget') {
        // Safety: /forget irreversibly wipes all saved sessions, so require an
        // explicit confirm token. Without it, show a warning and do NOT wipe.
        // (URL-sourced /forget of any shape is already refused above.)
        var arg = (text.slice(7) || '').trim().toLowerCase().replace(/^[\/-]+/, '').replace(/\/+$/, '');
        if (arg === 'confirm' || arg === 'yes' || arg === 'y') {
          // Order matters: dispatch the confirmation FIRST, then forgetAll()
          // LAST. MESSAGE_ADD auto-persists the current session, so calling
          // forgetAll() first was immediately undone — the "cleared" message
          // re-wrote the current session to storage, leaving /forget --confirm
          // with 1 session still saved (and a misleading "Storage freed" note).
          // Reversing the order empties storage after the message is persisted.
          store.dispatch({ type: 'MESSAGE_ADD', message: { role: 'agent', type: 'faq', content: 'All saved sessions cleared. Storage freed.', ts: '' }});
          store.forgetAll();
        } else {
          var n = 0;
          try { n = store.listSessions().length; } catch(e) { n = 0; }
          store.dispatch({ type: 'MESSAGE_ADD', message: { role: 'agent', type: 'faq', content: 'This will permanently delete ' + (n > 0 ? (n + ' saved session' + (n === 1 ? '' : 's')) : 'all saved sessions') + '. Type <b>/forget --confirm</b> to proceed, or <b>/sessions</b> to review first.', ts: '' }});
        }
        Orchestrator.done();
        return;
      }

      Orchestrator.singleTool(cmd, text, turnId);
      return;
    }

    // ── Deterministic knowledge fast-path ───────────────────
    // Well-known site questions ('tools on this site', 'how does this chat
    // work', 'learning hub', 'is there a blog?') are answered from FAQ
    // directly — the Needle classifier misroutes them to skills/chat/LLM,
    // producing wrong answers or stalls when the local model is unavailable.
    var fastTool = Tools.detectKnowledgeFastPath(text);
    if (fastTool) {
      store.dispatch({ type: 'THINKING', state: 'classifying', label: 'routing' });
      Orchestrator.runLoop([{ tool: fastTool, score: 100, reason: 'knowledge fast-path' }], text, turnId);
      return;
    }

    // ── Natural language: classify → unified ReAct loop ────
    store.dispatch({ type: 'THINKING', state: 'classifying', label: 'thinking...' });

    // eslint-disable-next-line max-lines-per-function -- legacy classify callback; out of scope for this UI change
    Classifier.classify(text).then(function(result) {
      if (turnId !== Orchestrator.currentTurnId) { Orchestrator.done(turnId); return; }
      var intent = result || { type: 'faq', label: 'faq', score: 0 };
      var alignment = typeof AlignmentGate !== 'undefined'
        ? AlignmentGate.check(text, intent, { turnId: turnId })
        : Promise.resolve({ action: 'execute', tool: intent.label || 'faq', confidence: intent.score || 0, reason: 'alignment unavailable' });
      alignment.then(function(decision) {
        if (turnId !== Orchestrator.currentTurnId) { Orchestrator.done(turnId); return; }
        reactStep('align → ' + decision.action + ' ' + decision.tool + ' · ' + decision.reason);

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
        reactStep('align → sink out_of_scope · alignment error');
        Orchestrator.runLoop([{ tool: 'out_of_scope', score: 0, reason: 'alignment error' }], text, turnId);
      });
    }).catch(function(err) {
      if (turnId !== Orchestrator.currentTurnId) { Orchestrator.done(turnId); return; }
      reactStep('classify → error · ' + (err.message || 'classification failed'));
      Orchestrator.runLoop([{ tool: 'out_of_scope', score: 0, reason: 'classification error' }], text, turnId);
    });
  }

  // Same message shape as Orchestrator's trace(): verb + raw text feed
  // agent-ui's step list, which renders them as text.
  function reactStep(text) {
    var arrow = text.indexOf(' → ');
    store.dispatch({ type: 'MESSAGE_ADD', message: {
      role: 'system', type: 'react-step', content: text, ts: '', noTs: true,
      verb: arrow > 0 ? text.slice(0, arrow) : '', text: text
    }});
  }

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
    // Live getter — a plain `_store: store` captures the initial `null` at IIFE
    // eval time (before init() assigns the closure var), so the debugging hook
    // always returned null. A getter resolves the current store on each access.
    get _store() { return store; }
  };

})();

// renderer.js v2 — DOM rendering with error blocks, ask_user, restored sessions
// eslint-disable-next-line max-lines-per-function -- legacy module wrapper (IIFE); out of scope for this UI change
var Renderer = (function() {
  "use strict";

  var el = {};

  // Diagnostic/utility tools get a visually lighter card than content tools
  // (about/repos/contact/…), so a content answer reads as the hero card and
  // a diagnostic as a muted trace. Their bodies are still full box() cards
  // drawn by tools.js, so only the frame around them gets lighter.
  var MINOR_TOOLS = { time: 1, device: 1, screen: 1, network: 1, lucky: 1, status: 1, session: 1 };

  // Escape untrusted text (user input, error strings embedding user input,
  // streamed model output) before it reaches innerHTML. Without this, typing
  // `<b>x</b>` or `<img onerror=…>` rendered the raw HTML — mangling plain
  // text like "5 < 3" and enabling self-XSS. Trusted content (tool cards, FAQ
  // bodies) is authored with intentional HTML and goes through sanitizeHtml.
  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  // ─── Defense-in-depth sanitizer for "trusted, authored HTML" sinks ──────
  // escapeHtml above is the first line of defense: every known place that
  // interpolates user/URL text into a card string (tools.js, orchestrator.js,
  // router.js) escapes it before it gets here. sanitizeHtml is the second
  // line, run at every "trusted, authored HTML" sink below (tool cards, FAQ
  // bodies, summaries, system lines, live or restored) — it can't tell
  // authored markup from something that slipped through un-escaped, so it
  // strips anything that can execute script and leaves the rest (the
  // div/span/b/i/a/br/pre/code/ul/li/table markup + class/style attributes
  // these cards actually use) alone. Not a general-purpose sanitizer library
  // (no new dependency here) — it targets the concrete vectors this bug
  // class uses: script-capable elements, event-handler attributes, and
  // javascript:/vbscript:/data: URLs.
  var SANITIZE_BAD_TAGS = ['script', 'iframe', 'frame', 'frameset', 'object', 'embed', 'link', 'meta', 'base', 'style', 'svg', 'math', 'noscript', 'template', 'form'];
  var SANITIZE_URL_ATTRS = { href: 1, src: 1, action: 1, 'xlink:href': 1 };
  // cmdLink()/askBox()/llm_consentMessage() (tools.js) are the only authors of
  // onclick in trusted card markup, always with exactly these shapes — any
  // other on* value is an injection, not an authored handler, so it gets
  // stripped like the rest. A quickCmd() argument can't hold a backslash: a JS
  // escape ('\x2f') would run a different command than the text checked below.
  var SANITIZE_SAFE_ONCLICK = /^window\.(?:(?:quickCmd|_answerAsk)\((?:'[^'"<>\\]*'|-?\d+)\)|_enableLLM\(\))$/;

  function isDangerousUrl(value) {
    var v = String(value == null ? '' : value).replace(/[\s\u0000-\u001f]+/g, '').toLowerCase();
    if (v.indexOf('data:image/') === 0) return false; // inline images stay allowed
    return v.indexOf('javascript:') === 0 || v.indexOf('vbscript:') === 0 || v.indexOf('data:') === 0;
  }

  function isSafeOnclick(value) {
    if (!SANITIZE_SAFE_ONCLICK.test(value)) return false;
    var quickCmdArg = value.match(/^window\.quickCmd\('([^'"<>\\]*)'\)$/);
    // quickCmd() (agent-ui.js) replays its argument through Router.handleInput
    // with no { source: 'url' } tag — the same path as typed input — so it is
    // NOT covered by router.js's URL-source guard on /forget and /clear.
    // Refuse the same commands here: if a future missed escape ever let
    // attacker text reach an authored-HTML sink, it still couldn't be turned
    // into a one-click data wipe. quickCmd() goes through agent-ui's submit(),
    // which trims its argument before Router.handleInput sees it, so a leading/
    // trailing-space payload like quickCmd(' /forget confirm') is just as
    // destructive as the untrimmed form — test the trimmed argument.
    if (quickCmdArg && Tools.isDestructiveCommand(quickCmdArg[1].trim())) return false;
    return true;
  }

  function sanitizeAttributes(node) {
    var attrs = node.attributes ? Array.prototype.slice.call(node.attributes) : [];
    for (var i = 0; i < attrs.length; i++) {
      var name = attrs[i].name.toLowerCase();
      if (name.indexOf('on') === 0) {
        if (name === 'onclick' && isSafeOnclick(attrs[i].value)) continue;
        node.removeAttribute(attrs[i].name);
      } else if (name === 'srcdoc' || name === 'formaction') {
        node.removeAttribute(attrs[i].name);
      } else if (SANITIZE_URL_ATTRS[name] && isDangerousUrl(attrs[i].value)) {
        node.removeAttribute(attrs[i].name);
      }
    }
  }

  function sanitizeTree(root) {
    // Script-capable elements are removed outright — including anything that
    // could smuggle content past this same walk (e.g. a nested <template>'s
    // children live in .content, a separate fragment this querySelectorAll
    // can't see; removing the <template> node removes that fragment with it).
    for (var i = 0; i < SANITIZE_BAD_TAGS.length; i++) {
      var bad = root.querySelectorAll(SANITIZE_BAD_TAGS[i]);
      for (var j = 0; j < bad.length; j++) {
        if (bad[j].parentNode) bad[j].parentNode.removeChild(bad[j]);
      }
    }
    var all = root.querySelectorAll('*');
    for (var k = 0; k < all.length; k++) sanitizeAttributes(all[k]);
  }

  function sanitizeHtml(html) {
    var tpl = document.createElement('template');
    if (!tpl.content) return escapeHtml(html); // no <template> support — fail safe to plain text
    // Parse inertly: a <template>'s content never executes scripts, loads
    // images/frames, or runs handlers, however the markup is malformed.
    tpl.innerHTML = String(html == null ? '' : html);
    sanitizeTree(tpl.content);
    var out = document.createElement('div');
    out.appendChild(tpl.content);
    return out.innerHTML;
  }

  var store = null;
  // options.containerFor(msg) → node to append to, or null to skip (agent-ui
  // renders user queries and the cancel line itself). Default: el.output.
  var options = {};
  // Cap the live transcript — long sessions shouldn't bloat the DOM.
  var MAX_TRANSCRIPT_NODES = 60;
  var MINUTE_MS = 60000;
  var RESTORE_PAINT_DELAY_MS = 50;
  var unsubscribe = null;

  function ts() {
    var d = new Date();
    return d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');
  }

  // A typed slash command ("/repos") is echoed right above its own tool
  // card's "❯ /repos" header; index.astro quiets that echo via .slash-cmd.
  function isSlashEcho(m) {
    return m.role === 'user' && /^\s*\//.test(m.content || '');
  }

  function buildToolBlock(name, innerHTML, duration, isError) {
    var cls = isError ? 'tool-block tool-block-error' : 'tool-block';
    if (name && MINOR_TOOLS[name]) cls += ' tool-block-minor';
    // Header echoes the real tool that ran (msg.toolName — one of the fixed
    // tool_* names) — an honest "here's what I ran" caption, not a fake
    // exec-timing readout. Escaped anyway: restored sessions come from storage.
    var header = name ? '<div class="tool-block-header"><span class="tool-block-cmd">/' + escapeHtml(name) + '</span></div>' : '';
    // Footer is real, not decorative: only ever rendered when isError is
    // actually true (a tool-call flagged toolError), never fabricated.
    var footer = isError ? '<div class="tool-block-footer"><span class="err">error</span></div>' : '';
    // sanitizeHtml here covers the tool card body in one place, for the live
    // render and the restored-session replay alike (both via messageHtml).
    return '<div class="' + cls + '">' + header +
      '<div class="tool-block-body">' + sanitizeHtml(innerHTML) + '</div>' + footer +
      '</div>';
  }

  // One message's markup, built the same way by the live render and the
  // restored-session replay. Plain text (user and error text, streamed model
  // output) is escaped; only authored markup (tool cards, FAQ bodies,
  // summaries, system lines) goes through sanitizeHtml as defense in depth.
  function messageHtml(msg, time) {
    var prefix = msg.noTs ? '' : '<span class="prefix">' + time + '</span>';
    if (msg.type === 'tool-call') return prefix + '<span class="body">' + buildToolBlock(msg.toolName, msg.content, msg.toolDuration, !!msg.toolError) + '</span>';
    if (msg.type === 'stream') return prefix + '<span class="body stream-body" style="white-space:pre-wrap">' + escapeHtml(msg.content) + '</span>';
    if (msg.type === 'faq' || msg.type === 'llm-consent' || msg.type === 'system') return prefix + '<span class="body">' + sanitizeHtml(msg.content) + '</span>';
    if (msg.role === 'agent') return prefix + '<span class="body"><div class="faq-response">' + sanitizeHtml(msg.content) + '</div></span>';
    return prefix + '<span class="body">' + escapeHtml(msg.content) + '</span>';
  }

  function renderMessage(msg, isNew) {
    // Internal ReAct trace (plan/think/act/observe/eval) — NEVER render in
    // the transcript. Kept in state for eval context + debugging; run-view.js
    // draws it as a row of the turn's step list.
    if (!isNew || msg.type === 'react-step') return;
    var target = containerFor(msg);
    if (!target) return;
    var state = store.getState();
    var isFirstUserAfter = msg.role === 'user' && state.session.messageCount > 1;

    var node = document.createElement('div');
    node.className = 'msg ' + msg.role;
    if (isFirstUserAfter && !msg.noSeparator) node.classList.add('separated');
    if (isSlashEcho(msg)) node.classList.add('slash-cmd');
    node.setAttribute('data-msg-id', msg.id);
    node.innerHTML = messageHtml(msg, ts());
    if (msg.type === 'stream') startStream(msg, node);

    target.appendChild(node);
    trimTranscript(target);
  }

  function containerFor(msg) {
    return options.containerFor ? options.containerFor(msg) : el.output;
  }

  // Unbounded message nodes make scroll/render stutter.
  function trimTranscript(target) {
    if (target !== el.output) return;
    while (el.output.children.length > MAX_TRANSCRIPT_NODES) {
      el.output.removeChild(el.output.children[0]);
    }
  }

  function startStream(msg, node) {
    node.setAttribute('data-streaming', 'true');
    el.output.setAttribute('aria-busy', 'true');
    msg._raw = msg.content || '';
    msg._domEl = node;
  }

  function renderStreamChunk(msg, chunk) {
    if (!msg._domEl) return;
    var body = msg._domEl.querySelector('.body');
    msg._raw = (msg._raw || '') + chunk;
    if (body) body.textContent = msg._raw;
  }

  function finishStream(id) {
    var node = el.output.querySelector('[data-msg-id="' + id + '"]');
    if (node) node.removeAttribute('data-streaming');
    if (!el.output.querySelector('[data-streaming]')) el.output.removeAttribute('aria-busy');
  }

  // agent-ui owns the input (it queues typing while a turn runs), so this
  // only drives the optional thinking row and never disables or focuses it.
  function renderThinking(state, action) {
    if (action.type !== 'THINKING' || !el.thinking) return;
    var ui = state.ui;
    var busy = ui.isProcessing && ui.thinkingState !== 'idle';
    el.thinking.style.display = busy ? 'flex' : 'none';
    el.thinking.className = 'thinking' + (busy && ui.thinkingState === 'executing' ? ' executing' : '');
    if (busy && el.thinkingLabel) el.thinkingLabel.textContent = ui.thinkingLabel || 'thinking';
  }

  function renderContextBar(state) {
    var pct = state.ui.contextPct;
    var color = pct < 50 ? 'var(--green)' : pct < 80 ? 'var(--yellow)' : 'var(--red)';
    if (el.ctxBar) { el.ctxBar.style.width = pct + '%'; el.ctxBar.style.background = color; }
    if (el.sCtxFill) { el.sCtxFill.style.width = pct + '%'; el.sCtxFill.style.background = color; }
    if (el.sCtxPct) el.sCtxPct.textContent = Math.round(pct) + '%';
  }

  function renderSession(state) {
    if (el.hSession) el.hSession.textContent = state.session.id;
  }

  // ─── v2: Ask user modal ──────────────────────────────────
  // A real modal dialog: role/aria-modal, focus on open, a focus trap (Tab
  // must not walk out onto a header button hidden behind the opaque blurred
  // backdrop), and keyboard dismissal. Split into small helpers so
  // renderAskUser itself stays a plain state dispatch.
  function askUserOptButtons() {
    var optsEl = document.getElementById('ask-user-opts');
    return optsEl ? Array.prototype.slice.call(optsEl.querySelectorAll('.ask-btn')) : [];
  }

  // Wraps focus back inside the modal's own buttons instead of letting it
  // leak onto whatever sits behind the backdrop. Split out from
  // trapAskUserTab so neither function carries all the branching itself.
  function wrapAskUserFocus(e, first, last) {
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  function trapAskUserTab(e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      // Router.cancel() forwards to Orchestrator.cancel(), which no-ops
      // unless ui.isProcessing is true, and nothing in ASK_USER's own
      // reducer guarantees that. Call cancel() first for its eval/alignment
      // cleanup and "cancelled" message when it applies, then close the
      // modal directly if it's still open, so Escape is never a silent no-op
      // on a modal with no visible close button.
      if (typeof Router !== 'undefined' && Router.cancel) Router.cancel();
      if (store && store.getState().ui.needsHumanInput) {
        store.dispatch({ type: 'RESUME' });
      }
      return;
    }
    if (e.key !== 'Tab') return;
    var btns = askUserOptButtons();
    if (btns.length) wrapAskUserFocus(e, btns[0], btns[btns.length - 1]);
  }

  function createAskUserModal() {
    var modal = document.createElement('div');
    modal.id = 'ask-user-modal';
    modal.className = 'ask-user-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'ask-user-q');
    modal.innerHTML = '<div class="ask-user-inner">' +
      '<div class="ask-user-q" id="ask-user-q"></div>' +
      '<div class="ask-user-opts" id="ask-user-opts"></div>' +
      '</div>';
    modal.addEventListener('keydown', trapAskUserTab);
    document.body.appendChild(modal);
    return modal;
  }

  function fillAskUserOptions(opts) {
    var optsEl = document.getElementById('ask-user-opts');
    optsEl.innerHTML = '';
    for (var i = 0; i < opts.length; i++) {
      (function(idx) {
        var btn = document.createElement('button');
        btn.textContent = opts[idx];
        btn.className = 'ask-btn';
        btn.type = 'button';
        btn.onclick = function() { window._answerAsk(idx); };
        optsEl.appendChild(btn);
      })(i);
    }
  }

  function renderAskUser(state) {
    var existing = document.getElementById('ask-user-modal');
    if (state.ui.needsHumanInput) {
      if (!existing) existing = createAskUserModal();
      document.getElementById('ask-user-q').textContent = state.ui.humanQuestion || '';
      fillAskUserOptions(state.ui.humanOptions || []);
      existing.style.display = 'flex';
      // Move focus into the dialog — was left on whatever had focus before
      // (usually <body>), so a keyboard/screen-reader user got no signal a
      // modal had opened at all.
      var firstBtn = askUserOptButtons()[0];
      if (firstBtn) firstBtn.focus();
    } else if (existing) {
      hideAskUser(existing);
    }
  }

  // Return focus to the composer only if it was inside the dialog.
  function hideAskUser(modal) {
    var hadFocus = modal.contains && modal.contains(document.activeElement);
    modal.style.display = 'none';
    if (hadFocus && el.input) el.input.focus({ preventScroll: true });
  }

  // ─── Session header (always shown on page load/refresh) ────
  // index.astro carries the page identity (hero h1, profile files), so the
  // transcript only opens with the session line.
  function showHeader(sessionId, isRestore, ago) {
    el.output.innerHTML = '';

    // Reset the context readout to the true value on boot: renderContextBar
    // only fires on CONTEXT_UPDATE/SESSION_START/MESSAGE_ADD, none of which
    // run on a fresh (non-restore) boot.
    renderContextBar(store.getState());

    // Sync the session id readout with the actual session (renderSession only
    // fires on SESSION_START/NEW_SESSION, never during initial boot).
    if (el.hSession) el.hSession.textContent = sessionId;

    // The id comes from localStorage on restore and /resume, so escape it.
    var safeId = escapeHtml(sessionId);
    var sys = document.createElement('div');
    sys.className = 'msg system session-start';
    sys.innerHTML = '<span class="body"><span class="session-pulse"></span>' +
      (isRestore ? 'restored session · ' + safeId + ' · ' + ago + 'm ago' : 'new local session · ' + safeId) +
      '</span>';
    el.output.appendChild(sys);
  }

  function showWelcome() {
    showHeader(store.getState().session.id, false, 0);
    store.dispatch({ type: 'WELCOME_DONE' });
  }

  // ─── v2: Show restored session ───────────────────────────
  function showRestored(state) {
    showHeader(state.session.id, true, Math.floor((Date.now() - state.session.start) / MINUTE_MS));

    // Append restored messages below the session line. showHeader() paints
    // synchronously, so this only needs one tick to let that paint settle
    // before the (possibly long) history loop runs.
    setTimeout(function() {
      var msgs = state.messages;
      for (var i = 0; i < msgs.length; i++) {
        var saved = msgs[i];
        // Never restore legacy welcome DOM (showHeader paints only the session
        // line) or react-step traces (only a live turn's step list shows them).
        if (saved.type === 'welcome' || saved.type === 'welcome-card' || saved.type === 'react-step') continue;
        var node = document.createElement('div');
        node.className = 'msg ' + (saved.role || 'agent');
        if (isSlashEcho(saved)) node.classList.add('slash-cmd');
        node.innerHTML = messageHtml(saved, '');
        el.output.appendChild(node);
      }
      store.dispatch({ type: 'WELCOME_DONE' });
    }, RESTORE_PAINT_DELAY_MS);
  }

  // ─── v2: Decoder status ───────────────────────────────────
  // Paints one status string on #sModel (header status line) and #inputModel
  // (composer status row). It folds in the needle classifier's state
  // (state.models.needle*, set by store.js's generic MODEL_STATUS reducer)
  // since the header advertises both models as one pair.
  function llmLoadingDetail(m) {
    if (m.llmDownloadProgress > 0) return m.llmDownloadProgress + '%';
    if (m.llmStatusText) return m.llmStatusText;
    return 'loading...';
  }

  function modelStatus(m) {
    if (m.needleError || m.llmError) {
      return { text: (m.llmError ? 'smollm2' : 'needle') + ' unavailable', tone: 'error' };
    }
    if (m.llmReady && (m.needleReady || !m.needleLoading)) {
      return { text: 'ready', tone: 'ready' };
    }
    if (m.llmLoading) return { text: 'smollm2 ' + llmLoadingDetail(m), tone: 'loading' };
    if (m.needleLoading) return { text: 'needle loading...', tone: 'loading' };
    if (m.needleReady) return { text: 'ready', tone: 'ready' };
    return { text: 'loading...', tone: 'loading' };
  }

  function renderLLMStatus(state) {
    var s = modelStatus(state.models);
    if (el.sModel) el.sModel.textContent = s.text;
    if (el.sModelDot) el.sModelDot.className = 'model-dot ' + s.tone;
    if (el.inputModel) el.inputModel.textContent = s.text;
    if (el.inputModelDot) el.inputModelDot.className = 'model-dot ' + s.tone;
  }

  // ─── State change handler ────────────────────────────────
  function onStateChange(state, action) {
    switch (action.type) {
      case 'THINKING': renderThinking(state, action); break;
      case 'CONTEXT_UPDATE': renderContextBar(state); break;
      case 'SESSION_START': case 'NEW_SESSION': renderSession(state); renderContextBar(state); break;
      case 'MESSAGE_ADD': renderMessage(action.message, true); renderContextBar(state); break;
      case 'MESSAGE_STREAM': var streamMsg = findMsgById(state, action.id); if (streamMsg) renderStreamChunk(streamMsg, action.chunk); break;
      case 'MESSAGE_STREAM_DONE': finishStream(action.id); renderContextBar(state); break;
      case 'MODEL_STATUS': renderLLMStatus(state); break;
      case 'CLEAR': el.output.innerHTML = ''; renderContextBar(state); break;
      case 'ASK_USER': case 'USER_RESPONSE': case 'RESUME': renderAskUser(state); break;
      case 'RESTORE': break; // handled separately
    }
  }

  function findMsgById(state, id) {
    for (var i = state.messages.length - 1; i >= 0; i--) {
      if (state.messages[i].id === id) return state.messages[i];
    }
    return null;
  }

  function init(_store, elements, opts) {
    store = _store;
    el = elements;
    options = opts || {};
    unsubscribe = store.subscribe(onStateChange);
  }

  function destroy() { if (unsubscribe) unsubscribe(); }

  return {
    init: init, destroy: destroy,
    showWelcome: showWelcome, showRestored: showRestored
  };

})();

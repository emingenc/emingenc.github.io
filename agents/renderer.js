// renderer.js v2 — DOM rendering with error blocks, ask_user, restored sessions
var Renderer = (function() {
  "use strict";

  var el = {};

  // Force scroll to absolute bottom of page (more reliable than scrollIntoView)
  function scrollToBottom() {
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  }
  var store = null;
  var unsubscribe = null;

  function ts() {
    var d = new Date();
    return d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');
  }

  function buildToolBlock(name, innerHTML, duration, isError) {
    var dur = duration || Math.round(Math.random() * 8 + 4);
    var cls = isError ? 'tool-block tool-block-error' : 'tool-block';
    var icon = isError ? '✗' : '▶';
    var statusIcon = isError ? '✗' : '✓';
    var statusClass = isError ? 'err' : 'ok';
    var execLabel = isError ? 'error' : 'exec';
    return '<div class="' + cls + '">' +
      '<div class="tool-block-header"><span class="tool-icon">' + icon + '</span> tool:' + name + '</div>' +
      '<div class="tool-block-body">' + innerHTML + '</div>' +
      '<div class="tool-block-footer"><span class="' + statusClass + '">' + statusIcon + '</span> ' + execLabel + ' · ' + dur + 'ms</div>' +
      '</div>';
  }

  function renderMessage(msg, isNew) {
    if (!isNew) return;
    var state = store.getState();
    var isFirstUserAfter = msg.role === 'user' && state.session.messageCount > 1;

    var d = document.createElement('div');
    d.className = 'msg ' + msg.role;
    if (isFirstUserAfter && !msg.noSeparator) d.classList.add('separated');
    d.setAttribute('data-msg-id', msg.id);

    var prefixHtml = msg.noTs ? '' : ('<span class="prefix">' + ts() + '</span>');

    if (msg.type === 'tool-call') {
      d.innerHTML = prefixHtml + '<span class="body">' + buildToolBlock(msg.toolName, msg.content, msg.toolDuration, !!msg.toolError) + '</span>';
    } else if (msg.type === 'tool-error') {
      d.className = 'msg error';
      d.innerHTML = prefixHtml + '<span class="body">' + buildToolBlock(msg.toolName, msg.content, msg.toolDuration, true) + '</span>';
    } else if (msg.type === 'faq' || msg.type === 'llm-consent') {
      d.className = 'msg agent';
      d.innerHTML = prefixHtml + '<span class="body">' + msg.content + '</span>';
    } else if (msg.type === 'system') {
      d.innerHTML = '<span class="body">' + msg.content + '</span>';
    } else if (msg.type === 'stream') {
      d.innerHTML = prefixHtml + '<span class="body stream-body"></span>';
      d.setAttribute('data-streaming', 'true');
      msg._raw = msg.content || '';
      msg._domEl = d;
    } else if (msg.type === 'react-step') {
      d.className = 'msg react-step';
      d.innerHTML = '<span class="body">' + msg.content + '</span>';
    } else if (msg.type === 'welcome') {
      d.innerHTML = '<span class="body">' + msg.content + '</span>';
    } else if (msg.type === 'restored') {
      d.className = 'msg system';
      d.innerHTML = '<span class="body">─── restored session · ' + msg.content + ' ───</span>';
    } else if (msg.role === 'agent') {
      d.innerHTML = prefixHtml + '<span class="body"><div class="faq-response">' + msg.content + '</div></span>';
    } else {
      d.innerHTML = prefixHtml + '<span class="body">' + msg.content + '</span>';
    }

    el.output.appendChild(d);
    // Auto-scroll after DOM layout settles (double rAF for reliable layout)
    requestAnimationFrame(function() {
      requestAnimationFrame(function() {
        scrollToBottom();
      });
    });
  }

  function renderStreamChunk(msg, chunk) {
    if (!msg._domEl) return;
    var body = msg._domEl.querySelector('.body');
    msg._raw = (msg._raw || '') + chunk;
    if (body) {
      body.textContent = msg._raw;
      body.style.whiteSpace = 'pre-wrap';
    }
    requestAnimationFrame(function() {
      requestAnimationFrame(function() {
        scrollToBottom();
      });
    });
  }

  function finishStream(msg) {
    if (!msg._domEl) return;
    msg._domEl.removeAttribute('data-streaming');
    requestAnimationFrame(function() {
      requestAnimationFrame(function() {
        scrollToBottom();
      });
    });
  }

  function renderThinking(state, action) {
    if (action.type !== 'THINKING') return;
    var ui = state.ui;
    if (!ui.isProcessing || ui.thinkingState === 'idle') {
      el.thinking.style.display = 'none';
      el.thinking.className = 'thinking';
      el.prompt.classList.add('ready');
      el.input.disabled = false;
      el.input.focus();
    } else {
      el.thinking.style.display = 'flex';
      el.thinking.className = 'thinking' + (ui.thinkingState === 'executing' ? ' executing' : '');
      el.thinkingLabel.textContent = ui.thinkingLabel || 'thinking';
      el.prompt.classList.remove('ready');
      el.input.disabled = true;
    }
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
  function renderAskUser(state) {
    var existing = document.getElementById('ask-user-modal');
    if (state.ui.needsHumanInput) {
      if (!existing) {
        var modal = document.createElement('div');
        modal.id = 'ask-user-modal';
        modal.className = 'ask-user-modal';
        modal.innerHTML = '<div class="ask-user-inner">' +
          '<div class="ask-user-q" id="ask-user-q"></div>' +
          '<div class="ask-user-opts" id="ask-user-opts"></div>' +
          '</div>';
        document.body.appendChild(modal);
      }
      document.getElementById('ask-user-q').textContent = state.ui.humanQuestion || '';
      var optsEl = document.getElementById('ask-user-opts');
      optsEl.innerHTML = '';
      var opts = state.ui.humanOptions || [];
      for (var i = 0; i < opts.length; i++) {
        (function(idx) {
          var btn = document.createElement('button');
          btn.textContent = opts[idx];
          btn.className = 'ask-btn';
          btn.onclick = function() { window._answerAsk(idx); };
          optsEl.appendChild(btn);
        })(i);
      }
      document.getElementById('ask-user-modal').style.display = 'flex';
      el.input.disabled = true;
    } else {
      if (existing) existing.style.display = 'none';
      el.input.disabled = false;
      el.input.focus();
    }
  }

  // ─── Welcome header (always shown on page load/refresh) ────
  function welcomeCard(eyebrow, title, body, extraClass) {
    var d = document.createElement('div');
    d.className = 'welcome-card ' + (extraClass || '');
    d.innerHTML = '<div class="welcome-eyebrow">' + eyebrow + '</div>' +
      '<div class="welcome-title">' + title + '</div>' +
      '<div class="welcome-body">' + body + '</div>';
    return d;
  }

  function showHeader(sessionId, isRestore, ago) {
    el.output.innerHTML = '';

    var sys = document.createElement('div');
    sys.className = 'msg system session-start';
    sys.innerHTML = '<span class="body"><span class="session-pulse"></span>' +
      (isRestore ? 'restored session · ' + sessionId + ' · ' + ago + 'm ago' : 'new local session · ' + sessionId) +
      '</span>';
    el.output.appendChild(sys);

    setTimeout(function() {
      var d = welcomeCard('EMIN GENCH', 'Forward Deployed AI Engineer',
        '<span class="welcome-highlight">Cresta AI</span><span class="welcome-separator">·</span> Vancouver, BC<br>' +
        '<span class="welcome-muted">Ask me anything — I run entirely in your browser.</span>', 'welcome-identity');
      el.output.appendChild(d);
    }, 80);
    setTimeout(function() {
      var d = welcomeCard('RUNNING LOCALLY', 'It\'s not the size, it\'s how you use it. (But seriously, 26M params.) 🫠',
        '<span class="metric"><b>Needle</b> 26M params · 38,000× smaller than Kimi 3</span><span class="metric"><b>SmolLM2</b> 360M params · 2,800× smaller than Kimi 3</span><span class="metric"><b>0</b> API calls · zero servers · zero tracking</span><span class="metric"><b>100%</b> private · your data never leaves</span>', 'welcome-runtime');
      el.output.appendChild(d);
    }, 180);
    setTimeout(function() {
      var d = welcomeCard('START EXPLORING', 'Ask naturally or use a shortcut',
        '<span class="command-chip">/about</span><span class="command-chip">/repos</span><span class="command-chip">/contact</span><span class="command-chip">/skills</span>', 'welcome-actions');
      el.output.appendChild(d);
    }, 280);
  }

  function showWelcome() {
    var state = store.getState();
    showHeader(state.session.id, false, 0);

    setTimeout(function() {
      var welcome = 'Hello! I\'m an AI agent running entirely in your browser. Type <b>/help</b> to see commands, or ask me about Emin\'s work, repos, or smart glasses.';
      var d = document.createElement('div'); d.className = 'msg agent';
      d.innerHTML = '<span class="prefix">' + ts() + '</span><span class="body"></span>';
      el.output.appendChild(d);
      var body = d.querySelector('.body'), lines = welcome.split('\n'), i = 0;
      var buf = '';
      function next() { if (i >= lines.length) { scrollToBottom(); store.dispatch({ type:'WELCOME_DONE' }); return; } buf += lines[i] + (i<lines.length-1?'<br>':''); body.innerHTML = buf; scrollToBottom(); i++; setTimeout(next, 22+Math.random()*12); }
      next();
    }, 450);
    setTimeout(function() {
      if (el.suggestions) { el.suggestions.style.opacity = '1'; el.suggestions.style.transform = 'translateY(0)'; }
    }, 800);
  }

  // ─── v2: Show restored session ───────────────────────────
  function showRestored(state) {
    showHeader(state.session.id, true, Math.floor((Date.now() - state.session.start) / 60000));

    // Append restored messages below the header boxes
    setTimeout(function() {
      var msgs = state.messages;
      for (var i = 0; i < msgs.length; i++) {
        var m = msgs[i];
        // Welcome cards are rebuilt by showHeader; never restore legacy ASCII welcome DOM.
        if (m.type === 'welcome' || m.type === 'welcome-card') continue;
        var d = document.createElement('div');
        d.className = 'msg ' + (m.role || 'agent');
        if (m.type === 'tool-call') {
          d.innerHTML = (m.noTs ? '' : '<span class="prefix">' + (m.ts || '') + '</span>') + '<span class="body">' + buildToolBlock(m.toolName, m.content, m.toolDuration, !!m.toolError) + '</span>';
        } else if (m.role === 'user') {
          d.innerHTML = '<span class="prefix">' + (m.ts || '') + '</span><span class="body">' + m.content + '</span>';
        } else {
          d.innerHTML = (m.noTs ? '' : '<span class="prefix">' + (m.ts || '') + '</span>') + '<span class="body">' + m.content + '</span>';
        }
        el.output.appendChild(d);
      }
      el.output.lastChild && scrollToBottom();

      // Restore context bar
      var pct = state.ui.contextPct || 28;
      var color = pct < 50 ? 'var(--green)' : pct < 80 ? 'var(--yellow)' : 'var(--red)';
      if (el.ctxBar) { el.ctxBar.style.width = pct + '%'; el.ctxBar.style.background = color; }
      if (el.sCtxFill) { el.sCtxFill.style.width = pct + '%'; el.sCtxFill.style.background = color; }
      if (el.sCtxPct) el.sCtxPct.textContent = Math.round(pct) + '%';

      if (el.suggestions) { el.suggestions.style.opacity = '1'; el.suggestions.style.transform = 'translateY(0)'; }
      if (el.prompt) el.prompt.classList.add('ready');
      if (el.input) { el.input.disabled = false; el.input.focus(); }
      store.dispatch({ type: 'WELCOME_DONE' });
    }, 500);
  }

  // ─── v2: Decoder status ───────────────────────────────────
  function renderLLMStatus(state) {
    var m = state.models;
    if (m.llmReady) {
      if (el.sSession) el.sSession.textContent = 'smollm2: ready';
    } else if (m.llmLoading && m.llmDownloadProgress > 0) {
      if (el.sSession) el.sSession.textContent = 'smollm2: ' + m.llmDownloadProgress + '%';
    } else if (m.llmLoading && m.llmStatusText) {
      if (el.sSession) el.sSession.textContent = 'smollm2: ' + m.llmStatusText;
    }
  }

  // ─── State change handler ────────────────────────────────
  function onStateChange(state, action) {
    switch (action.type) {
      case 'THINKING': renderThinking(state, action); break;
      case 'CONTEXT_UPDATE': renderContextBar(state); break;
      case 'SESSION_START': case 'NEW_SESSION': renderSession(state); renderContextBar(state); break;
      case 'MESSAGE_ADD': renderMessage(action.message, true); renderContextBar(state); break;
      case 'MESSAGE_STREAM': var streamMsg = findMsgById(state, action.id); if (streamMsg) renderStreamChunk(streamMsg, action.chunk); break;
      case 'MESSAGE_STREAM_DONE': var m = findMsgById(state, action.id); if (m) finishStream(m); renderContextBar(state); break;
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

  function init(_store, elements) {
    store = _store;
    el = elements;
    unsubscribe = store.subscribe(onStateChange);
  }

  function destroy() { if (unsubscribe) unsubscribe(); }

  return {
    init: init, destroy: destroy,
    showWelcome: showWelcome, showRestored: showRestored
  };

})();

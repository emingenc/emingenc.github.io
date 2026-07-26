// agent-ui.js — Entry point. Creates store, wires DOM, boots agent loop.
(function() {
  "use strict";

  // ─── Canvas particles (atmospheric network) ──────────────────
  var c = document.getElementById('particles'), x = c.getContext('2d'), w, h, p = [];
  function rz() { w = c.width = innerWidth; h = c.height = innerHeight; for (var i = 0; i < p.length; i++) { p[i].x = Math.random() * w; p[i].y = Math.random() * h } }
  rz(); addEventListener('resize', function() { rz() });
  for (var i = 0; i < 55; i++) p.push({ x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - .5) * .18, vy: (Math.random() - .5) * .18, r: Math.random() * 1.4 + .15 });
  var animId;
  (function d() { x.clearRect(0, 0, w, h); for (var i = 0; i < p.length; i++) { var o = p[i]; o.x += o.vx; o.y += o.vy; if (o.x < 0 || o.x > w) o.vx *= -1; if (o.y < 0 || o.y > h) o.vy *= -1; x.beginPath(); x.arc(o.x, o.y, o.r, 0, Math.PI * 2); x.fillStyle = 'rgba(45,212,191,' + (.015 + o.r * .012) + ')'; x.fill(); for (var j = i + 1; j < p.length; j++) { var dx = o.x - p[j].x, dy = o.y - p[j].y, dist = Math.sqrt(dx * dx + dy * dy); if (dist < 85) { x.beginPath(); x.moveTo(o.x, o.y); x.lineTo(p[j].x, p[j].y); x.strokeStyle = 'rgba(45,212,191,' + (0.02 * (1 - dist / 85)) + ')'; x.lineWidth = 0.4; x.stroke() } } } animId = requestAnimationFrame(d) })();
  document.addEventListener('visibilitychange', function() {
    if (document.hidden) { cancelAnimationFrame(animId); }
    else { animId = requestAnimationFrame(d); }
  });

  // ─── DOM refs ──────────────────────────────────────────────
  var elements = {
    output: document.getElementById('output'),
    input: document.getElementById('input'),
    thinking: document.getElementById('thinking'),
    thinkingLabel: document.getElementById('thinking-label'),
    suggestions: document.getElementById('suggestions'),
    sSession: document.getElementById('s-session'),
    hSession: document.getElementById('h-session'),
    ctxBar: document.getElementById('ctx-bar'),
    sCtxFill: document.getElementById('s-ctx-fill'),
    sCtxPct: document.getElementById('s-ctx-pct'),
    prompt: document.getElementById('prompt')
  };

  // ─── Session timer ─────────────────────────────────────────
  var sessionStart = Date.now();
  setInterval(function() {
    if (elements.sSession) {
      elements.sSession.textContent = 'session ' + Math.floor((Date.now() - sessionStart) / 60000) + 'm';
    }
  }, 30000);

  // ─── Create store ──────────────────────────────────────────
  var store = createStore({
    session: { id: 'agent-' + Math.random().toString(36).slice(2,6), start: Date.now(), messageCount: 0, sessionCount: 1 },
    models: { needleReady: false, needleLoading: false, llmReady: false, llmLoading: false, llmError: null, llmConsent: null, llmDownloadProgress: 0, capabilities: {} },
    messages: [],
    ui: { isProcessing: false, thinkingState: 'idle', thinkingLabel: '', contextPct: 0 }
  });

  // ─── Init renderer ─────────────────────────────────────────
  Renderer.init(store, elements);

  // ─── Init router (needle worker, LLM consent) ──────────────
  Router.init(store);

  // ─── Tab completion ────────────────────────────────────────
  var allCmds = Tools.getCommands();

  elements.input.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      Router.cancel();
      elements.input.value = '';
      return;
    }
    if (e.key === 'Tab') {
      e.preventDefault();
      var v = elements.input.value.toLowerCase();
      var m = allCmds.filter(function(c) { return c.startsWith(v); });
      if (m.length) elements.input.value = m[0] + ' ';
      return;
    }
    if (e.key !== 'Enter') return;
    var text = elements.input.value.trim();
    if (!text) return;
    elements.input.value = '';
    Router.handleInput(text);
  });

  // ─── Public API ────────────────────────────────────────────
  window.quickCmd = function(cmd) {
    if (Router.isProcessing()) return;
    elements.input.value = cmd;
    elements.input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
  };
  window.setMode = function(m) { if (m === 'static') window.location.href = '/static'; };
  window._enableLLM = function() { Router.enableLLM(); };

  // ─── Factor #11: URL-based triggers ─────────────────────────
  function checkURLTriggers() {
    var hash = window.location.hash;
    var params = new URLSearchParams(window.location.search);
    var triggered = false;

    // Hash routes: /#/about, /#/repos, /#/g1, /#/contact, /#/skills, /#/blog, /#/help
    // Hash query: /#/q/your+question+here
    if (hash) {
      var route = hash.replace(/^#\/?/, '');
      if (route.startsWith('q/')) {
        var q = decodeURIComponent(route.slice(2));
        if (q) { Router.handleInput(q); triggered = true; }
      } else if (Tools.toolNames.indexOf(route) !== -1 || route === 'help' || route === 'blog') {
        Router.handleInput('/' + route);
        triggered = true;
      }
    }

    // Query params: ?q=who+is+emin or ?ask=what+does+emin+do
    if (!triggered) {
      var q = params.get('q') || params.get('ask') || params.get('query');
      if (q) {
        Router.handleInput(q);
        triggered = true;
      }
    }

    // Clean URL after trigger (keep it bookmarkable)
    if (triggered && hash) {
      // Keep the hash — it's the canonical URL for this action
    }
  }

  // ─── Boot ──────────────────────────────────────────────────
  Tools.loadFAQ().then(function() {
    // v2: Try to restore previous session
    var restored = store.restore();
    if (restored) {
      Renderer.showRestored(store.getState());
    } else {
      Renderer.showWelcome();
    }
    elements.input.disabled = false;
    elements.input.placeholder = 'ask me anything...';
    elements.input.focus();

    // Factor #11: Check for URL triggers after welcome is shown
    setTimeout(function() {
      checkURLTriggers();
    }, 1200);
  });

  // Listen for hash changes (back/forward navigation)
  window.addEventListener('hashchange', function() {
    checkURLTriggers();
  });

  // v2: Persist on page unload
  window.addEventListener('beforeunload', function() {
    // State auto-persists on significant actions via store
  });

})();

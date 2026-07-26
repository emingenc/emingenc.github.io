// store.js v2 — State management with working memory, multi-session persist/restore

var SESSIONS_KEY = 'agent-sessions';
var MAX_SESSIONS = 10;
var MAX_SESSION_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
var MAX_CONTEXT_TOKENS = 8192;

function createStore(initial) {
  var state = JSON.parse(JSON.stringify(initial));
  var listeners = [];
  var idCounter = 0;

  function findMsg(id) {
    for (var i = state.messages.length - 1; i >= 0; i--) {
      if (state.messages[i].id === id) return state.messages[i];
    }
    return null;
  }

  // ─── Multi-session persist ──────────────────────────────
  function persist() {
    try {
      var current = {
        id: state.session.id,
        start: state.session.start,
        messageCount: state.session.messageCount,
        sessionCount: state.session.sessionCount,
        firstMessage: state.messages.length > 0 ? firstUserText() : '',
        messages: state.messages.slice(-30),  // keep last 30 messages
        models: { llmConsent: state.models.llmConsent },
        ui: { contextPct: state.ui.contextPct }
      };

      // Load existing sessions, merge current, cap at 10
      var sessions = loadSessions();
      // Remove existing entry for this session ID (update in place)
      sessions = sessions.filter(function(s) { return s.id !== current.id; });
      sessions.push(current);
      // Keep newest 10
      if (sessions.length > MAX_SESSIONS) sessions = sessions.slice(-MAX_SESSIONS);
      // Remove expired (>7 days)
      var cutoff = Date.now() - MAX_SESSION_AGE_MS;
      sessions = sessions.filter(function(s) { return s.start > cutoff; });

      localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
    } catch(e) {}
  }

  function firstUserText() {
    for (var i = 0; i < state.messages.length; i++) {
      if (state.messages[i].role === 'user') return state.messages[i].content.slice(0, 80);
    }
    return '';
  }

  function loadSessions() {
    try {
      var raw = localStorage.getItem(SESSIONS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch(e) { return []; }
  }

  function getStorageSize() {
    try {
      var bytes = new Blob([JSON.stringify(localStorage)]).size;
      if (bytes < 1024) return bytes + 'B';
      if (bytes < 1024*1024) return (bytes/1024).toFixed(1) + 'KB';
      return (bytes/(1024*1024)).toFixed(1) + 'MB';
    } catch(e) { return '?'; }
  }

  // Real context window: estimate token usage from message content
  function computeContextPct() {
    var totalChars = 0;
    for (var i = 0; i < state.messages.length; i++) {
      totalChars += (state.messages[i].content || '').length;
    }
    // ~4 chars per token, estimate against MAX_CONTEXT_TOKENS
    var pct = Math.round(totalChars / 4 / MAX_CONTEXT_TOKENS * 100);
    return pct > 100 ? 100 : (pct < 0 ? 0 : pct);
  }

  function reduce(action) {
    switch (action.type) {

      case 'SESSION_START':
        state.session.id = action.sessionId || ('agent-' + Math.random().toString(36).slice(2, 6));
        state.session.start = Date.now();
        state.session.messageCount = 0;
        state.session.sessionCount = (state.session.sessionCount || 0) + 1;
        break;

      case 'MODEL_STATUS':
        state.models[action.model + 'Ready'] = action.status === 'ready';
        state.models[action.model + 'Loading'] = action.status === 'loading';
        if (action.status === 'error') state.models[action.model + 'Error'] = action.error;
        if (action.progress !== undefined) state.models.llmDownloadProgress = action.progress;
        if (action.statusText !== undefined) state.models.llmStatusText = action.statusText;
        // Populate capability registry on model ready
        if (!state.models.capabilities) state.models.capabilities = {};
        if (action.status === 'ready') {
          if (action.model === 'needle') state.models.capabilities.classify = true;
          if (action.model === 'needleFc') state.models.capabilities.functionCall = true;
          if (action.model === 'llm') { state.models.capabilities.generate = true; state.models.capabilities.evaluate = true; }
        }
        break;

      case 'LLM_CONSENT':
        state.models.llmConsent = action.value;
        try { localStorage.setItem('llm-consent', action.value ? 'true' : 'false'); } catch(e) {}
        break;

      case 'THINKING':
        state.ui.isProcessing = action.state !== 'hide';
        state.ui.thinkingState = action.state || 'idle';
        state.ui.thinkingLabel = action.label || '';
        break;

      case 'MESSAGE_ADD':
        if (!action.message.id) action.message.id = 'msg_' + (++idCounter);
        state.messages.push(action.message);
        state.session.messageCount++;
        state.ui.contextPct = computeContextPct();
        break;

      case 'MESSAGE_STREAM':
        var m = findMsg(action.id);
        if (m) m.content += action.chunk;
        break;

      case 'MESSAGE_STREAM_DONE':
        var md = findMsg(action.id);
        if (md) { md._streaming = false; state.ui.contextPct = computeContextPct(); }
        break;

      case 'CONTEXT_UPDATE':
        state.ui.contextPct = computeContextPct();
        break;

      case 'CLEAR':
        state.messages = [];
        state.session.messageCount = 0;
        state.workingMemory = { turnId: null, observations: [], plan: [], planIndex: 0, coveredTools: {}, steps: 0, triedFallbacks: {} };
        state.ui.contextPct = computeContextPct();
        break;

      case 'NEW_SESSION':
        state.session.id = 'agent-' + Math.random().toString(36).slice(2, 6);
        state.session.start = Date.now();
        state.session.messageCount = 0;
        state.session.sessionCount = (state.session.sessionCount || 0) + 1;
        state.messages = [];
        state.ui.isProcessing = false;
        state.ui.thinkingState = 'idle';
        state.workingMemory = { turnId: null, observations: [], plan: [], planIndex: 0, coveredTools: {}, steps: 0, triedFallbacks: {} };
        break;

      case 'WELCOME_DONE':
        state.ui.isProcessing = false;
        break;

      // ─── v2: Multi-tool ReAct ──────────────────────────
      case 'PLAN_START':
        state.workingMemory = {
          turnId: 'turn_' + (++idCounter),
          observations: [],
          plan: action.plan || [],
          planIndex: 0,
          coveredTools: {},
          steps: 0,
          triedFallbacks: {},
          askCount: 0
        };
        break;

      case 'PLAN_NEXT':
        if (state.workingMemory) state.workingMemory.planIndex++;
        break;

      case 'OBSERVE':
        if (!state.workingMemory) state.workingMemory = { turnId: null, observations: [], plan: [], planIndex: 0, coveredTools: {}, steps: 0, triedFallbacks: {} };
        state.workingMemory.observations.push({
          tool: action.tool,
          data: action.data || null,
          error: action.error || null,
          hint: action.hint || null,
          satisfied: action.satisfied !== undefined ? action.satisfied : null,
          confidence: action.confidence || null,
          reason: action.reason || null
        });
        break;

      case 'WM_STEP':
        if (!state.workingMemory) state.workingMemory = { turnId: null, observations: [], plan: [], planIndex: 0, coveredTools: {}, steps: 0, triedFallbacks: {} };
        state.workingMemory.steps = (state.workingMemory.steps || 0) + 1;
        if (action.tool) state.workingMemory.coveredTools[action.tool] = true;
        break;

      case 'WM_FALLBACK':
        if (!state.workingMemory) state.workingMemory = { turnId: null, observations: [], plan: [], planIndex: 0, coveredTools: {}, steps: 0, triedFallbacks: {}, askCount: 0 };
        if (action.tool) state.workingMemory.triedFallbacks[action.tool] = true;
        break;

      case 'WM_ASK_COUNT':
        if (!state.workingMemory) state.workingMemory = { turnId: null, observations: [], plan: [], planIndex: 0, coveredTools: {}, steps: 0, triedFallbacks: {}, askCount: 0 };
        state.workingMemory.askCount = (state.workingMemory.askCount || 0) + 1;
        break;

      case 'PLAN_DONE':
        // Keep observations for synthesis, clear after response
        break;

      // ─── v2: Error feedback ────────────────────────────
      case 'TOOL_ERROR':
        if (!state.workingMemory) state.workingMemory = { turnId: null, observations: [], plan: [], planIndex: 0, coveredTools: {}, steps: 0, triedFallbacks: {} };
        state.workingMemory.observations.push({
          tool: action.toolName,
          error: action.error,
          hint: action.hint || null,
          compactError: (action.toolName + ': ' + (action.error || 'unknown error') + (action.hint ? ' — ' + action.hint : '')).slice(0, 150)
        });
        break;

      // ─── v2: Pause/Resume ──────────────────────────────
      case 'RESTORE':
        var d = action.data;
        if (d.session) {
          state.session.id = d.session.id;
          state.session.start = d.session.start;
          state.session.messageCount = d.session.messageCount || 0;
          state.session.sessionCount = d.session.sessionCount || 1;
        }
        if (d.models) {
          state.models.llmConsent = d.models.llmConsent;
        }
        if (d.messages) {
          state.messages = d.messages;
        }
        if (d.ui) {
          state.ui.contextPct = d.ui.contextPct || 18;
        }
        break;

      // ─── v2: Human input ───────────────────────────────
      case 'ASK_USER':
        state.ui.needsHumanInput = true;
        state.ui.humanQuestion = action.question;
        state.ui.humanOptions = action.options || [];
        break;

      case 'USER_RESPONSE':
        state.ui.needsHumanInput = false;
        state.ui.humanQuestion = null;
        state.ui.humanOptions = [];
        // Response handled by router callback
        break;

      case 'RESUME':
        state.ui.needsHumanInput = false;
        state.ui.isProcessing = false;
        break;
    }
  }

  function dispatch(action) {
    reduce(action);
    for (var i = 0; i < listeners.length; i++) listeners[i](state, action);
    // Auto-persist on significant actions
    if (['MESSAGE_ADD','MESSAGE_STREAM_DONE','CLEAR','NEW_SESSION','LLM_CONSENT','RESTORE'].indexOf(action.type) !== -1) {
      persist();
    }
  }

  function subscribe(fn) {
    listeners.push(fn);
    return function() {
      var idx = listeners.indexOf(fn);
      if (idx !== -1) listeners.splice(idx, 1);
    };
  }

  function getState() { return state; }

  // ─── Session management ─────────────────────────────────
  function restore() {
    var sessions = loadSessions();
    if (!sessions.length) return false;

    // Find most recent session that's <30min old
    var recent = null;
    for (var i = sessions.length - 1; i >= 0; i--) {
      if (Date.now() - sessions[i].start < 30 * 60 * 1000) {
        recent = sessions[i];
        break;
      }
    }
    if (recent) {
      dispatch({ type: 'RESTORE', data: recent });
      return true;
    }
    return false;
  }

  function listSessions() {
    return loadSessions();
  }

  function restoreById(sid) {
    var sessions = loadSessions();
    for (var i = 0; i < sessions.length; i++) {
      if (sessions[i].id === sid) {
        dispatch({ type: 'RESTORE', data: sessions[i] });
        return true;
      }
    }
    return false;
  }

  function forgetAll() {
    try { localStorage.removeItem(SESSIONS_KEY); } catch(e) {}
  }

  function getSize() {
    return getStorageSize();
  }

  return {
    getState: getState,
    dispatch: dispatch,
    subscribe: subscribe,
    restore: restore,
    listSessions: listSessions,
    restoreById: restoreById,
    forgetAll: forgetAll,
    getSize: getSize
  };
}

if (typeof self !== 'undefined') self.createStore = createStore;

// store.js v2 — State management with working memory, multi-session persist/restore

var SESSIONS_KEY = 'agent-sessions';
var MAX_SESSIONS = 10;
var MAX_SESSION_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
var MAX_CONTEXT_TOKENS = 1600; // SmolLM2-360M's real window is 2048; ~450 fixed overhead + output headroom
var CONTEXT_BUFFER_TOKENS = 900; // matches the getConversationBuffer() call generation actually uses
var CONTEXT_TOOL_RESULT_CHARS = 500; // matches getGenerationContext's per-result truncation
var CONTEXT_PROMPT_CLAMP_CHARS = 7500; // matches chat-worker.js's context clamp
var CONTEXT_FALLBACK_TAIL_MSGS = 8; // tail window when Orchestrator isn't loaded yet
var CONTEXT_CHARS_PER_TOKEN = 4; // rough chars-per-token estimate used across agents/*.js
var PCT_MAX = 100;

// eslint-disable-next-line max-lines-per-function -- legacy store factory; out of scope for this UI change
function createStore(initial) {
  var state = JSON.parse(JSON.stringify(initial));
  state.summary = state.summary || ''; // rolling session memory (deterministic, persisted)
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
      // Guard: never persist an empty session. During init, LLM_CONSENT is
      // dispatched before any message exists, which would otherwise write a
      // ghost "0 message" session and clutter /sessions. Drop any prior entry
      // for this session id so /clear and /new persist correctly (Run 3 fix).
      if (state.messages.length === 0) {
        var pruned = loadSessions().filter(function(s) { return s.id !== state.session.id; });
        localStorage.setItem(SESSIONS_KEY, JSON.stringify(pruned));
        return;
      }

      var current = {
        id: state.session.id,
        start: state.session.start,
        messageCount: state.session.messageCount,
        sessionCount: state.session.sessionCount,
        firstMessage: state.messages.length > 0 ? firstUserText() : '',
        messages: state.messages.slice(-30),  // keep last 30 messages
        summary: state.summary,
        models: { llmConsent: state.models.llmConsent }
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
      // JSON.stringify(localStorage) is always "{}" (Storage isn't a plain
      // object), so it can't measure usage. Sum each key + value length.
      var total = 0;
      for (var i = 0; i < localStorage.length; i++) {
        var key = localStorage.key(i);
        if (key == null) continue;
        total += key.length + (localStorage.getItem(key) || '').length;
      }
      if (total < 1024) return total + 'B';
      if (total < 1024*1024) return (total/1024).toFixed(1) + 'KB';
      return (total/(1024*1024)).toFixed(1) + 'MB';
    } catch(e) { return '?'; }
  }

  // Conversation buffer chars: mirror the exact bounded window
  // orchestrator.js feeds into generation, so the meter can't drift from
  // what the model actually sees.
  function bufferChars() {
    if (typeof Orchestrator === 'undefined' || !Orchestrator._getConversationBuffer) {
      // Orchestrator not loaded yet (e.g. a store used in isolation) — fall
      // back to a small tail of real messages so the meter still reads sane.
      return tailChars();
    }
    var buf = Orchestrator._getConversationBuffer(CONTEXT_BUFFER_TOKENS);
    var chars = 0;
    for (var i = 0; i < buf.length; i++) chars += buf[i].content.length;
    return chars;
  }

  function tailChars() {
    var chars = 0;
    var start = Math.max(0, state.messages.length - CONTEXT_FALLBACK_TAIL_MSGS);
    for (var i = start; i < state.messages.length; i++) {
      var fm = state.messages[i];
      if (fm.role === 'user' || fm.role === 'agent') chars += (fm.content || '').length;
    }
    return chars;
  }

  // This turn's tool results: same per-result char cap getGenerationContext
  // applies before they reach the model. Walk back only to the user message
  // that opened the current turn.
  function currentTurnToolChars() {
    var chars = 0;
    for (var i = state.messages.length - 1; i >= 0; i--) {
      var tm = state.messages[i];
      if (tm.role === 'user') break;
      if (tm.role !== 'tool') continue;
      var stripped = (tm.content || '').replace(/<[^>]*>/g, ' ');
      chars += Math.min(stripped.length, CONTEXT_TOOL_RESULT_CHARS);
    }
    return chars;
  }

  // Real context window: derive usage from the prompt actually assembled for
  // generation — the bounded conversation buffer + rolling summary + this
  // turn's tool results — never the whole session's raw history. Summing
  // every user/agent message ever sent only grows, so a 10-15 exchange
  // session pinned this at 100% and orchestrator.js refused every later turn
  // even though each prompt sent to the model stays bounded (buffer + summary
  // + results, clamped again in chat-worker.js).
  //
  // This intentionally omits the fixed ~530-char Tools.profileFacts()
  // preamble getGenerationContext() also prepends: it's constant overhead
  // the visitor can't act on, and counting it would leave a permanent
  // nonzero floor after /clear or /new (an empty session should read 0%,
  // matching the pre-existing /clear contract instead of a "why isn't
  // this 0" surprise for a fixed cost we can't reduce anyway). Omitting a
  // roughly constant ~500 chars only ever under-reports the meter by a few
  // points, which never causes a spurious hint or refusal.
  function computeContextPct() {
    var totalChars = bufferChars() + (state.summary || '').length + currentTurnToolChars();
    // Same clamp chat-worker.js applies to the assembled context string.
    if (totalChars > CONTEXT_PROMPT_CLAMP_CHARS) totalChars = CONTEXT_PROMPT_CLAMP_CHARS;
    // ~4 chars per token, estimate against MAX_CONTEXT_TOKENS
    var pct = Math.round(totalChars / CONTEXT_CHARS_PER_TOKEN / MAX_CONTEXT_TOKENS * PCT_MAX);
    return pct > PCT_MAX ? PCT_MAX : (pct < 0 ? 0 : pct);
  }

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: legacy reducer switch; out of scope for this UI change
  // eslint-disable-next-line max-lines-per-function, complexity -- legacy reducer switch; out of scope for this UI change
  function reduce(action) {
    switch (action.type) {

      case 'SESSION_START':
        state.session.id = action.sessionId || ('agent-' + Math.random().toString(36).slice(2, 6));
        state.session.start = Date.now();
        state.session.messageCount = 0;
        state.session.sessionCount = (state.session.sessionCount || 0) + 1;
        state.ui.contextPct = computeContextPct();
        break;

      case 'MODEL_STATUS':
        state.models[action.model + 'Ready'] = action.status === 'ready';
        state.models[action.model + 'Loading'] = action.status === 'loading';
        if (action.status === 'error') state.models[action.model + 'Error'] = action.error;
        if (action.progress !== undefined) state.models.llmDownloadProgress = action.progress;
        if (action.statusText !== undefined) state.models.llmStatusText = action.statusText;
        // On a hard LLM load failure, reset the transient progress/status
        // readouts so the store no longer claims the model is "loading model
        // (wasm)... at 100%" when it actually failed. The renderer (#sModel),
        // /status and the orchestrator's "downloading..." message gate on
        // llmLoading/llmError; model-view.js's SmolLM2 bar and size label read
        // these readouts directly, so the reset shows there.
        if (action.model === 'llm' && action.status === 'error') {
          state.models.llmDownloadProgress = 0;
          state.models.llmStatusText = 'unavailable';
        }
        // Populate capability registry on model ready
        if (!state.models.capabilities) state.models.capabilities = {};
        if (action.status === 'ready') {
          if (action.model === 'needle') state.models.capabilities.classify = true;
          if (action.model === 'needleFc') state.models.capabilities.functionCall = true;
          if (action.model === 'llm') { state.models.capabilities.generate = true; state.models.capabilities.evaluate = true; }
        }
        break;

      case 'MODEL_PROGRESS':
        // Load-step text from a model worker (e.g. Needle's "Loading encoder (52MB)...").
        state.models[action.model + 'StatusText'] = String(action.text || '');
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
        // Count user turns only. A single visitor turn fans out into many
        // internal messages (user echo + plan/think/act/observe/eval react-steps
        // + tool blocks), so counting every MESSAGE_ADD made /session, /status
        // and /sessions report "msgs" ~6× the number of things the visitor
        // actually asked (e.g. 146 "msgs" for 22 real turns). renderer.js
        // isFirstUserAfter reads this as a per-turn counter (messageCount > 1),
        // which is also more correct with user-turn semantics.
        if (action.message.role === 'user') state.session.messageCount++;
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
        state.summary = '';
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
        state.summary = '';
        state.ui.isProcessing = false;
        state.ui.thinkingState = 'idle';
        state.workingMemory = { turnId: null, observations: [], plan: [], planIndex: 0, coveredTools: {}, steps: 0, triedFallbacks: {} };
        // Recompute (like CLEAR does) so the meter reads 0 on the now-empty
        // session instead of the stale pre-/new percentage until the next
        // message add.
        state.ui.contextPct = computeContextPct();
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
        // persist() writes a FLAT session object (id/start/messageCount/… at the
        // top level, not nested under `session`). The old `d.session` guard was
        // therefore always false, so session identity, start, and messageCount
        // were silently dropped on every reload: each refresh minted a new
        // session id (cluttering /sessions with near-duplicate 30-message rows)
        // and reset the counter to 0, so /status + /session under-reported the
        // true message total. Read the flat fields instead (Run 192 fix).
        if (d.id) {
          state.session.id = d.id;
          state.session.start = d.start || state.session.start;
          state.session.messageCount = d.messageCount || 0;
          state.session.sessionCount = d.sessionCount || 1;
        }
        if (d.models) {
          state.models.llmConsent = d.models.llmConsent;
        }
        if (d.messages) {
          state.messages = d.messages;
        }
        if (typeof d.summary === 'string') {
          state.summary = d.summary;
        }
        state.ui.contextPct = computeContextPct();
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

      case 'SUMMARY_UPDATE':
        state.summary = action.summary || '';
        // The rolling summary is part of the bounded prompt (see
        // computeContextPct), so a rebuild changes what the meter should
        // read even though no MESSAGE_ADD fires in between.
        state.ui.contextPct = computeContextPct();
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
    if (['MESSAGE_ADD','MESSAGE_STREAM_DONE','CLEAR','NEW_SESSION','LLM_CONSENT','RESTORE','SUMMARY_UPDATE'].indexOf(action.type) !== -1) {
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
    // Only restore sessions that actually have content. An empty session is
    // persisted during init (LLM_CONSENT fires before the boot sequence checks
    // for a prior session), which would otherwise make a first-time visitor see
    // "restored session" instead of "new local session".
    if (recent && recent.messages && recent.messages.length > 0) {
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
    // Storage is now empty, but state.session.id/state.messages still hold
    // the erased conversation. dispatch() auto-persists on every subsequent
    // MESSAGE_ADD/SUMMARY_UPDATE/etc (below), so without a reset here the
    // visitor's very next message — at ANY message count, not just the %4
    // summary-rebuild boundary — silently wrote everything "forgotten"
    // straight back into storage under the same session id ("Storage freed"
    // followed by a resurrection). Mint a fresh session, the same shape
    // NEW_SESSION uses, so anything persisted from here on is genuinely new.
    // Rendering is append-only (renderer.js), so this does not erase the
    // confirmation message already on screen.
    state.messages = [];
    state.summary = '';
    dispatch({ type: 'SESSION_START' });
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

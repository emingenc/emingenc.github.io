// classifier.js — intent classification, LLM enablement, prompt loading
var Classifier = (function() {
  "use strict";
  var store = null;
  var needleWorker = null;
  var llmWorker = null;
  var promptsCache = {}; // cached prompt templates from /agents/prompts/
  var llmFailedThisSession = false; // stop the re-download loop after a worker crash

  // ─── Needle worker ────────────────────────────────────────
  function initNeedle() {
    store.dispatch({ type: 'MODEL_STATUS', model: 'needle', status: 'loading' });
    try {
      needleWorker = new Worker('/agents/needle-router.js', { type: 'module' });
      needleWorker.onmessage = function(e) {
        var m = e.data;
        if (m.type === 'ready') { store.dispatch({ type: 'MODEL_STATUS', model: 'needle', status: 'ready' }); }
        else if (m.type === 'decoderReady') { store.dispatch({ type: 'MODEL_STATUS', model: 'needleFc', status: 'ready' }); }
        else if (m.type === 'status') { /* progress: silent */ }
        else if (m.type === 'error') { console.warn('[needle]', m.data); store.dispatch({ type: 'MODEL_STATUS', model: 'needle', status: 'error', error: m.data }); }
      };
      needleWorker.onerror = function(e) {
        console.warn('[needle] Worker failed:', e.message);
        store.dispatch({ type: 'MODEL_STATUS', model: 'needle', status: 'error', error: 'Worker load failed: ' + e.message });
      };
      needleWorker.postMessage({ type: 'init' });
    } catch(e) { console.warn('Needle worker failed:', e.message); store.dispatch({ type: 'MODEL_STATUS', model: 'needle', status: 'error', error: e.message }); }
  }

  function classifyWithNeedle(text) {
    return new Promise(function(resolve) {
      if (!store.getState().models.needleReady || !needleWorker) { resolve(null); return; }
      var tid = setTimeout(function() { needleWorker.removeEventListener('message', handler); resolve(null); }, 2000);
      function handler(e) {
        if (e.data.type === 'intent') { clearTimeout(tid); needleWorker.removeEventListener('message', handler); resolve(e.data.data); }
      }
      needleWorker.addEventListener('message', handler);
      needleWorker.postMessage({ type: 'classify', data: { text: text } });
    });
  }

  // v3: Needle classifies → returns {type, label, score, a?}
  function classifyIntent(text) {
    return classifyWithNeedle(text).then(function(result) {
      // result is now {type: 'faq'|'tool'|'chat', label, score, a?}
      // or null if needle timed out
      return result;
    });
  }

  // A fatal worker failure (crash or load failure — never a single bad
  // request) drops the resident worker so the session falls back to reduced
  // mode instead of leaving an orphaned worker that no future turn can reach.
  function dropLLMWorker(reason) {
    console.warn('[chat-worker]', reason);
    store.dispatch({ type: 'MODEL_STATUS', model: 'llm', status: 'error', error: reason });
    if (llmWorker) { try { llmWorker.terminate(); } catch(ignored) { /* already gone — nothing to clean up */ } }
    llmWorker = null; // allow retry on next enableLLM call
    llmFailedThisSession = true; // ...but NOT in this session (avoid 180MB re-download loop)
  }

  // Fatal (crash/load failure — chat-worker.js marks fatal:true) drops the
  // worker; a per-request error (bad generate/evaluate, carries
  // requestId/evalId instead) only fails that turn — the model stays loaded
  // and the next request uses it again.
  function handleLLMWorkerError(payload) {
    if (payload.fatal) { dropLLMWorker(payload.data); return; }
    console.warn('[chat-worker]', payload.data);
  }

  // ─── LLM text generation (SmolLM2-360M in chat-worker.js) ──
  function initDecoder() {
    if (llmWorker) return; // already loading or loaded
    store.dispatch({ type: 'MODEL_STATUS', model: 'llm', status: 'loading' });
    try {
      llmWorker = new Worker('/agents/chat-worker.js', { type: 'module' });
      llmWorker.onmessage = function(e) {
        var m = e.data;
        if (m.type === 'status' && m.data === 'ready') {
          store.dispatch({ type: 'MODEL_STATUS', model: 'llm', status: 'ready' });
        } else if (m.type === 'status') {
          // loading in progress — update status text for renderer
          store.dispatch({ type: 'MODEL_STATUS', model: 'llm', status: 'loading', statusText: m.data });
        } else if (m.type === 'progress') {
          store.dispatch({ type: 'MODEL_STATUS', model: 'llm', status: 'loading', progress: m.pct });
        } else if (m.type === 'error') {
          handleLLMWorkerError(m);
        } else if (m.type === 'token') {
          store.dispatch({ type: 'MESSAGE_STREAM', id: m.requestId, chunk: m.token });
        } else if (m.type === 'done') {
          store.dispatch({ type: 'MESSAGE_STREAM_DONE', id: m.requestId });
          if (typeof Orchestrator !== 'undefined' && Orchestrator._clearGenTimeout) {
            Orchestrator._clearGenTimeout(m.requestId);
          }
          // A successful generation must release the turn lock. The timeout
          // is cleared above, so this is the normal completion path.
          if (typeof Orchestrator !== 'undefined' && Orchestrator._handleGenerationDone && Orchestrator._handleGenerationDone(m.requestId)) {
            return;
          }
          if (typeof Orchestrator !== 'undefined' && Orchestrator.done) {
            Orchestrator.done();
          }
        } else if (m.type === 'evalResult') {
          if (typeof Evaluator !== 'undefined' && Evaluator._handleEvalResult) {
            Evaluator._handleEvalResult(m.evalId, m.data);
          }
        } else if (m.type === 'alignResult') {
          if (typeof AlignmentGate !== 'undefined' && AlignmentGate._handleAlignResult) {
            AlignmentGate._handleAlignResult(m.alignId, m.data);
          }
        }
      };
      llmWorker.onerror = function(e) {
        // Uncaught worker-level failure (e.g. a script error) — same fatal
        // handling as an in-worker crash: drop it, never leave it orphaned.
        dropLLMWorker('Worker failed: ' + e.message);
      };
      llmWorker.postMessage({ type: 'load' });
    } catch(e) {
      dropLLMWorker(e.message);
    }
  }

  function isLLMReady() { return store.getState().models.llmReady; }
  function hasLLMConsent() { return store.getState().models.llmConsent === true; }
  function isLLMConsentPending() { return store.getState().models.llmConsent === null; }

  // ─── Prompt loader (fetches + caches markdown templates) ─────
  function loadPrompt(name) {
    if (promptsCache[name]) return promptsCache[name];
    var url = '/agents/prompts/' + name + '.md';
    try {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', url, false); // sync for simplicity — prompts are tiny
      xhr.send();
      if (xhr.status === 200) {
        promptsCache[name] = xhr.responseText;
        return xhr.responseText;
      }
    } catch(e) { console.warn('[router] Failed to load prompt:', name, e.message); }
    return null;
  }

  function enableLLM() {
    if (llmFailedThisSession) return; // worker crashed — fall back to FAQ, never re-download in-session
    store.dispatch({ type: 'LLM_CONSENT', value: true });
    initDecoder(); // SmolLM2-360M text generation (chat-worker)
    // Also init Needle decoder for function-calling classification
    if (needleWorker && store.getState().models.needleReady) {
      needleWorker.postMessage({ type: 'initDecoder' });
    }
  }

  function autoEnableLLM() {
    // Auto-enable on-device AI by default — no opt-in needed. Note: this does
    // NOT read a stored consent value; it always enables (consent persistence
    // via the 'llm-consent' key is vestigial and never read back).
    store.dispatch({ type: 'LLM_CONSENT', value: true });
    initDecoder();
  }

  function resetLLMConsent() {
    try { localStorage.removeItem('llm-consent'); } catch(e) {}
    store.dispatch({ type: 'LLM_CONSENT', value: null });
  }

  function _getLLMWorker() { return llmWorker; }

  function init(_store) { store = _store; initNeedle(); autoEnableLLM(); }

  return {
    init: init,
    classify: classifyWithNeedle,
    classifyIntent: classifyIntent,
    enableLLM: enableLLM,
    isLLMReady: isLLMReady,
    hasLLMConsent: hasLLMConsent,
    isLLMConsentPending: isLLMConsentPending,
    resetLLMConsent: resetLLMConsent,
    loadPrompt: loadPrompt,
    _getLLMWorker: _getLLMWorker
  };
})();

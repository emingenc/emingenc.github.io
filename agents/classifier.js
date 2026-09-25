// classifier.js — intent classification, LLM enablement, prompt loading
// eslint-disable-next-line max-lines-per-function -- legacy module wrapper (IIFE); out of scope for this UI change
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
      needleWorker.onmessage = function(event) {
        var msg = event.data;
        if (msg.type === 'ready') { store.dispatch({ type: 'MODEL_STATUS', model: 'needle', status: 'ready' }); }
        else if (msg.type === 'decoderReady') { store.dispatch({ type: 'MODEL_STATUS', model: 'needleFc', status: 'ready' }); }
        else if (msg.type === 'status') { store.dispatch({ type: 'MODEL_PROGRESS', model: 'needle', text: msg.data }); }
        else if (msg.type === 'error') { console.warn('[needle]', msg.data); store.dispatch({ type: 'MODEL_STATUS', model: 'needle', status: 'error', error: msg.data }); }
      };
      needleWorker.onerror = function(event) {
        console.warn('[needle] Worker failed:', event.message);
        store.dispatch({ type: 'MODEL_STATUS', model: 'needle', status: 'error', error: 'Worker load failed: ' + event.message });
      };
      needleWorker.postMessage({ type: 'init' });
    } catch(err) { console.warn('Needle worker failed:', err.message); store.dispatch({ type: 'MODEL_STATUS', model: 'needle', status: 'error', error: err.message }); }
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
    llmFailedThisSession = true; // ...but NOT in this session (avoid a 272-363MB re-download loop)
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
  // eslint-disable-next-line max-lines-per-function -- legacy worker setup; refactoring it is out of scope for this UI change
  function initDecoder() {
    if (llmWorker) return; // already loading or loaded
    store.dispatch({ type: 'MODEL_STATUS', model: 'llm', status: 'loading' });
    try {
      llmWorker = new Worker('/agents/chat-worker.js', { type: 'module' });
      // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: legacy message switch; refactoring it is out of scope for this UI change
      llmWorker.onmessage = function(event) { // eslint-disable-line max-lines-per-function, complexity -- legacy message switch, see above
        var msg = event.data;
        if (msg.type === 'status' && msg.data === 'ready') {
          store.dispatch({ type: 'MODEL_STATUS', model: 'llm', status: 'ready' });
        } else if (msg.type === 'status') {
          // loading in progress — update status text for renderer
          store.dispatch({ type: 'MODEL_STATUS', model: 'llm', status: 'loading', statusText: msg.data });
        } else if (msg.type === 'progress') {
          store.dispatch({ type: 'MODEL_STATUS', model: 'llm', status: 'loading', progress: msg.pct });
        } else if (msg.type === 'error') {
          handleLLMWorkerError(msg);
        } else if (msg.type === 'token') {
          store.dispatch({ type: 'MESSAGE_STREAM', id: msg.requestId, chunk: msg.token });
        } else if (msg.type === 'done') {
          store.dispatch({ type: 'MESSAGE_STREAM_DONE', id: msg.requestId });
          if (typeof Orchestrator !== 'undefined' && Orchestrator._clearGenTimeout) {
            Orchestrator._clearGenTimeout(msg.requestId);
          }
          // A successful generation must release the turn lock. The timeout
          // is cleared above, so this is the normal completion path.
          if (typeof Orchestrator !== 'undefined' && Orchestrator._handleGenerationDone) {
            Orchestrator._handleGenerationDone(msg.requestId);
          }
        } else if (msg.type === 'evalResult') {
          if (typeof Evaluator !== 'undefined' && Evaluator._handleEvalResult) {
            Evaluator._handleEvalResult(msg.evalId, msg.data);
          }
        } else if (msg.type === 'alignResult') {
          if (typeof AlignmentGate !== 'undefined' && AlignmentGate._handleAlignResult) {
            AlignmentGate._handleAlignResult(msg.alignId, msg.data);
          }
        }
      };
      llmWorker.onerror = function(event) {
        // Uncaught worker-level failure (e.g. a script error) — same fatal
        // handling as an in-worker crash: drop it, never leave it orphaned.
        dropLLMWorker('Worker failed: ' + event.message);
      };
      llmWorker.postMessage({ type: 'load' });
    } catch(err) {
      dropLLMWorker(err.message);
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

// model-policy.js — which on-device model may download without being asked,
// and the size of the one that asks. Pure decisions over a plain environment
// record; the browser reads it in readEnvironment() and hasAdapter().
// Needle (the question matcher) starts by itself on a fast desktop, else at
// the first tap. SmolLM2 (the chat model) starts by itself only on a fast
// desktop with a WebGPU adapter, else behind one button.
'use strict';

var ModelPolicy;

{
  const MIN_AUTO_MEMORY_GB = 4;
  const ADAPTER_TIMEOUT_MS = 2000;
  const UNMETERED_TYPES = ['wifi', 'ethernet'];

  // MB on the wire, cold cache. tests/label-bytes.test.mjs holds the sums of
  // the measured files; re-measure after a change to a model or the runtime.
  const CHAT_MB = { webgpu: 278, wasm: 369 };

  // An unknown value is false or empty, never a guess.
  function readEnvironment() {
    const connection = navigator.connection || {};
    return {
      finePointer: window.matchMedia('(pointer: fine)').matches,
      saveData: connection.saveData === true,
      connectionType: connection.type || '',
      effectiveType: connection.effectiveType || '',
      deviceMemory: navigator.deviceMemory || 0,
    };
  }

  // 'gpu' in navigator is true with no adapter, and a load there downloads the
  // WebGPU weights, fails, then the WASM ones: ask, with a deadline.
  function hasAdapter() {
    if (!navigator.gpu) return Promise.resolve(false);
    const none = new Promise((resolve) => setTimeout(() => resolve(null), ADAPTER_TIMEOUT_MS));
    return Promise.race([navigator.gpu.requestAdapter(), none]).then(Boolean, () => false);
  }

  function isMetered(env) {
    return env.saveData || env.connectionType === 'cellular' || (env.effectiveType !== '' && env.effectiveType !== '4g');
  }

  // A touch device that does not say it is on wifi may be on mobile data.
  function routerStart(env) {
    if (isMetered(env)) return 'on-focus';
    return env.finePointer || UNMETERED_TYPES.includes(env.connectionType) ? 'auto' : 'on-focus';
  }

  function chatPlan(env, adapter) {
    const device = adapter ? 'webgpu' : 'wasm';
    const memoryOk = env.deviceMemory === 0 || env.deviceMemory >= MIN_AUTO_MEMORY_GB;
    const fast = env.finePointer && !isMetered(env) && memoryOk && adapter;
    return { start: fast ? 'auto' : 'ask', device, megabytes: CHAT_MB[device] };
  }

  ModelPolicy = { readEnvironment, hasAdapter, routerStart, chatPlan, CHAT_MB };
}

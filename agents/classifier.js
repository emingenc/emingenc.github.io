// classifier.js — the page's two on-device models, each behind its own
// worker: Needle (needle-router.js) classifies a question's intent, and
// SmolLM2-360M (chat-worker.js) generates, evaluates and aligns. Every
// request carries an id and settles once, on whichever comes first: the
// reply that echoes its id, its caller's abort (which also cancels it in the
// worker), the chat worker's end, or (for classify) its own timeout. A reply
// that finds no request waiting, late after Stop or a timeout, is dropped,
// so it never reaches a later turn or the store.
// Each model's download reaches the store as bytes, and a failed one can be
// started again with retry().
'use strict';

var Classifier;

{
  const CLASSIFY_TIMEOUT_MS = 2000;
  const NEEDLE_URL = '/agents/needle-router.js';
  const CHAT_URL = '/agents/chat-worker.js';
  const BYTES_PER_MB = 1e6;
  const PERCENT = 100;
  // The weights are the bulk of the label's figure; the rest (runtime,
  // tokenizer) arrives untallied, so a bar never claims 100% before 'ready'.
  const MAX_BEFORE_READY = 0.99;

  let store = null;
  let needleWorker = null;
  let routerStarted = false;
  let llmWorker = null;
  // A crash or load failure ends the chat model for the session: enabling it
  // again would re-download it in a loop, so the page stays on its FAQ and
  // canned answers instead.
  let llmFailedThisSession = false;
  // The backend whose weights are downloading; the chat line's total is its
  // size, and a switch to WASM starts the line again from 0.
  let chatDevice = 'webgpu';
  let planKnown = false;
  let persistAsked = false;
  // id -> {resolve, signal, onAbort, timer?, onToken?, error?, whenDropped} for
  // each request a reply may still settle.
  const pending = new Map();
  const seamCounters = { cls: 0, eval: 0, align: 0 };

  function modelStatus(model, status, detail) {
    store.dispatch({ type: 'MODEL_STATUS', model, status, ...detail });
  }

  // ─── Needle: intent classification ─────────────────────────────────────
  const NEEDLE_LIFECYCLE = {
    ready: () => {
      modelStatus('needle', 'ready');
      keepDownloads();
    },
    status: (msg) => store.dispatch({ type: 'MODEL_PROGRESS', model: 'needle', text: msg.data }),
    progress: (msg) => modelStatus('needle', 'loading', { phase: msg.phase, bytes: { loaded: msg.loaded, total: msg.total } }),
    error: (msg) => needleFailed(msg.data, msg),
  };

  function startRouter() {
    if (routerStarted || !store) return;
    routerStarted = true;
    modelStatus('needle', 'loading', { bytes: null });
    try {
      needleWorker = new Worker(NEEDLE_URL, { type: 'module' });
      needleWorker.onmessage = (event) => NEEDLE_LIFECYCLE[event.data.type]?.(event.data);
      needleWorker.onerror = (event) => needleFailed(`Worker load failed: ${event.message}`);
      needleWorker.postMessage({ type: 'init' });
    } catch (err) {
      needleFailed(err.message);
    }
  }

  // detail carries the step and bytes it stopped at, for the status line.
  function needleFailed(error, detail = {}) {
    console.warn('[needle]', error);
    const bytes = detail.total ? { loaded: detail.loaded, total: detail.total } : undefined;
    modelStatus('needle', 'error', { error, phase: detail.phase, bytes });
  }

  // Resolves Needle's {type, label, score, a?}, or null when Needle is not
  // ready or does not answer in time. Only the reply echoing this call's id
  // settles it: after Stop and a fresh question inside the timeout, a late
  // reply for the old question must not route the new one.
  function classify(text) {
    if (!store.getState().models.needleReady || !needleWorker) return Promise.resolve(null);
    const worker = needleWorker;
    const id = seamId('cls');
    return new Promise((resolve) => {
      const timer = setTimeout(() => settle(null), CLASSIFY_TIMEOUT_MS);
      const onReply = (event) => {
        if (event.data.type === 'intent' && event.data.id === id) settle(event.data.data);
      };
      function settle(intent) {
        clearTimeout(timer);
        worker.removeEventListener('message', onReply);
        resolve(intent);
      }
      worker.addEventListener('message', onReply);
      worker.postMessage({ type: 'classify', id, data: { text } });
    });
  }

  // ─── SmolLM2: the chat worker's lifecycle ──────────────────────────────
  // chat-worker.js says 'ready' once the model can answer; any other status,
  // 'ready (webgpu)' included, names a loading step. A per-request error
  // carries its request's id and fails only that request, so the model stays
  // loaded for the next one; a crash or load failure is marked fatal:true
  // and drops it.
  const CHAT_LIFECYCLE = {
    status: (msg) => (msg.data === 'ready' ? chatReady() : modelStatus('llm', 'loading', { statusText: msg.data })),
    progress: (msg) => chatProgress(msg.loaded),
    fallback: () => switchToWasm(),
    restart: (msg) => restartChatWorker(msg),
    error: (msg) => (msg.fatal ? dropLLMWorker(msg.data) : console.warn('[chat-worker]', msg.data)),
  };

  // The downloading backend's size is the total; bytes fetched count up to it
  // and no further until the worker says 'ready'.
  function chatProgress(loaded) {
    const total = ModelPolicy.CHAT_MB[chatDevice] * BYTES_PER_MB;
    const sofar = Math.min(loaded, Math.floor(total * MAX_BEFORE_READY));
    const progress = total ? Math.floor((sofar / total) * PERCENT) : 0;
    modelStatus('llm', 'loading', { progress, bytes: { loaded: sofar, total } });
  }

  // WebGPU failed: the WASM weights are a download of their own, so the line
  // says so and counts them from 0 against their own size.
  function switchToWasm() {
    chatDevice = 'wasm';
    modelStatus('llm', 'loading', { phase: 'switched to WASM', bytes: null });
  }

  // The worker's model did not start: end it, since its pipeline may hang
  // for good, and load again on WASM in a fresh worker.
  function restartChatWorker(msg) {
    console.warn('[chat-worker]', msg.data);
    llmWorker.terminate();
    llmWorker = null;
    switchToWasm();
    initChatWorker();
  }

  function initChatWorker() {
    if (llmWorker) return; // already loading or loaded
    modelStatus('llm', 'loading', { bytes: null });
    try {
      llmWorker = new Worker(CHAT_URL, { type: 'module' });
      llmWorker.onmessage = (event) => onChatReply(event.data);
      // A worker-level failure (a script error, say) is as fatal as a crash
      // reported from inside the worker.
      llmWorker.onerror = (event) => dropLLMWorker(`Worker failed: ${event.message}`);
      llmWorker.postMessage({ type: 'load', device: chatDevice });
    } catch (err) {
      dropLLMWorker(err.message);
    }
  }

  function chatReady() {
    modelStatus('llm', 'ready');
    keepDownloads();
  }

  // A reply for a request still waiting settles it; otherwise only the
  // worker's lifecycle messages mean anything. A token, done or verdict for
  // a request already settled or dropped falls through both and is ignored.
  function onChatReply(msg) {
    if (routeReply(msg)) return;
    CHAT_LIFECYCLE[msg.type]?.(msg);
  }

  // Drops the resident worker rather than leave one no future turn can
  // reach; the requests waiting on it end now, not on their callers' timeouts.
  function dropLLMWorker(reason) {
    console.warn('[chat-worker]', reason);
    modelStatus('llm', 'error', { error: reason });
    if (llmWorker) llmWorker.terminate();
    llmWorker = null;
    llmFailedThisSession = true;
    for (const [id, entry] of [...pending]) settleRequest(id, entry.whenDropped(reason));
  }

  // ─── Keeping and retrying downloads ─────────────────────────────────────
  // Once a model is in, ask the browser not to evict its cached files. Chrome
  // decides without a prompt; Firefox prompts, so only after the visitor has
  // used the page: on a model's 'ready', or on the first tap or key after it.
  function keepDownloads() {
    const { storage, userActivation } = globalThis.navigator || {};
    const { needleReady, llmReady } = store.getState().models;
    if (persistAsked || !(needleReady || llmReady) || !storage?.persist || !userActivation?.hasBeenActive) return;
    persistAsked = true;
    storage.persist().catch(() => {});
  }

  // The button on a failed model's status line: one more attempt, from the
  // files the browser kept.
  function retry(model) {
    if (!store) return;
    if (model === 'needle') {
      if (needleWorker) needleWorker.terminate();
      needleWorker = null;
      routerStarted = false;
      startRouter();
      return;
    }
    llmFailedThisSession = false;
    enableLLM();
  }

  // ─── The model-request seam ────────────────────────────────────────────
  // A generation keeps its caller's id, which is already the id of the
  // message it streams into; classify, evaluate and align number their own.
  function seamId(prefix) {
    seamCounters[prefix] += 1;
    return `${prefix}_${seamCounters[prefix]}`;
  }

  // Tracks a request until a reply, the caller's abort or the worker's end
  // settles it, whichever comes first; the others then find nothing left to
  // settle. An abort cancels it in the worker too. False means the signal
  // had already fired, so the caller must not post.
  function trackRequest(id, signal, entry) {
    if (signal.aborted) {
      entry.resolve(null);
      return false;
    }
    const onAbort = () => {
      cancelInWorker(id);
      settleRequest(id, null);
    };
    const timer = entry.budgetMs && setTimeout(() => cancelInWorker(id), entry.budgetMs);
    pending.set(id, { ...entry, signal, onAbort, timer });
    signal.addEventListener('abort', onAbort);
    return true;
  }

  function cancelInWorker(id) {
    llmWorker?.postMessage({ type: 'cancel', id });
  }

  function settleRequest(id, value) {
    const entry = pending.get(id);
    if (!entry) return;
    pending.delete(id);
    clearTimeout(entry.timer);
    entry.signal.removeEventListener('abort', entry.onAbort);
    entry.resolve(value);
  }

  // evalResult and alignResult carry their own id; a generation's token,
  // error and done all carry the requestId its caller chose.
  function replyIdFor(msg) {
    if (msg.type === 'evalResult') return msg.evalId;
    if (msg.type === 'alignResult') return msg.alignId;
    return msg.requestId;
  }

  function routeReply(msg) {
    const id = replyIdFor(msg);
    const entry = pending.get(id);
    if (!entry) return false;
    deliver(id, entry, msg);
    return true;
  }

  // A generation's error is held for its done, which always follows it;
  // evalResult and alignResult settle with their data.
  function deliver(id, entry, msg) {
    if (msg.type === 'token') entry.onToken(msg.token);
    else if (msg.type === 'error') entry.error = msg.data;
    else if (msg.type === 'done') settleRequest(id, entry.error ? { error: entry.error } : {});
    else settleRequest(id, msg.data);
  }

  // generate, evaluate and align return null outright with no worker to
  // ask, and resolve null the moment their signal fires, or at once if it
  // already has.
  function generate(text, context, { id, signal, onToken }) {
    if (!llmWorker) return null;
    return new Promise((resolve) => {
      if (trackRequest(id, signal, { resolve, onToken, whenDropped: (reason) => ({ error: reason }) })) llmWorker.postMessage({ type: 'generate', text, context, requestId: id });
    });
  }

  // What a verdict settles with when the worker ends under it: the answers
  // chat-worker.js gives when it has no model.
  const EVALUATION_UNAVAILABLE = () => ({ stop: true, summary: null, confidence: 50, next: '', checked: false });
  const ALIGNMENT_UNAVAILABLE = () => ({ inScope: false, suggestedTool: 'out_of_scope', confidence: 0, reason: 'model unavailable' });

  function evaluate(request, { signal }) {
    return requestVerdict('eval', signal, Evaluator.EVAL_TIMEOUT_MS, EVALUATION_UNAVAILABLE, (evalId) => ({
      type: 'evaluate',
      question: request.question,
      results: (request.results || []).map(toEvaluatedResult),
      evalId,
      context: request.context,
      compactErrors: request.compactErrors,
    }));
  }

  function toEvaluatedResult(result) {
    return { toolName: result.toolName || 'tool', content: result.content || '' };
  }

  function align(request, { signal }) {
    return requestVerdict('align', signal, AlignmentGate.ALIGN_TIMEOUT_MS, ALIGNMENT_UNAVAILABLE, (alignId) => ({
      type: 'align',
      alignId,
      text: request.text,
      intent: { label: request.intent?.label || 'faq' },
      toolScopes: request.toolScopes,
    }));
  }

  function requestVerdict(prefix, signal, budgetMs, whenDropped, messageFor) {
    if (!llmWorker) return null;
    const id = seamId(prefix);
    return new Promise((resolve) => {
      if (trackRequest(id, signal, { resolve, whenDropped, budgetMs })) llmWorker.postMessage(messageFor(id));
    });
  }

  // ─── The chat model's policy and readiness ──────────────────────────────
  function isLLMReady() { return store.getState().models.llmReady; }
  function llmPolicy() { return store.getState().models.llmPolicy; }

  // The button, or a reply that finds the model neither ready nor loading.
  // Returns 'failed' (after a crash: no second download), 'running' (already
  // on), 'resumed' (a declined model's worker back on) or 'started'. Before
  // the adapter probe answers, the start waits for it.
  function enableLLM() {
    if (llmFailedThisSession) return 'failed';
    if (llmWorker && llmPolicy() === 'auto') return 'running';
    store.dispatch({ type: 'LLM_POLICY', value: 'auto' });
    if (llmWorker) return 'resumed';
    if (planKnown) initChatWorker();
    return 'started';
  }

  // Returns false when the chat model was already off.
  function declineLLM() {
    if (llmPolicy() === 'off') return false;
    store.dispatch({ type: 'LLM_POLICY', value: 'off' });
    return true;
  }

  // 0 until the adapter probe answers.
  function chatMegabytes() {
    return store.getState().models.llmDownloadMB || 0;
  }

  // An answer the visitor gave while the probe ran stands.
  function applyChatPlan(plan) {
    chatDevice = plan.device;
    planKnown = true;
    const value = llmPolicy() === 'ask' ? plan.start : llmPolicy();
    store.dispatch({ type: 'LLM_POLICY', value, megabytes: plan.megabytes });
    if (value === 'auto') initChatWorker();
  }

  // Until the probe answers the chat model is behind its button. Environment
  // and adapter are parameters so a test states them outright.
  function init(nextStore, { environment = ModelPolicy.readEnvironment(), adapter = ModelPolicy.hasAdapter() } = {}) {
    store = nextStore;
    store.dispatch({ type: 'LLM_POLICY', value: 'ask' });
    ['pointerup', 'keydown'].forEach((type) => globalThis.addEventListener?.(type, keepDownloads));
    if (ModelPolicy.routerStart(environment) === 'auto') startRouter();
    return Promise.resolve(adapter).then((found) => applyChatPlan(ModelPolicy.chatPlan(environment, found)));
  }

  Classifier = { init, startRouter, classify, generate, evaluate, align, enableLLM, declineLLM, retry, chatMegabytes, isLLMReady, llmPolicy };
}

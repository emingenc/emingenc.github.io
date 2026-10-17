// chat-worker.js — SmolLM2-360M chat completion via Transformers.js v4
//
// Handles:
//   load     → {device?} download model from HuggingFace (cached after first visit)
//               Tries WebGPU first, falls back to WASM on timeout/failure;
//               device 'wasm' skips WebGPU (the page found no adapter)
//   generate → {text, requestId, systemPrompt?} → streaming tokens → token/done/error
//   evaluate → {question, results, evalId, context, compactErrors} → evalResult
//   align    → {text, alignId, intent, toolScopes} → alignResult
//   cancel   → {id} the page gave up on that request: it is skipped if it has not
//               started, or its generation is interrupted and its reply never posted
//
// Uses Transformers.js v4 from jsDelivr CDN (cached by browser after first load).
// Model: onnx-community/SmolLM2-360M-Instruct-ONNX (q4f16 on WebGPU, q8 on WASM; sizes in model-policy.js; cached in browser).

import { pipeline, InterruptableStoppingCriteria } from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.2.0/dist/transformers.min.js';
import { createTally, createLoadTimer } from './download-tally.js';

// The download may pause this long between files and chunks; the model then
// has the second figure, per backend, to start once every file is in.
const STALL_MS = 60000;
const INIT_MS = { webgpu: 45000, wasm: 90000 };
const MS_PER_S = 1000;
const MODEL_ID = 'onnx-community/SmolLM2-360M-Instruct-ONNX';
// Prompt context kept per generation: ~1.7k tokens, SmolLM2's real window is 2048.
const CONTEXT_CHARS = 7500;
const ALIGN_TOKENS = 100;
const ALIGN_TEMPERATURE = 0.1;
const GENERATE_TOKENS = 80;
const GENERATE_TEMPERATURE = 0.35;
const EVAL_TOKENS = 150;
const EVAL_TEMPERATURE = 0.3;
const NEUTRAL_CONFIDENCE = 50;

let pipe = null;
let systemPrompt = '';
let evalPromptTemplate = '';
let generatePromptTemplate = '';
let alignPromptTemplate = '';

// ─── Prompt builders ───────────────────────────────────────

function buildChatPrompt(userText, sysPrompt) {
  var sp = sysPrompt || systemPrompt || 'You are Emin\'s portfolio assistant. Keep answers short, friendly, and helpful.';
  return '<|im_start|>system\n' + sp + '\n<|im_end|>\n<|im_start|>user\n' + userText + '\n<|im_end|>\n<|im_start|>assistant\n';
}

// Wrap a filled prompt template in the SmolLM2-Instruct chat template.
// SmolLM2-360M-Instruct expects <|im_start|>/<|im_end|> role framing; without it
// generation/alignment quality degrades. evaluate was already wrapped; this
// makes generate and align consistent.
function wrapChat(content) {
  var sp = systemPrompt || 'You are Emin\'s portfolio assistant. Keep answers short, friendly, and helpful.';
  return '<|im_start|>system\n' + sp + '\n<|im_end|>\n<|im_start|>user\n' + content + '\n<|im_end|>\n<|im_start|>assistant\n';
}

function buildAlignPrompt(question, intent, toolScopes) {
  var tmpl = alignPromptTemplate || 'Decide if this portfolio query is in scope. Return JSON only: {"inScope":true/false,"suggestedTool":"","confidence":0,"reason":""}\nQuestion: {{question}}\nNeedle proposal: {{intent}}\nTool scopes: {{toolScopes}}';
  return wrapChat(tmpl.replace(/\{\{question\}\}/g, question || '')
    .replace(/\{\{intent\}\}/g, intent || '')
    .replace(/\{\{toolScopes\}\}/g, toolScopes || ''));
}

function buildGeneratePrompt(question, context) {
  if (!generatePromptTemplate) return buildChatPrompt(question);
  return wrapChat(generatePromptTemplate
    .replace(/\{\{question\}\}/g, question || '')
    .replace(/\{\{context\}\}/g, context || ''));
}

function buildEvalPrompt(question, results, context, errors) {
  var tmpl = evalPromptTemplate;
  if (!tmpl) {
    tmpl = '<|im_start|>system\nYou evaluate whether a tool response answers the user\'s question. Return ONLY valid JSON: {"stop":true/false,"summary":"brief summary","confidence":0-100,"nextTool":"ask_user|faq|chat|stop|","next":""}\n<|im_end|>\n<|im_start|>user\nQuestion: {{question}}\nResults: {{results}}\nContext: {{context}}\nErrors: {{errors}}\n\nEvaluate now. Return JSON only.\n<|im_end|>\n<|im_start|>assistant\n';
  }
  var resultsStr = '';
  if (Array.isArray(results)) {
    resultsStr = results.map(function(r) {
      var c = (r.content || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 200);
      return (r.toolName || 'tool') + ': ' + c;
    }).join(' | ');
  }
  var contextStr = '';
  if (Array.isArray(context)) {
    contextStr = context.map(function(c) {
      return c.role + ': ' + (c.content || '').slice(0, 100);
    }).join(' | ');
  }
  var errorsStr = Array.isArray(errors) ? errors.join(' | ') : '';

  return tmpl
    .replace(/\{\{question\}\}/g, question || '')
    .replace(/\{\{results\}\}/g, resultsStr)
    .replace(/\{\{context\}\}/g, contextStr)
    .replace(/\{\{errors\}\}/g, errorsStr);
}

// ─── JSON parser (tolerant of markdown fences + extra text) ─

function parseJSON(text) {
  try { return JSON.parse(text.trim()); } catch(e) {}
  var fence = text.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
  if (fence) { try { return JSON.parse(fence[1].trim()); } catch(e) {} }
  var s = text.indexOf('{'), e2 = text.lastIndexOf('}');
  if (s !== -1 && e2 > s) { try { return JSON.parse(text.slice(s, e2 + 1)); } catch(e) {} }
  return null;
}

// ─── Helpers ───────────────────────────────────────────────

function stripEnd(text) {
  var idx = text.indexOf('<|im_end|>');
  return idx !== -1 ? text.slice(0, idx).trim() : text.trim();
}

// The verdict for an evaluation that gave none: stop, with no summary and a
// confidence under the page's accept line, so the page answers from the files.
// checked:false tells the page no check took place.
function noVerdict() {
  return { stop: true, summary: null, confidence: NEUTRAL_CONFIDENCE, next: '', checked: false };
}

// ─── One run at a time, and a way to stop it ───────────────
// The model runs one request at a time: a new request waits for the one
// Stop interrupted, instead of starting beside it. `live` holds each request
// from the moment it arrives until it ends.

var live = new Map(); // id -> {stopper, cancelled}
var lane = Promise.resolve();

function runOnModel(id, work) {
  var request = { stopper: new InterruptableStoppingCriteria(), cancelled: false };
  live.set(id, request);
  var run = lane.then(function() { return request.cancelled ? null : work(request); })
    .finally(function() { live.delete(id); });
  lane = run.catch(function() {});
  return run;
}

function cancelRequest(id) {
  var request = live.get(id);
  if (!request) return;
  request.cancelled = true;
  request.stopper.interrupt();
}

// ─── Load pipeline ─────────────────────────────────────────

function timeoutError(kind, device) {
  var message = kind === 'stall'
    ? 'no data for ' + (STALL_MS / MS_PER_S) + ' s while downloading on ' + device
    : 'model did not start within ' + (INIT_MS[device] / MS_PER_S) + ' s on ' + device;
  return Object.assign(new Error(message), { kind: kind });
}

// Posts the bytes fetched so far and keeps the load timer in step: the stall
// clock while files arrive, the start clock once every file is in.
function trackProgress(tally, timer) {
  return function(event) {
    if (!event || !event.file) return;
    if (event.status === 'progress') tally.set(event.file, event.loaded, event.total);
    else if (event.status === 'done') tally.done(event.file);
    else return;
    self.postMessage({ type: 'progress', loaded: tally.bytes() });
    if (tally.complete()) timer.starting(); else timer.downloading();
  };
}

// q4f16 quantization is WebGPU-only. The WASM fallback must use a
// WASM-compatible dtype (q8 → model_quantized.onnx), otherwise the
// "fallback" re-attempts WebGPU and fails with "no available backend",
// leaving the model permanently unavailable on any browser without WebGPU.
function pipelineOptions(device, onProgress) {
  return { dtype: device === 'wasm' ? 'q8' : 'q4f16', device: device, progress_callback: onProgress };
}

// One attempt on one backend. It rejects with .kind 'stall' (no data for
// STALL_MS) or 'init' (every file is in and the model did not start in time);
// the start clock runs only after the download. Its progress counts this
// backend's bytes alone, from 0.
function loadPipeline(device) {
  var tally = createTally();
  self.postMessage({ type: 'progress', loaded: 0 });
  return new Promise(function(resolve, reject) {
    var timer = createLoadTimer(function(kind) { reject(timeoutError(kind, device)); }, { stallMs: STALL_MS, initMs: INIT_MS[device] });
    timer.downloading();
    pipeline('text-generation', MODEL_ID, pipelineOptions(device, trackProgress(tally, timer))).then(function(model) {
      timer.stop();
      resolve(model);
    }, function(error) {
      timer.stop();
      reject(error);
    });
  });
}

// {model} or {error}: a failed attempt is a result, so the caller picks the next step.
async function tryBackend(device) {
  self.postMessage({ type: 'status', data: 'loading model (' + device + ')...' });
  try {
    return { model: await loadPipeline(device) };
  } catch(error) {
    return { error: error };
  }
}

function reportLoadFailure(error) {
  self.postMessage({ type: 'error', data: 'LLM load failed: ' + (error ? error.message : 'All backends exhausted'), fatal: true });
}

// What a failed WebGPU attempt means. A stalled download stops here: WASM
// would stall on the same network. A model that never started leaves a hung
// pipeline in this worker, so the page ends the worker and starts a fresh one
// on WASM. Any other failure goes on to WASM here. True when the load is over.
function webgpuFailureEndsLoad(error) {
  if (error.kind === 'stall') {
    reportLoadFailure(error);
    return true;
  }
  if (error.kind === 'init') {
    self.postMessage({ type: 'restart', device: 'wasm', data: error.message });
    return true;
  }
  self.postMessage({ type: 'fallback', device: 'wasm' });
  self.postMessage({ type: 'status', data: 'webgpu failed, trying wasm...' });
  console.warn('[chat-worker] WebGPU failed:', error.message, '- falling back to WASM');
  return false;
}

function announceReady(device) {
  self.postMessage({ type: 'status', data: 'ready (' + device + ')' });
  self.postMessage({ type: 'status', data: 'ready' });
}

// Try WebGPU first (fast), fall back to WASM (compatible). Device 'wasm' skips
// WebGPU: that attempt would download the WebGPU weights before failing.
async function loadModel(device) {
  if (device !== 'wasm') {
    var gpu = await tryBackend('webgpu');
    if (gpu.model) {
      pipe = gpu.model;
      return announceReady('webgpu');
    }
    if (webgpuFailureEndsLoad(gpu.error)) return;
  }
  var wasm = await tryBackend('wasm');
  if (wasm.model) {
    pipe = wasm.model;
    return announceReady('wasm');
  }
  console.warn('[chat-worker] WASM also failed:', wasm.error.message);
  reportLoadFailure(wasm.error);
}

// ─── Uncaught-error safety net ──────────────────────────────
// Surface uncaught worker errors as structured messages so the main thread
// never hangs waiting for a response that never arrives (e.g. a future
// regression or a synchronous throw in the handler before a try/catch).
// fatal:true marks errors that mean the resident model/worker is gone (crash,
// load failure) — as opposed to a single bad generate/evaluate request, which
// carries its own requestId/evalId instead and must not disable the model.
self.onerror = function(err) {
  self.postMessage({ type: 'error', data: 'Worker crashed: ' + (err.message || err.filename || String(err)), fatal: true });
};
self.onmessageerror = function() {
  self.postMessage({ type: 'error', data: 'Worker received an unserializable message', fatal: true });
};

// ─── Prompts ───────────────────────────────────────────────

async function fetchText(path) {
  try {
    var response = await fetch(path);
    if (response.ok) return (await response.text()).trim();
  } catch(_) { /* use default */ }
  return '';
}

// Each prompt file replaces its built-in default when it loads.
async function loadPrompts() {
  var system = await fetchText('/agents/prompts/system.md');
  if (system) systemPrompt = system;
  var evaluate = await fetchText('/agents/prompts/evaluate.md');
  if (evaluate) {
    evalPromptTemplate = '<|im_start|>system\n' + evaluate +
      '\n<|im_end|>\n<|im_start|>user\nQuestion: {{question}}\nResults: {{results}}\nContext: {{context}}\nErrors: {{errors}}\n\nEvaluate now. Return JSON only.\n<|im_end|>\n<|im_start|>assistant\n';
  }
  generatePromptTemplate = await fetchText('/agents/prompts/generate.md');
  alignPromptTemplate = await fetchText('/agents/prompts/align.md');
}

// ─── Message handlers ──────────────────────────────────────

async function handleLoad(msg) {
  try {
    self.postMessage({ type: 'status', data: 'loading prompts...' });
    await loadPrompts();
    await loadModel(msg.device);
  } catch(error) {
    self.postMessage({ type: 'error', data: 'LLM load failed: ' + (error.message || String(error)), fatal: true });
  }
}

// The page gave up on a request.
function handleCancel(msg) {
  cancelRequest(msg.id);
}

// Pre-execution proposal validation.
async function alignOnModel(msg, request, rejected) {
  try {
    var prompt = buildAlignPrompt(msg.text, (msg.intent || {}).label || '', JSON.stringify(msg.toolScopes || []));
    var output = await pipe(prompt, { max_new_tokens: ALIGN_TOKENS, temperature: ALIGN_TEMPERATURE, stopping_criteria: request.stopper });
    if (request.cancelled) return;
    var parsed = parseJSON(stripEnd(output[0].generated_text.slice(prompt.length)));
    self.postMessage({ type: 'alignResult', alignId: msg.alignId, data: parsed || Object.assign(rejected, { reason: 'invalid alignment response' }) });
  } catch(error) {
    if (request.cancelled) return;
    self.postMessage({ type: 'alignResult', alignId: msg.alignId, data: Object.assign(rejected, { reason: 'alignment failed' }) });
  }
}

function handleAlign(msg) {
  var rejected = { inScope: false, suggestedTool: 'out_of_scope', confidence: 0, reason: 'model unavailable' };
  if (!pipe) return self.postMessage({ type: 'alignResult', alignId: msg.alignId, data: rejected });
  return runOnModel(msg.alignId, function(request) { return alignOnModel(msg, request, rejected); });
}

// Streaming chat. Per-request errors carry requestId, so classifier.js fails
// only this turn and keeps the model for the next request.
async function generateOnModel(msg, request) {
  try {
    var prompt = buildGeneratePrompt(msg.text, (msg.context || '').slice(0, CONTEXT_CHARS));
    var output = await pipe(prompt, { max_new_tokens: GENERATE_TOKENS, temperature: GENERATE_TEMPERATURE, stopping_criteria: request.stopper });
    if (request.cancelled) return;
    self.postMessage({ type: 'token', requestId: msg.requestId, token: stripEnd(output[0].generated_text.slice(prompt.length)) });
  } catch(error) {
    if (request.cancelled) return;
    self.postMessage({ type: 'error', data: 'Generation failed: ' + (error.message || String(error)), requestId: msg.requestId });
  }
  self.postMessage({ type: 'done', requestId: msg.requestId });
}

function handleGenerate(msg) {
  if (!pipe) {
    self.postMessage({ type: 'error', data: 'Model not loaded', requestId: msg.requestId });
    return self.postMessage({ type: 'done', requestId: msg.requestId });
  }
  return runOnModel(msg.requestId, function(request) { return generateOnModel(msg, request); });
}

// Structured JSON. Text that is not a verdict is no verdict, so it is never
// passed on as a summary. A failed evaluation logs with its evalId without
// disabling the model.
async function evaluateOnModel(msg, request) {
  try {
    var prompt = buildEvalPrompt(msg.question, msg.results, msg.context, msg.compactErrors);
    var output = await pipe(prompt, { max_new_tokens: EVAL_TOKENS, temperature: EVAL_TEMPERATURE, stopping_criteria: request.stopper });
    if (request.cancelled) return;
    var text = stripEnd(output[0].generated_text.slice(prompt.length));
    self.postMessage({ type: 'evalResult', evalId: msg.evalId, data: parseJSON(text) || noVerdict() });
  } catch(error) {
    if (request.cancelled) return;
    self.postMessage({ type: 'evalResult', evalId: msg.evalId, data: noVerdict() });
    self.postMessage({ type: 'error', data: 'Eval failed: ' + (error.message || String(error)), evalId: msg.evalId });
  }
}

function handleEvaluate(msg) {
  if (!pipe) return self.postMessage({ type: 'evalResult', evalId: msg.evalId, data: noVerdict() });
  return runOnModel(msg.evalId, function(request) { return evaluateOnModel(msg, request); });
}

var MESSAGE_HANDLERS = { load: handleLoad, cancel: handleCancel, align: handleAlign, generate: handleGenerate, evaluate: handleEvaluate };

self.onmessage = function(event) {
  var handler = MESSAGE_HANDLERS[event.data.type];
  if (handler) return handler(event.data);
};

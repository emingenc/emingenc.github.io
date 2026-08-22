// chat-worker.js — SmolLM2-360M chat completion via Transformers.js v4
//
// Handles:
//   load     → download model from HuggingFace (cached after first visit)
//               Tries WebGPU first, falls back to WASM on timeout/failure
//   generate → {text, requestId, systemPrompt?} → streaming tokens → token/done/error
//   evaluate → {question, results, evalId, context, compactErrors} → evalResult
//
// Uses Transformers.js v4 from jsDelivr CDN (cached by browser after first load).
// Model: onnx-community/SmolLM2-360M-Instruct-ONNX (~180MB download, cached in browser).

import { pipeline } from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.2.0/dist/transformers.min.js';

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

// ─── Load pipeline with timeout ────────────────────────────

function loadPipeline(device, timeoutMs) {
  timeoutMs = timeoutMs || 45000;
  // Reset the download-progress readout for this device attempt. Without this,
  // a failed WebGPU download's progress (e.g. "100%") lingers while we fall back
  // to WASM, so the header briefly shows a misleading "100%" before dropping to
  // the WASM download's real progress. Each device attempt owns its own counter.
  self.postMessage({ type: 'progress', pct: 0 });
  return new Promise(function(resolve, reject) {
    var done = false;
    var timer = setTimeout(function() {
      if (!done) { done = true; reject(new Error('Pipeline init timed out after ' + (timeoutMs/1000) + 's on ' + device)); }
    }, timeoutMs);

    pipeline('text-generation', 'onnx-community/SmolLM2-360M-Instruct-ONNX', {
      // q4f16 quantization is WebGPU-only. The WASM fallback must use a
      // WASM-compatible dtype (q8 → model_quantized.onnx), otherwise the
      // "fallback" re-attempts WebGPU and fails with "no available backend",
      // leaving the model permanently unavailable on any browser without WebGPU.
      dtype: device === 'wasm' ? 'q8' : 'q4f16',
      device: device,
      progress_callback: function(p) {
        if (p && p.progress !== undefined) {
          self.postMessage({ type: 'progress', pct: Math.round(p.progress) });
        }
      }
    }).then(function(p) {
      if (!done) { done = true; clearTimeout(timer); resolve(p); }
    }).catch(function(err) {
      if (!done) { done = true; clearTimeout(timer); reject(err); }
    });
  });
}

// ─── Uncaught-error safety net ──────────────────────────────
// Surface uncaught worker errors as structured messages so the main thread
// never hangs waiting for a response that never arrives (e.g. a future
// regression or a synchronous throw in the handler before a try/catch).
self.onerror = function(e) {
  self.postMessage({ type: 'error', data: 'Worker crashed: ' + (e.message || e.filename || String(e)) });
};
self.onmessageerror = function() {
  self.postMessage({ type: 'error', data: 'Worker received an unserializable message' });
};

// ─── Message handler ───────────────────────────────────────

self.onmessage = async function(e) {
  var msg = e.data;

  // ── load ──────────────────────────────────────────────
  if (msg.type === 'load') {
    try {
      self.postMessage({ type: 'status', data: 'loading prompts...' });

      // Fetch prompts from static files
      try {
        var sr = await fetch('/agents/prompts/system.md');
        if (sr.ok) systemPrompt = (await sr.text()).trim();
      } catch(_) { /* use default */ }

      try {
        var er = await fetch('/agents/prompts/evaluate.md');
        if (er.ok) {
          evalPromptTemplate = '<|im_start|>system\n' + (await er.text()).trim() +
            '\n<|im_end|>\n<|im_start|>user\nQuestion: {{question}}\nResults: {{results}}\nContext: {{context}}\nErrors: {{errors}}\n\nEvaluate now. Return JSON only.\n<|im_end|>\n<|im_start|>assistant\n';
        }
      } catch(_) { /* use default */ }

      try {
        var gr = await fetch('/agents/prompts/generate.md');
        if (gr.ok) generatePromptTemplate = (await gr.text()).trim();
      } catch(_) { /* use default */ }

      try {
        var ar = await fetch('/agents/prompts/align.md');
        if (ar.ok) alignPromptTemplate = (await ar.text()).trim();
      } catch(_) { /* use default */ }

      // Try WebGPU first (fast), fall back to WASM (compatible)
      var loaded = false;
      var lastError = null;

      // Step 1: Try WebGPU
      try {
        self.postMessage({ type: 'status', data: 'loading model (webgpu)...' });
        pipe = await loadPipeline('webgpu', 45000);
        loaded = true;
        self.postMessage({ type: 'status', data: 'ready (webgpu)' });
      } catch(gpuErr) {
        lastError = gpuErr;
        self.postMessage({ type: 'status', data: 'webgpu failed, trying wasm...' });
        console.warn('[chat-worker] WebGPU failed:', gpuErr.message, '- falling back to WASM');
      }

      // Step 2: Fall back to WASM
      if (!loaded) {
        try {
          self.postMessage({ type: 'status', data: 'loading model (wasm)...' });
          pipe = await loadPipeline('wasm', 90000);
          loaded = true;
          self.postMessage({ type: 'status', data: 'ready (wasm)' });
        } catch(wasmErr) {
          lastError = wasmErr;
          console.warn('[chat-worker] WASM also failed:', wasmErr.message);
        }
      }

      if (loaded) {
        self.postMessage({ type: 'status', data: 'ready' });
      } else {
        self.postMessage({ type: 'error', data: 'LLM load failed: ' + (lastError ? lastError.message : 'All backends exhausted') });
      }
    } catch(err) {
      self.postMessage({ type: 'error', data: 'LLM load failed: ' + (err.message || String(err)) });
    }
    return;
  }

  // ── align (pre-execution proposal validation) ──────────
  if (msg.type === 'align') {
    if (!pipe) {
      self.postMessage({ type: 'alignResult', alignId: msg.alignId, data: { inScope: false, suggestedTool: 'out_of_scope', confidence: 0, reason: 'model unavailable' } });
      return;
    }
    try {
      var ap = buildAlignPrompt(msg.text, (msg.intent || {}).label || '', JSON.stringify(msg.toolScopes || []));
      var ao = await pipe(ap, { max_new_tokens: 100, temperature: 0.1 });
      var at = stripEnd(ao[0].generated_text.slice(ap.length));
      var parsedAlign = parseJSON(at);
      self.postMessage({ type: 'alignResult', alignId: msg.alignId, data: parsedAlign || { inScope: false, suggestedTool: 'out_of_scope', confidence: 0, reason: 'invalid alignment response' } });
    } catch(err) {
      self.postMessage({ type: 'alignResult', alignId: msg.alignId, data: { inScope: false, suggestedTool: 'out_of_scope', confidence: 0, reason: 'alignment failed' } });
    }
    return;
  }

  // ── generate (streaming chat) ──────────────────────────
  if (msg.type === 'generate') {
    if (!pipe) {
      self.postMessage({ type: 'error', data: 'Model not loaded' });
      self.postMessage({ type: 'done', requestId: msg.requestId });
      return;
    }
    try {
      var ctx = (msg.context || '').slice(0, 7500); // ~1.7k tokens — SmolLM2's real window is 2048
      var prompt = buildGeneratePrompt(msg.text, ctx);
      var out = await pipe(prompt, { max_new_tokens: 80, temperature: 0.35 });
      var reply = stripEnd(out[0].generated_text.slice(prompt.length));
      self.postMessage({ type: 'token', requestId: msg.requestId, token: reply });
      self.postMessage({ type: 'done', requestId: msg.requestId });
    } catch(err) {
      self.postMessage({ type: 'error', data: 'Generation failed: ' + (err.message || String(err)) });
      self.postMessage({ type: 'done', requestId: msg.requestId });
    }
    return;
  }

  // ── evaluate (structured JSON) ─────────────────────────
  if (msg.type === 'evaluate') {
    if (!pipe) {
      self.postMessage({ type: 'evalResult', evalId: msg.evalId, data: { stop: true, summary: null, confidence: 50, next: '' } });
      return;
    }
    try {
      var ep = buildEvalPrompt(msg.question, msg.results, msg.context, msg.compactErrors);
      var eo = await pipe(ep, { max_new_tokens: 150, temperature: 0.3 });
      var et = stripEnd(eo[0].generated_text.slice(ep.length));
      var parsed = parseJSON(et);
      self.postMessage({ type: 'evalResult', evalId: msg.evalId, data: parsed || { stop: true, summary: et.slice(0, 200), confidence: 60, next: '' } });
    } catch(err) {
      self.postMessage({ type: 'evalResult', evalId: msg.evalId, data: { stop: true, summary: null, confidence: 50, next: '' } });
      self.postMessage({ type: 'error', data: 'Eval failed: ' + (err.message || String(err)) });
    }
    return;
  }
};

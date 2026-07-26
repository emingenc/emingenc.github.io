// needle-router.js v4 — Needle function-calling classifier
//
// Architecture:
//   Phase 1 (eager, ~52MB): Tokenizer + encoder → keyword routing
//   Phase 2 (lazy,  +80MB): Decoder → full function-calling pipeline
//
// Messages:
//   init         → load tokenizer + encoder
//   initDecoder  → load decoder (lazy, called when LLM consent given)
//   classify     → {text} → {type:'tool'|'faq'|'chat', label, score, a?} or null
//   generate     → {text, requestId} → streaming tokens

// ═══════════════════════════════════════════════════════════════
// BPE Tokenizer (inline — same as needle/tokenizer.js)
// ═══════════════════════════════════════════════════════════════
var PAD = 0, EOS = 1, BOS = 2, TOOL_CALL = 4, TOOLS = 5;
var MAX_SEQ = 1024;
var pieceToId = null, idToPiece = null, tokenizerReady = false;

async function loadTokenizer() {
  var resp = await fetch('/data/needle-tokenizer.json');
  var vocab = await resp.json();
  pieceToId = vocab.pieceToId;
  idToPiece = vocab.idToPiece;
  tokenizerReady = true;
}

function tokenize(text) {
  if (!tokenizerReady) return [];
  var ids = [], i = 0, len = text.length;
  while (i < len && ids.length < MAX_SEQ) {
    var match = null;
    for (var look = Math.min(32, len - i); look >= 1; look--) {
      var cand = text.slice(i, i + look);
      if (pieceToId.hasOwnProperty(cand)) { match = cand; ids.push(pieceToId[cand]); i += look; break; }
    }
    if (!match) { ids.push(3 + (text.charCodeAt(i) & 0xFF)); i++; }
  }
  return ids;
}

function detokenize(ids) {
  if (!tokenizerReady) return '';
  var s = '';
  for (var i = 0; i < ids.length; i++) {
    var id = ids[i];
    if (id === EOS) break;
    if (id === PAD) continue;
    var piece = idToPiece[id];
    if (piece) s += piece;
    else if (id >= 3 && id <= 258) s += String.fromCharCode(id - 3);
  }
  return s;
}

// ═══════════════════════════════════════════════════════════════
// Keyword router (fast, no model needed — always works)
// ═══════════════════════════════════════════════════════════════
var TOOL_KEYWORDS = {
  about:   ['about emin','who is emin','emin gench','bio','career','background','experience','yourself','history','forward deployed','crestai','aerospace'],
  repos:   ['repos','repo','github','project','code','open source','built','star','repository','portfolio'],
  contact: ['email','contact','reach','linkedin','twitter','mail','phone','get in touch'],
  skills:  ['skills','skill','tech stack','programming','languages','python','typescript','docker','llm','rag','what do you use','what languages'],
  blog:    ['blog','post','article','write','read','published','writing'],
  g1:      ['g1','smart glass','glasses','even realities','ble','flutter','wearable','hardware','even_glasses']
};

var TOOL_NAMES = ['about','repos','contact','skills','blog','g1'];

function keywordClassify(text) {
  var l = text.toLowerCase().trim();
  var scores = {};
  for (var t = 0; t < TOOL_NAMES.length; t++) {
    var name = TOOL_NAMES[t];
    scores[name] = 0;
    var kws = TOOL_KEYWORDS[name];
    for (var k = 0; k < kws.length; k++) {
      if (l.indexOf(kws[k]) !== -1) scores[name]++;
    }
  }
  var best = null, bestScore = 0;
  for (var n = 0; n < TOOL_NAMES.length; n++) {
    if (scores[TOOL_NAMES[n]] > bestScore) { bestScore = scores[TOOL_NAMES[n]]; best = TOOL_NAMES[n]; }
  }
  if (best && bestScore >= 1) return { type: 'tool', label: best, score: bestScore };

  // No tool matched — route to FAQ, chat, or stop
  // FAQ: question-like queries about Emin
  if (/^(what|who|where|when|why|how|can|could|do|does|is|are|did|was|were|tell|explain|describe|find|show|get|give|has|have)\b/i.test(l)) {
    return { type: 'faq', label: 'faq', score: 1 };
  }

  // Chat: conversational, greetings, small talk
  if (/^(hi|hey|hello|yo|sup|heya|hola|howdy|good\s(morning|afternoon|evening)|thanks|thank|ok|okay|bye|goodbye|see\s(ya|you)|later|nice|cool|great|awesome|wow|lol|haha|hehe|yes|no|yep|nope|nah|sure|alright|well|hmm|uh|um)\b/i.test(l)) {
    return { type: 'chat', label: 'chat', score: 1 };
  }

  // Default: try FAQ (could be a short question like "emin?" or "blog?")
  return { type: 'faq', label: 'faq', score: 0.5 };
}

// ═══════════════════════════════════════════════════════════════
// Needle encoder (52MB)
// ═══════════════════════════════════════════════════════════════
var ort = null;
var encoderSession = null, encoderReady = false;

async function initEncoder() {
  var mod = await import('https://cdn.jsdelivr.net/npm/onnxruntime-web@1.20.1/dist/ort.bundle.min.mjs');
  ort = mod;
  ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.20.1/dist/';
  ort.env.wasm.numThreads = 1;
  encoderSession = await ort.InferenceSession.create('/models/needle-onnx/encoder.onnx', {
    executionProviders: ['wasm']
  });
  encoderReady = true;
}

// ═══════════════════════════════════════════════════════════════
// Needle decoder (80MB) — loaded lazily
// ═══════════════════════════════════════════════════════════════
var decoderSession = null, decoderReady = false;
var decInputNames = [], decOutputNames = [];
var NUM_LAYERS = 8, NUM_KV_HEADS = 4, HEAD_DIM = 64;

async function initDecoder() {
  if (decoderReady) return;
  self.postMessage({ type: 'status', data: 'Loading decoder (80MB)...' });
  decoderSession = await ort.InferenceSession.create('/models/needle-onnx/decoder_step.onnx', {
    executionProviders: ['wasm']
  });
  decInputNames = decoderSession.inputNames;
  decOutputNames = decoderSession.outputNames;
  decoderReady = true;

  // Self-test: verify function-calling pipeline works
  try {
    var testResult = await fcClassify('show repos');
    self.postMessage({ type: 'status', data: 'FC self-test: "' + 'show repos' + '" → ' + (testResult ? testResult.label : 'null') });
    self.postMessage({ type: 'decoderReady', data: 'decoder + FC ready' });
  } catch(e) {
    self.postMessage({ type: 'error', data: 'FC self-test failed: ' + (e.message || String(e)) + ' — falling back to keywords' });
    decoderReady = false; // disable FC, keep keywords
    self.postMessage({ type: 'decoderReady', data: 'decoder loaded but FC disabled' });
  }
}

function makeEmptyKV() {
  return new Float32Array(NUM_LAYERS * 2 * 1 * NUM_KV_HEADS * 0 * HEAD_DIM);
}

// Tool definitions for function calling
var FC_TOOLS = null;

function buildFCTools() {
  if (FC_TOOLS) return FC_TOOLS;
  FC_TOOLS = [
    { name: 'about',   description: 'Emin Gench biography, career background, current role at Cresta AI in Vancouver. Aerospace Engineering degree. Previously at Goodfintech, Vivoo, Novit AI.', parameters: {} },
    { name: 'repos',   description: 'GitHub open source repositories by emingenc: even_glasses (79 stars G1 BLE SDK), telegramGPT (52 stars AI bot guide), G1 Voice AI (25 stars), g1_flutter (18 stars), visionlink, llm_adaptive_router.', parameters: {} },
    { name: 'contact', description: 'Contact Emin Gench: email emin@emingenc.com, LinkedIn, GitHub at github.com/emingenc. Open to open source collaboration and smart glasses projects.', parameters: {} },
    { name: 'skills',  description: 'Technical skills: Python, TypeScript, Dart, FastAPI, Next.js, PostgreSQL, Docker, AWS, Linux, LLMs, AI agents, RAG systems, smart glasses BLE development.', parameters: {} },
    { name: 'blog',    description: 'Blog posts about building AI agents that ship, lessons from the field, and technical writing about software engineering and AI.', parameters: {} },
    { name: 'g1',      description: 'G1 smart glasses by Even Realities: BLE SDK for sensor data, Flutter bridge for mobile, voice AI assistant. 6 repos across 5 languages.', parameters: {} },
    { name: 'stop',    description: 'No tool needed. The user is greeting, thanking, or making casual conversation. Respond directly without calling any function.', parameters: {} }
  ];
  return FC_TOOLS;
}

// ═══════════════════════════════════════════════════════════════
// Full Needle function-calling pipeline (encoder → decoder → JSON)
// ═══════════════════════════════════════════════════════════════
async function fcClassify(text) {
  if (!encoderReady || !decoderReady) return null;

  var tools = buildFCTools();
  var toolsJson = JSON.stringify(tools);

  // 1. Build encoder input: query + <tools> + tools_json
  var qToks = tokenize(text).slice(0, 1022);
  var tToks = tokenize(toolsJson).slice(0, 1024 - qToks.length - 1);
  var encIds = qToks.concat([TOOLS], tToks);
  var encTensor = new ort.Tensor('int64', BigInt64Array.from(encIds.map(BigInt)), [1, encIds.length]);

  // 2. Run encoder
  var encOut = await encoderSession.run({ input_ids: encTensor });
  var encoderHidden = encOut[Object.keys(encOut)[0]];

  // 3. Decoder loop with KV cache
  var pastKV = null;
  var currentToken = EOS;
  var generated = [];
  var MAX_STEPS = 64;

  for (var step = 0; step < MAX_STEPS; step++) {
    var feeds = {
      decoder_input_ids: new ort.Tensor('int64', BigInt64Array.from([BigInt(currentToken)]), [1, 1]),
      encoder_out: encoderHidden,
      past_self_kv: pastKV || new ort.Tensor('float32', makeEmptyKV(), [NUM_LAYERS, 2, 1, NUM_KV_HEADS, 0, HEAD_DIM])
    };

    var decOut = await decoderSession.run(feeds);
    pastKV = decOut.present_self_kv;

    // Greedy decode
    var logits = decOut.logits.data;
    var maxId = 0, maxVal = -Infinity;
    for (var i = 0; i < logits.length; i++) {
      if (logits[i] > maxVal) { maxVal = logits[i]; maxId = i; }
    }

    if (maxId === EOS || maxId === PAD) break;
    if (maxId === TOOL_CALL && step === 0) { currentToken = maxId; generated.push(maxId); continue; }

    currentToken = maxId;
    generated.push(maxId);
  }

  // 4. Parse function call
  var text = detokenize(generated);
  try {
    var start = text.indexOf('['), end = text.lastIndexOf(']');
    if (start !== -1 && end !== -1 && end > start) {
      var calls = JSON.parse(text.slice(start, end + 1));
      if (calls.length > 0) {
        var name = calls[0].name;
        // Map back to known tool names
        for (var t = 0; t < TOOL_NAMES.length; t++) {
          if (name === TOOL_NAMES[t] || name.indexOf(TOOL_NAMES[t]) !== -1) {
            return { type: 'tool', label: TOOL_NAMES[t], score: 1.0 };
          }
        }
        if (name === 'stop') return { type: 'chat', label: 'stop', score: 1.0 };
        return { type: 'chat', label: name, score: 0.5 };
      }
    }
  } catch(e) {}

  return null; // parse failed → fall back to keyword
}

// ═══════════════════════════════════════════════════════════════
// Init
// ═══════════════════════════════════════════════════════════════
async function init() {
  try {
    self.postMessage({ type: 'status', data: 'Loading tokenizer...' });
    await loadTokenizer();
    if (!tokenizerReady) { self.postMessage({ type: 'error', data: 'Tokenizer failed' }); return; }

    self.postMessage({ type: 'status', data: 'Loading encoder (52MB)...' });
    await initEncoder();
    if (!encoderReady) { self.postMessage({ type: 'error', data: 'Encoder failed' }); return; }

    self.postMessage({ type: 'ready', data: 'needle ready (encoder + tokenizer)' });

  } catch(e) {
    self.postMessage({ type: 'error', data: 'init: ' + (e.message || String(e)) });
  }
}

// ═══════════════════════════════════════════════════════════════
// Message handler
// ═══════════════════════════════════════════════════════════════
self.onmessage = async function(e) {
  var m = e.data;

  if (m.type === 'init') await init();

  if (m.type === 'initDecoder') {
    try {
      await initDecoder();
      self.postMessage({ type: 'decoderReady', data: 'decoder ready' });
    } catch(err) {
      self.postMessage({ type: 'error', data: 'decoder: ' + (err.message || String(err)) });
    }
  }

  if (m.type === 'classify') {
    if (!encoderReady) { self.postMessage({ type: 'intent', data: null }); return; }

    // 1. Try full function-calling pipeline (if decoder loaded)
    if (decoderReady) {
      try {
        var fc = await fcClassify(m.data.text);
        if (fc) { self.postMessage({ type: 'intent', data: fc }); return; }
      } catch(e) { /* FC failed, fall through to keyword */ }
    }

    // 2. Keyword routing fallback (always works)
    var kw = keywordClassify(m.data.text);
    self.postMessage({ type: 'intent', data: kw });
  }
};

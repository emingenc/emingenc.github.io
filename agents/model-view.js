// model-view.js — the live status line under the prompt: the agent runs in
// this browser with no servers, and one plain-word state says how its local
// models are doing: "model loading", the download as "model 42%", then
// "ready" ("model off · commands still work" if either model can't load
// here). The title names both models. Needle (26M) picks a tool for each
// question from its 52 MB encoder; SmolLM2 (360M) is 272 MB on WebGPU
// (q4f16) or 363 MB on the WASM fallback (q8).
const SMOL_WEBGPU_MB = 272;
const SMOL_WASM_MB = 363;
const MODEL_ACTIONS = new Set(['MODEL_STATUS', 'MODEL_PROGRESS']);

function usesWasm(models) {
  const text = String(models.llmStatusText || '').toLowerCase();
  if (text.includes('wasm')) return true;
  if (text.includes('webgpu')) return false;
  return !('gpu' in navigator);
}

function modelFailed(models) {
  return Boolean(models.llmError || models.needleError);
}

// Needle is small and loads first, so the state follows SmolLM2's download.
function modelState(models) {
  if (modelFailed(models)) return ['off', 'model off · commands still work'];
  if (models.llmReady && !models.needleLoading) return ['ok', 'ready'];
  if (models.llmDownloadProgress > 0) return ['busy', 'model ' + models.llmDownloadProgress + '%'];
  return ['busy', 'model loading'];
}

function titleText(models) {
  if (modelFailed(models)) return 'A model could not load in this tab; /commands still work. Nothing goes to a server.';
  const smolMb = usesWasm(models) ? SMOL_WASM_MB : SMOL_WEBGPU_MB;
  const backend = usesWasm(models) ? 'WASM' : 'WebGPU';
  return `Two models run in this tab: Needle 26M picks a tool for each question (52 MB), and SmolLM2 360M checks answers and handles small talk (${smolMb} MB, ${backend}). Nothing goes to a server.`;
}

export class ModelView {
  constructor(store) {
    this.els = { root: document.getElementById('liveStatus'), state: document.getElementById('liveModel') };
    store.subscribe((state, action) => {
      if (MODEL_ACTIONS.has(action.type)) this.paint(state.models);
    });
    this.paint(store.getState().models);
  }

  paint(models) {
    const { root, state } = this.els;
    if (state) {
      const [name, text] = modelState(models);
      state.dataset.state = name;
      if (state.textContent !== text) state.textContent = text;
    }
    if (root) root.title = titleText(models);
  }
}

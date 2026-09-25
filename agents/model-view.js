// model-view.js — the reserved model slot. While the local models load it
// shows one row each (Needle routes, SmolLM2 writes); once both settle it
// folds to a one-line runtime summary in the same fixed-height space, and
// the phone header swaps its status chip for the role line.
// Sizes are the real downloads: Needle's 52 MB encoder at boot, SmolLM2
// 272 MB on WebGPU (q4f16) or 363 MB on the WASM fallback (q8).
const SMOL_WEBGPU_MB = 272;
const SMOL_WASM_MB = 363;
const FULL_PERCENT = 100;
const MODEL_ACTIONS = new Set(['MODEL_STATUS', 'MODEL_PROGRESS']);

function byId(id) {
  return document.getElementById(id);
}

function setText(elem, text) {
  if (elem && elem.textContent !== text) elem.textContent = text;
}

function usesWasm(models) {
  const text = String(models.llmStatusText || '').toLowerCase();
  if (text.includes('wasm')) return true;
  if (text.includes('webgpu')) return false;
  return !('gpu' in navigator);
}

function backendName(models) {
  return usesWasm(models) ? 'WASM' : 'WebGPU';
}

function needleText(models) {
  if (models.needleError) return 'unavailable';
  if (models.needleReady) return 'ready';
  return models.needleStatusText || 'loading…';
}

function smolText(models) {
  if (models.llmError) return 'unavailable';
  if (models.llmReady) return 'ready · ' + backendName(models);
  if (models.llmDownloadProgress > 0) return 'downloading ' + models.llmDownloadProgress + '%';
  return models.llmStatusText || (models.llmLoading ? 'loading…' : 'waiting…');
}

function isSettled(models) {
  const needleDone = models.needleReady || Boolean(models.needleError);
  const smolDone = models.llmReady || Boolean(models.llmError);
  return needleDone && smolDone;
}

function summaryText(models) {
  if (models.llmError) return 'Runtime · SmolLM2 unavailable · commands and quick answers still work';
  if (models.needleError) return 'Runtime · Needle unavailable · commands still work';
  return 'Runtime ready · Needle 26M + SmolLM2 360M · ' + backendName(models) + ' · cached';
}

// State first: a narrow phone header clips the end of the chip.
function chipText(models) {
  if (models.llmDownloadProgress > 0 && !models.llmReady) return models.llmDownloadProgress + '% SmolLM2';
  return models.needleReady ? 'loading SmolLM2' : 'loading Needle';
}

export class ModelView {
  constructor(store) {
    this.els = {
      needleState: byId('rmNeedleState'),
      needleFill: byId('rmNeedleFill'),
      smolSize: byId('rmSmolSize'),
      smolState: byId('rmSmolState'),
      smolFill: byId('rmSmolFill'),
      rows: byId('rmRows'),
      fold: byId('runtimeFold'),
      chip: byId('statusChip'),
    };
    if (this.els.fold) this.els.fold.addEventListener('click', () => this.toggleRows());
    store.subscribe((state, action) => {
      if (MODEL_ACTIONS.has(action.type)) this.paint(state.models);
    });
    this.paint(store.getState().models);
  }

  paint(models) {
    this.paintNeedle(models);
    this.paintSmol(models);
    this.paintSummary(models);
  }

  paintNeedle(models) {
    const { needleState, needleFill } = this.els;
    setText(needleState, needleText(models));
    if (!needleFill) return;
    needleFill.style.width = models.needleReady ? FULL_PERCENT + '%' : '';
    const loading = !models.needleReady && !models.needleError;
    needleFill.parentElement.toggleAttribute('data-indeterminate', loading);
  }

  paintSmol(models) {
    const { smolSize, smolState, smolFill } = this.els;
    setText(smolSize, 'writer · ' + (usesWasm(models) ? SMOL_WASM_MB : SMOL_WEBGPU_MB) + ' MB');
    setText(smolState, smolText(models));
    if (smolFill) smolFill.style.width = (models.llmReady ? FULL_PERCENT : models.llmDownloadProgress || 0) + '%';
  }

  paintSummary(models) {
    const { rows, fold, chip } = this.els;
    const settled = isSettled(models);
    document.body.classList.toggle('models-ready', settled);
    if (chip) chip.hidden = settled;
    setText(chip, models.llmError || models.needleError ? 'model unavailable' : chipText(models));
    if (!fold) return;
    fold.hidden = !settled;
    setText(fold, summaryText(models));
    if (rows) rows.hidden = settled && fold.getAttribute('aria-expanded') !== 'true';
  }

  toggleRows() {
    const { rows, fold } = this.els;
    const open = fold.getAttribute('aria-expanded') !== 'true';
    fold.setAttribute('aria-expanded', String(open));
    if (rows) rows.hidden = !open;
  }
}

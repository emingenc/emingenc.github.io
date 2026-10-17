// model-view.js — the live status line under the prompt, in plain words: the
// question matcher (Needle) is the main state ("loading question matcher ·
// 12.4 / 36 MB · 34% · 4.1 MB/s · 6 s left", then "ready"); the chat model has
// a line of its own, or its button labelled with its megabytes. A model that
// stops says where, and offers retry.
// For a screen reader the line announces a phase change only (loading starts,
// ready, a model fails) through its own status region, never each percent: the
// line is hidden from it while a model loads, and busy.
const MODEL_ACTIONS = new Set(['MODEL_STATUS', 'MODEL_PROGRESS', 'LLM_POLICY']);
const BYTES_PER_MB = 1e6;
const MS_PER_S = 1000;
const PERCENT = 100;
const MAX_PERCENT = 99;
const RATE_WINDOW_MS = 5000;
const MIN_RATE_SPAN_MS = 1000;
const ETA_MINUTES_FROM_S = 90;
const SECONDS_PER_MINUTE = 60;
const WHOLE_MB_FROM_TOTAL = 100;
const NBSP = '\u00a0';
const NAMES = { needle: 'question matcher', llm: 'chat model' };
const PHASE_ANNOUNCEMENTS = { busy: 'Loading the models in this tab.', ok: 'The models are ready.', off: 'A model could not load. Commands still work.' };

// Bytes seen so far (never falling) and the speed over the last few seconds.
function createMeter() {
  let peak = 0;
  const samples = [];
  return {
    read(loaded, now) {
      peak = Math.max(peak, loaded);
      samples.push([now, peak]);
      while (samples.length > 1 && now - samples[0][0] > RATE_WINDOW_MS) samples.shift();
      const [since, before] = samples[0];
      const span = now - since;
      return { loaded: peak, rate: span >= MIN_RATE_SPAN_MS ? ((peak - before) / span) * MS_PER_S : 0 };
    },
  };
}

function megabytes(bytes, total) {
  return (bytes / BYTES_PER_MB).toFixed(total >= WHOLE_MB_FROM_TOTAL * BYTES_PER_MB ? 0 : 1);
}

function etaText(seconds) {
  if (seconds < ETA_MINUTES_FROM_S) return `${Math.max(1, Math.ceil(seconds))} s left`;
  return `${Math.ceil(seconds / SECONDS_PER_MINUTE)} min left`;
}

function percentOf(bytes) {
  return Math.min(MAX_PERCENT, Math.floor((bytes.loaded / bytes.total) * PERCENT));
}

// "<size so far> / <total> MB · <percent>" plus speed and time left once known.
function figures(reading, total) {
  const parts = [`${megabytes(reading.loaded, total)} / ${(total / BYTES_PER_MB).toFixed(0)} MB`, `${percentOf({ loaded: reading.loaded, total })}%`];
  if (reading.rate > 0) {
    parts.push(`${(reading.rate / BYTES_PER_MB).toFixed(1)} MB/s`, etaText((total - reading.loaded) / reading.rate));
  }
  return parts.map((part) => part.replaceAll(' ', NBSP)).join(' · ');
}

// download: {model, bytes, phase, note?, meter, now}
function loadingLine(download) {
  const head = `loading ${NAMES[download.model]}${download.note ? ` · ${download.note}` : ''}`;
  const { bytes, phase, meter, now } = download;
  if (!bytes || !bytes.total) return head;
  if (phase === 'starting') return `${head} · starting`;
  return `${head} · ${figures(meter.read(bytes.loaded, now), bytes.total)}`;
}

// Where a download stopped: "question matcher stopped at 41%".
function stoppedLine({ model, bytes }) {
  const at = bytes && bytes.total && percentOf(bytes) > 0 ? ` at ${percentOf(bytes)}%` : '';
  return `${NAMES[model]} stopped${at}`;
}

function chatWaits(models) {
  return models.llmPolicy !== 'auto' && models.llmDownloadMB > 0 && !models.llmLoading && !models.llmReady;
}

function titleText(models) {
  const failures = [models.needleError, models.llmError].filter(Boolean);
  if (failures.length) return `${failures.join('; ')}. /commands still work. Nothing goes to a server.`;
  const chat = models.llmDownloadMB ? ` (${models.llmDownloadMB} MB)` : '';
  return `Two models run in this tab: Needle 26M picks a tool for each question, and SmolLM2 360M checks answers and handles small talk${chat}. Nothing goes to a server.`;
}

export class ModelView {
  constructor(store) {
    this.meters = {};
    this.phase = '';
    this.els = { root: document.getElementById('liveStatus'), state: document.getElementById('liveModel'), announcer: document.getElementById('modelAnnouncer') };
    this.els.chat = this.makeLine('liveChat');
    this.els.load = this.makeLoadButton();
    this.els.retry = this.makeRetryButton();
    store.subscribe((state, action) => {
      if (MODEL_ACTIONS.has(action.type)) this.paint(state.models);
    });
    this.paint(store.getState().models);
  }

  makeLine(id) {
    const text = document.getElementById('liveModel')?.parentElement;
    if (!text || !text.after) return null;
    const line = document.createElement('span');
    line.id = id;
    line.hidden = true;
    text.after(line);
    return line;
  }

  makeButton(onClick) {
    const text = document.getElementById('liveModel')?.parentElement;
    if (!text || !text.after) return null;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'load';
    button.hidden = true;
    button.addEventListener('click', onClick);
    (this.els.chat || text).after(button);
    return button;
  }

  makeLoadButton() {
    return this.makeButton(() => window._enableLLM());
  }

  makeRetryButton() {
    const button = this.makeButton(() => window.Classifier.retry(button.dataset.model));
    if (button) button.textContent = 'retry';
    return button;
  }

  // A fresh attempt (no bytes yet) starts a fresh meter.
  meterFor(model, loading) {
    if (!loading) delete this.meters[model];
    else if (!this.meters[model]) this.meters[model] = createMeter();
    return this.meters[model];
  }

  paint(models, now = performance.now()) {
    const meters = { needle: this.meterFor('needle', models.needleLoading && models.needleBytes), llm: this.meterFor('llm', models.llmLoading && models.llmBytes), now };
    const lines = this.lines(models, meters);
    this.paintText(lines);
    this.announce(lines.state);
    if (this.els.root) this.els.root.title = titleText(models);
    this.paintButtons(models);
  }

  // One announcement per phase change; progress and repaints make none.
  announce(phase) {
    if (phase === this.phase) return;
    this.phase = phase;
    const { root, announcer } = this.els;
    if (root) root.setAttribute('aria-busy', String(phase === 'busy'));
    if (announcer) announcer.textContent = PHASE_ANNOUNCEMENTS[phase];
  }

  paintText(lines) {
    const { state, chat } = this.els;
    if (state) {
      state.dataset.state = lines.state;
      state.setAttribute('aria-hidden', String(lines.state === 'busy'));
      if (state.textContent !== lines.main) state.textContent = lines.main;
    }
    if (chat) {
      chat.hidden = !lines.chat;
      if (chat.textContent !== lines.chat) chat.textContent = lines.chat;
    }
  }

  paintButtons(models) {
    const { load, retry } = this.els;
    if (load) {
      load.hidden = !chatWaits(models) || Boolean(models.llmError);
      load.textContent = `load chat model · ${models.llmDownloadMB} MB`;
    }
    if (retry) {
      retry.dataset.model = models.needleError ? 'needle' : 'llm';
      retry.hidden = !(models.needleError || models.llmError);
    }
  }

  // The main state follows the question matcher; the chat model's own line
  // shows its download or what stopped. A matcher that never started (a phone
  // before the first tap) is ready: answers come from his notes.
  // meters: {needle, llm, now}
  lines(models, meters) {
    const chat = this.chatLine(models, meters);
    const needle = { model: 'needle', bytes: models.needleBytes, phase: models.needlePhase, meter: meters.needle, now: meters.now };
    if (models.needleError) return { state: 'off', main: `${stoppedLine(needle)} · commands still work`, chat };
    if (models.needleLoading) return { state: 'busy', main: loadingLine(needle), chat };
    if (models.needleReady || models.llmDownloadMB > 0) return { state: 'ok', main: 'ready', chat };
    return { state: 'busy', main: 'model loading', chat };
  }

  chatLine(models, meters) {
    const chat = { model: 'llm', bytes: models.llmBytes, phase: '', note: models.llmPhase, meter: meters.llm, now: meters.now };
    if (models.llmError) return `${stoppedLine(chat)} · answers still come from his notes`;
    if (models.llmLoading) return loadingLine(chat);
    return '';
  }
}

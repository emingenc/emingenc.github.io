// agent-ui.js — boots the in-browser agent on the C · Context page. It wires
// the store, renderer and router (classic scripts on window) to the run view,
// the composer (Enter queues while a turn runs; ■ Stop or Esc interrupts),
// the command menu, the page highlight, the phone sheet and the model slot.
// URL triggers keep their { source: 'url' } marker: router.js uses it to
// refuse destructive commands (/forget, /clear) that arrive from a link.
import { RunView } from './agents/run-view.js';
import { ModelView } from './agents/model-view.js';
import { createPaletteView } from './agents/palette-view.js';
import { createPageView } from './agents/page-view.js';
import { createSheetView } from './agents/sheet-view.js';

const URL_TRIGGER_DELAY_MS = 1200;
const SESSION_TICK_MS = 30000;
const MINUTE_MS = 60000;
const ID_RADIX = 36;
const ID_START = 2;
const ID_END = 6;
const PLACEHOLDERS = { fine: 'Ask about Emin\'s work, or type / for commands', coarse: 'Ask, or type /' };
const HINTS = {
  idleFine: '/ for commands · ⌘K',
  idleCoarse: '',
  runFine: 'Enter queues your next question · Esc stops',
  runCoarse: '■ Stop interrupts',
};
const QUEUED_NOTES = { booting: 'queued — runs when the agent is ready: ', running: 'queued — runs after this turn: ' };

const byId = (id) => document.getElementById(id);
const finePointer = window.matchMedia('(pointer: fine)').matches;
const sessionStart = Date.now();
const els = {
  input: byId('input'),
  form: byId('composerForm'),
  sendBtn: byId('sendBtn'),
  hint: byId('composerHint'),
  queued: byId('queuedNote'),
  turnList: byId('turnList'),
  panel: byId('panelBody'),
};
let pending = null;
let booted = false;

const store = window.createStore({
  session: {
    id: 'agent-' + Math.random().toString(ID_RADIX).slice(ID_START, ID_END),
    start: sessionStart, messageCount: 0, sessionCount: 1,
  },
  models: {
    needleReady: false, needleLoading: false, needleStatusText: '',
    llmReady: false, llmLoading: false, llmError: null, llmConsent: null,
    llmDownloadProgress: 0, llmStatusText: '', capabilities: {},
  },
  messages: [],
  ui: { isProcessing: false, thinkingState: 'idle', thinkingLabel: '', contextPct: 0 },
});

const page = createPageView({ doc: byId('docWrap'), jumpChip: byId('jumpChip'), agentCol: byId('agent') });
const sheet = createSheetView({
  panel: els.panel, handle: byId('sheetHandle'), summary: byId('sheetSummary'),
  content: byId('turnContent'), composer: byId('composerWrap'),
});
const runView = new RunView({
  store, page, sheet, finePointer, onRunStart, onRunEnd,
  list: els.turnList, scroller: els.panel, idlePanel: byId('idlePanel'), announcer: byId('announcer'),
});
const palette = createPaletteView({
  input: els.input, menu: byId('cmdMenu'), list: byId('cmdList'), empty: byId('cmdEmpty'),
  hint: byId('cmdHint'), closeBtn: byId('cmdClose'), scrim: byId('scrim'),
  getFiles: () => page.files(), onRun: (text) => submit(text), onOpenFile: openFile,
});

function rendererElements() {
  return {
    output: els.turnList, input: els.input, hSession: byId('hSession'),
    sCtxFill: byId('sCtxFill'), sCtxPct: byId('sCtxPct'),
    sModel: byId('sModel'), sModelDot: byId('sModelDot'),
    inputModel: byId('inputModel'), inputModelDot: byId('inputModelDot'),
  };
}

// ─── Composer: submit, queue, stop ─────────────────────────
function submit(text, opts) {
  const trimmed = String(text || '').trim();
  if (!trimmed) return;
  els.input.value = '';
  palette.close();
  if (mustQueue()) queue({ text: trimmed, opts });
  else window.Router.handleInput(trimmed, opts);
}

// An ask_user pause keeps the turn open but takes typed answers directly.
function mustQueue() {
  const ui = store.getState().ui;
  return !booted || (!ui.needsHumanInput && (runView.isRunning() || ui.isProcessing));
}

function queue(item) {
  pending = item;
  els.queued.textContent = (booted ? QUEUED_NOTES.running : QUEUED_NOTES.booting) + item.text;
  els.queued.hidden = false;
  els.hint.hidden = true;
}

function drainQueue() {
  const next = pending;
  pending = null;
  els.queued.hidden = true;
  els.hint.hidden = false;
  if (next) setTimeout(() => submit(next.text, next.opts), 0);
}

function setSendMode(mode) {
  const stopping = mode === 'stop';
  els.sendBtn.dataset.mode = mode;
  els.sendBtn.type = stopping ? 'button' : 'submit';
  els.sendBtn.textContent = stopping ? '■ Stop' : '↵';
  els.sendBtn.setAttribute('aria-label', stopping ? 'Stop this turn' : 'Send');
}

function onRunStart() {
  setSendMode('stop');
  els.hint.textContent = finePointer ? HINTS.runFine : HINTS.runCoarse;
}

function onRunEnd() {
  setSendMode('send');
  els.hint.textContent = finePointer ? HINTS.idleFine : HINTS.idleCoarse;
  drainQueue();
  const active = document.activeElement;
  if (finePointer && (!active || active === document.body)) els.input.focus({ preventScroll: true });
}

function openFile(fileId) {
  if (sheet.isPhone()) sheet.idle();
  page.reveal(fileId, 1);
}

// ─── Keyboard ──────────────────────────────────────────────
// Esc order: command menu → running turn → phone sheet → clear the input.
function onEscape() {
  if (palette.isOpen()) palette.close();
  else if (runView.isRunning()) runView.stop();
  else if (sheet.isPhone() && sheet.state() !== 'idle') sheet.idle();
  else if (document.activeElement === els.input) els.input.value = '';
}

function onInputKey(evt) {
  if (palette.handleKeydown(evt)) {
    evt.preventDefault();
  } else if (evt.key === 'Escape') {
    evt.preventDefault();
    onEscape();
  }
}

function isTypingTarget(target) {
  return Boolean(target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)));
}

function openMenu() {
  els.input.focus({ preventScroll: true });
  palette.open();
}

function startCommand() {
  els.input.value = '/';
  els.input.focus({ preventScroll: true });
  palette.syncToInput();
}

// The ask_user dialog handles its own keys (renderer.js).
function onGlobalKey(evt) {
  if (evt.defaultPrevented || (evt.target.closest && evt.target.closest('#ask-user-modal'))) return;
  if ((evt.metaKey || evt.ctrlKey) && evt.key.toLowerCase() === 'k') {
    evt.preventDefault();
    openMenu();
  } else if (evt.key === 'Escape') {
    onEscape();
  } else if (evt.key === '/' && !isTypingTarget(evt.target)) {
    evt.preventDefault();
    startCommand();
  }
}

// Only our own static chip containers run [data-run]: sanitized card HTML
// keeps data-* attributes, so a document-wide delegate would be a sink.
function wireChips(container) {
  if (!container) return;
  container.addEventListener('click', (evt) => {
    const button = evt.target.closest('[data-run]');
    if (button && container.contains(button)) submit(button.dataset.run);
  });
}

function wireComposer() {
  els.form.addEventListener('submit', (evt) => {
    evt.preventDefault();
    submit(els.input.value);
  });
  els.sendBtn.addEventListener('click', (evt) => {
    if (els.sendBtn.dataset.mode !== 'stop') return;
    evt.preventDefault();
    runView.stop();
  });
  els.input.addEventListener('input', () => palette.syncToInput());
  els.input.addEventListener('keydown', onInputKey);
  document.addEventListener('keydown', onGlobalKey);
  byId('cmdkBtn')?.addEventListener('click', openMenu);
  byId('runtimeOpen')?.addEventListener('click', () => sheet.expand());
  wireChips(byId('suggestChips'));
  wireChips(byId('idlePanel'));
}

// ─── Page chrome ───────────────────────────────────────────
function tickSessionAge() {
  const age = byId('sSession');
  if (age) age.textContent = Math.floor((Date.now() - sessionStart) / MINUTE_MS) + 'm';
}

// /new and /resume repaint the transcript through these, so the run view
// drops its turn state with them.
function wrapRenderer() {
  const { showWelcome, showRestored } = window.Renderer;
  window.Renderer.showWelcome = () => {
    runView.reset();
    showWelcome();
  };
  window.Renderer.showRestored = (state) => {
    runView.reset();
    showRestored(state);
  };
}

// ─── URL triggers: /#/q/<question>, /#/<tool>, ?q= / ?ask= / ?query= ──
function hashTrigger(hash) {
  const route = hash.replace(/^#\/?/, '');
  if (route.startsWith('q/')) return safeDecode(route.slice(2));
  const known = window.Tools.toolNames.indexOf(route) !== -1 || route === 'help' || route === 'blog';
  return known ? '/' + route : '';
}

function safeDecode(text) {
  try {
    return decodeURIComponent(text);
  } catch (err) {
    console.warn('[agent-ui] ignoring a malformed #/q/ link', err);
    return '';
  }
}

function queryTrigger() {
  const params = new URLSearchParams(window.location.search);
  return params.get('q') || params.get('ask') || params.get('query') || '';
}

function checkURLTriggers() {
  const text = (window.location.hash && hashTrigger(window.location.hash)) || queryTrigger();
  if (text) submit(text, { source: 'url' });
}

function checkHashTrigger() {
  const text = window.location.hash ? hashTrigger(window.location.hash) : '';
  if (text) submit(text, { source: 'url' });
}

// ─── Public API used by card markup (onclick="window.quickCmd('/x')") ──
function exposeApi() {
  window.quickCmd = (cmd) => submit(cmd);
  window.setMode = (mode) => {
    if (mode === 'static') window.location.href = '/static';
  };
  window._enableLLM = () => window.Router.enableLLM();
}

function finishBoot() {
  if (booted) return;
  booted = true;
  els.input.disabled = false;
  if (finePointer) els.input.focus({ preventScroll: true });
  drainQueue();
}

function boot() {
  store.subscribe((state, action) => {
    if (action.type === 'WELCOME_DONE') finishBoot();
  });
  Promise.all([window.Tools.loadFAQ(), window.KnowledgeBase.load()]).then(() => {
    if (store.restore()) window.Renderer.showRestored(store.getState());
    else window.Renderer.showWelcome();
    setTimeout(checkURLTriggers, URL_TRIGGER_DELAY_MS);
  });
}

function start() {
  els.input.disabled = true;
  els.input.placeholder = finePointer ? PLACEHOLDERS.fine : PLACEHOLDERS.coarse;
  new ModelView(store);
  page.files(); // fills each file tab's token count
  window.Renderer.init(store, rendererElements(), { containerFor: (msg) => runView.containerFor(msg) });
  window.Router.init(store);
  exposeApi();
  wrapRenderer();
  wireComposer();
  setSendMode('send');
  els.hint.textContent = finePointer ? HINTS.idleFine : HINTS.idleCoarse;
  tickSessionAge();
  setInterval(tickSessionAge, SESSION_TICK_MS);
  window.addEventListener('hashchange', checkHashTrigger);
  boot();
}

start();

// anatomy.js — what a settled turn that ran tools adds to its answer: its
// tool lines fold behind one summary line ("ran 1 tool · read work.md ·
// 34 ms"), and the answer ends with a sources row and, when nothing left the
// browser, a local footer. A receipt button in an answer ("work.md:4") opens
// the row it cites. run-view.js loads this module when the page starts and
// uses it once a turn settles or a receipt is clicked, so the first paint
// does not carry it. Rendered as text; no innerHTML here.
import { FILE_NAMES, fmtMs, isToolRow, mergeSources, roundedDurations, toSpans } from './steps.js';
import { make, makeButton } from './dom.js';
import { citeFigure } from './figures.js';

const RECEIPT_ROW = /^\d{1,3}$/;

function distinctFileNames(tools) {
  const names = [];
  tools.forEach((tool) => (tool.sources || []).forEach((src) => {
    const name = FILE_NAMES[src.file];
    if (name && names.indexOf(name) === -1) names.push(name);
  }));
  return names;
}

// "ran 2 tools · read about.md, work.md · 34 ms": the turn's tool calls, the
// files they read (tools: [{sources}]) and the act rows' summed time.
// Empty when the turn ran no tool.
export function toolSummary(run, tools) {
  const calls = run.rows.filter(isToolRow).length;
  if (calls === 0) return '';
  const shares = roundedDurations(run.rows);
  const acts = run.rows.map((row, i) => (row.verb === 'act' && !row.synthetic ? shares[i] : null)).filter((share) => share !== null);
  const files = distinctFileNames(tools || []);
  const parts = [`ran ${calls} tool${calls === 1 ? '' : 's'}`];
  if (files.length) parts.push(`read ${files.join(', ')}`);
  if (acts.length) parts.push(fmtMs(acts.reduce((sum, share) => sum + share, 0)));
  return parts.join(' · ');
}

// "2-5, 7": a file's rows as spans, no L prefix. No lines means the whole file.
export function rowRangeLabel(lines) {
  if (lines.length === 0) return '';
  return toSpans(lines).map((span) => (span[0] === span[1] ? String(span[0]) : `${span[0]}-${span[1]}`)).join(', ');
}

export function sourceRefLabel(src) {
  const name = FILE_NAMES[src.file];
  const rows = rowRangeLabel(src.lines);
  return rows ? `${name}:${rows}` : name;
}

export function mergeToolSources(tools) {
  return tools.reduce((merged, tool) => mergeSources(merged, tool.sources || []), []);
}

const SOURCES_OWN_NOTES = "sources · Emin's own notes";
const SOURCES_CRESTA_NOTES = "sources · Cresta's description, from Emin's notes";
const CRESTA_DESCRIPTION_ROW = 2;

function citesCrestaDescription(sources) {
  return sources.some((src) => src.file === 'work' && (src.lines.length === 0 || src.lines.indexOf(CRESTA_DESCRIPTION_ROW) !== -1));
}

// The sources row under an answer: {prefix, items: [{source, label}]}, one
// item per file, each a button that opens that file's quoted rows. work.md
// row 2 is Cresta's own wording ("Fortune 500"), so citing it says so.
export function sourcesRow(sources) {
  const prefix = citesCrestaDescription(sources) ? SOURCES_CRESTA_NOTES : SOURCES_OWN_NOTES;
  return { prefix, items: sources.map((source) => ({ source, label: sourceRefLabel(source) })) };
}

export const LOCAL_FOOTER = 'answered in your browser · nothing sent to a server';

// The page's own assets and the model runtimes: requests the page makes for
// itself, never to answer a question.
const MODEL_URL_PARTS = [
  '/models/', 'huggingface.co', '.onnx', '.wasm', 'cdn.jsdelivr.net',
  '/agents/needle-router.js', '/agents/chat-worker.js', '/fonts/', 'favicon'
];
// The browser keeps 250 resource entries by default and drops later ones
// silently, so a full buffer proves nothing about the turn.
const RESOURCE_BUFFER_LIMIT = 250;

export function isModelUrl(url) {
  const text = String(url || '');
  return MODEL_URL_PARTS.some((part) => text.indexOf(part) !== -1);
}

// True when no request started during the turn (startMs..endMs, the
// performance.now() clock) apart from model files. entries are
// PerformanceResourceTiming-like {name, startTime}.
// eslint-disable-next-line max-params -- signature predates this change
export function localOnly(entries, startMs, endMs, modelUrl = isModelUrl) {
  if (entries.length >= RESOURCE_BUFFER_LIMIT) return false;
  return !entries.some((entry) => entry.startTime >= startMs && entry.startTime <= endMs && !modelUrl(entry.name));
}

// ─── The settled turn ───────────────────────────────────────────────────

function sectionButton(className, text, controls) {
  const button = makeButton(className, text);
  button.setAttribute('aria-expanded', 'false');
  button.setAttribute('aria-controls', controls);
  return button;
}

// A button's cited figure is made on its first click, kept per button, and
// toggled after that. cite = {page, by, source, id, place}: place(figure) puts a
// new one in the page.
const figureOf = new WeakMap();
function toggleCite(button, cite) {
  const { id } = cite;
  let figure = figureOf.get(button);
  if (!figure) {
    if (!cite.page.rowsFor(cite.source).length) return;
    figure = citeFigure(cite.page, cite.by, cite.source);
    figure.id = id;
    figure.hidden = true;
    button.setAttribute('aria-controls', id);
    cite.place(figure);
    figureOf.set(button, figure);
  }
  figure.hidden = !figure.hidden;
  button.setAttribute('aria-expanded', String(!figure.hidden));
}

// A click on a receipt button (data-receipt = a work.md row) in an answer
// toggles that row's figure right under its bullet. run-view.js passes every
// click in the scrollback here, live and restored turns alike; anything but
// a plain row number is ignored.
let receiptCount = 0;
export function openReceipt(event, page) {
  const target = event.target;
  const button = target && target.closest ? target.closest('button[data-receipt]') : null;
  const item = button && button.closest('li');
  const raw = button ? button.getAttribute('data-receipt') : '';
  if (!item || !RECEIPT_ROW.test(raw)) return;
  receiptCount += 1;
  toggleCite(button, { page, by: 'receipt', source: { file: 'work', lines: [Number(raw)] }, id: 'receipt-' + receiptCount, place: (figure) => item.after(figure) });
}

// The work.md rows the answer's own receipts cite, as one source.
function receiptSources(msgs) {
  const lines = Array.from(msgs.querySelectorAll('button[data-receipt]'), (button) => Number(button.dataset.receipt));
  return lines.length ? [{ file: 'work', lines: lines.filter(Number.isInteger) }] : [];
}

// What a settled turn that ran tools adds. A turn with no tool call keeps
// the plain look. view is the RunView: it owns the tool lines' figures.
export function addAnatomy(view, turn) {
  const tools = Array.from(turn.tools.values());
  const summary = toolSummary(turn.run, tools);
  if (!summary) return;
  addSummary(view, turn, summary);
  if (turn.run.status !== 'passed') return;
  addSources(view, turn, mergeSources(mergeToolSources(tools), receiptSources(turn.block.msgs)));
  addLocal(view, turn);
}

// Opening the summary shows the tool lines and every tool's quoted rows.
function addSummary(view, turn, text) {
  const { tools: list } = turn.block;
  const button = sectionButton('sum', text, list.id);
  button.addEventListener('click', () => {
    const open = button.getAttribute('aria-expanded') !== 'true';
    button.setAttribute('aria-expanded', String(open));
    list.hidden = !open;
    Array.from(turn.tools.values()).filter((tool) => tool.res).forEach((tool) => view.setLines(turn, tool, open));
  });
  list.hidden = true;
  list.before(button);
}

// "sources · Emin's own notes · work.md:2-5, 7": each file toggles its rows.
function addSources(view, turn, sources) {
  const { prefix, items } = sourcesRow(sources);
  if (!items.length) return;
  const { block } = turn;
  const row = make('p', 'src-row', prefix);
  const figures = make('div', 'src-figs');
  items.forEach((item, index) => {
    const button = makeButton('sb', item.label);
    button.setAttribute('aria-expanded', 'false');
    button.addEventListener('click', () => toggleCite(button, { page: view.opts.page, by: 'sources', source: item.source, id: `${block.id}-source-${index}`, place: (figure) => figures.append(figure) }));
    row.append(' · ', button);
  });
  block.sources.append(row, figures);
  block.sources.hidden = false;
}

// True only while no model download runs and no request left for anything
// but model files; the claim is checked against the resource timing log.
// A footer that waited out a download stays in view.pendingLocal and is
// tried again when it ends.
export function addLocal(view, turn) {
  const models = view.opts.store.getState().models || {};
  if (models.needleLoading || models.llmLoading) {
    view.pendingLocal.add(turn);
    return;
  }
  view.pendingLocal.delete(turn);
  if (typeof performance.getEntriesByType !== 'function') return;
  const entries = performance.getEntriesByType('resource');
  if (localOnly(entries, turn.run.startMs, turn.run.endAt)) {
    turn.block.local.textContent = LOCAL_FOOTER;
    turn.block.local.hidden = false;
  }
}

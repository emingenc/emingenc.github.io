// Command/file menu DOM: a combobox (#input) driving a listbox (#cmdList).
// Ranking and the keyboard model live in ./palette.js; this file only
// builds and updates the menu markup and wires its events.
import {
  COMMANDS,
  GROUPS,
  normalize,
  filterEntries,
  defaultIndex,
  canRunOnEnter,
  destructiveHint,
  completionFor
} from './palette.js';

const HINT_TEXT = '↑↓ · ↵ · Tab · Esc';
const MOVE_DOWN = 1;
const MOVE_UP = -1;

function createState() {
  return { open: false, rows: [], index: -1 };
}

function buildFileEntries(files) {
  return files.map((file) => ({
    kind: 'file', id: file.id, name: file.name, tok: file.tok, group: 'files', destructive: false
  }));
}

function allEntries(opts) {
  return COMMANDS.concat(buildFileEntries(opts.getFiles()));
}

// Stays open only while a single slash-prefixed token is being composed.
function isSlashQuery(value) {
  return value.startsWith('/') && !/\s/.test(value.slice(1));
}

function nameSpan(entry) {
  const span = document.createElement('span');
  span.className = 'cmd-name';
  span.textContent = entry.kind === 'cmd' ? `/${entry.name}` : entry.name;
  return span;
}

function fileDescription(entry) {
  return `Show the file · ≈${entry.tok} tok`;
}

function descSpan(entry) {
  const span = document.createElement('span');
  span.className = 'cmd-desc';
  span.textContent = entry.kind === 'cmd' ? entry.desc : fileDescription(entry);
  return span;
}

function tagSpan() {
  const span = document.createElement('span');
  span.className = 'cmd-tag';
  span.textContent = 'file';
  return span;
}

function enterSpan() {
  const span = document.createElement('span');
  span.className = 'cmd-enter';
  span.textContent = '↵';
  return span;
}

function buildRow(entry, showTag) {
  const row = document.createElement('li');
  row.className = 'cmd-row';
  row.setAttribute('role', 'option');
  row.setAttribute('aria-selected', 'false');
  row.appendChild(nameSpan(entry));
  row.appendChild(descSpan(entry));
  if (showTag && entry.kind === 'file') row.appendChild(tagSpan());
  return row;
}

function appendRow(listEl, entry, showTag) {
  const el = buildRow(entry, showTag);
  listEl.appendChild(el);
  return { el, entry, enterEl: null };
}

function groupLabel(name) {
  const el = document.createElement('li');
  el.className = 'cmd-group-label';
  el.setAttribute('role', 'presentation');
  el.textContent = name;
  return el;
}

function appendGroup(groupName, entries, listEl) {
  const groupRows = entries.filter((entry) => entry.group === groupName);
  if (!groupRows.length) return [];
  listEl.appendChild(groupLabel(groupName));
  return groupRows.map((entry) => appendRow(listEl, entry, false));
}

function renderGrouped(entries, listEl) {
  return GROUPS.flatMap((groupName) => appendGroup(groupName, entries, listEl));
}

function renderFlat(entries, listEl) {
  return entries.map((entry) => appendRow(listEl, entry, true));
}

function clearChildren(el) {
  el.textContent = '';
}

function assignRowIds(rows) {
  rows.forEach((rowMeta, index) => { rowMeta.el.id = `cmd-opt-${index}`; });
}

// Empty query -> grouped browse view (GROUPS order, files last). Any other
// query -> one flat ranked list, file rows tagged.
function renderRows(query, entries, opts) {
  clearChildren(opts.list);
  const rows = query
    ? renderFlat(filterEntries(entries, query), opts.list)
    : renderGrouped(entries, opts.list);
  assignRowIds(rows);
  opts.empty.hidden = rows.length > 0;
  return rows;
}

function setChrome(opts, isOpen) {
  opts.menu.hidden = !isOpen;
  opts.scrim.hidden = !isOpen;
  opts.input.setAttribute('aria-expanded', String(isOpen));
}

function setHint(opts, text, isWarning) {
  opts.hint.textContent = text;
  opts.hint.classList.toggle('cmd-destructive-hint', isWarning);
}

function syncActiveDescendant(input, rows, index) {
  const rowMeta = rows[index];
  if (!rowMeta) { input.removeAttribute('aria-activedescendant'); return; }
  input.setAttribute('aria-activedescendant', rowMeta.el.id);
  rowMeta.el.scrollIntoView({ block: 'nearest' });
}

function setEnterHint(rowMeta, selected) {
  if (selected && !rowMeta.enterEl) {
    rowMeta.enterEl = enterSpan();
    rowMeta.el.appendChild(rowMeta.enterEl);
  } else if (!selected && rowMeta.enterEl) {
    rowMeta.el.removeChild(rowMeta.enterEl);
    rowMeta.enterEl = null;
  }
}

function highlightRows(rows, index) {
  rows.forEach((rowMeta, rowIndex) => {
    const selected = rowIndex === index;
    rowMeta.el.setAttribute('aria-selected', String(selected));
    setEnterHint(rowMeta, selected);
  });
}

// Re-render clears any destructive warning left from a previous Enter/click.
function highlight(state, opts) {
  setHint(opts, HINT_TEXT, false);
  highlightRows(state.rows, state.index);
  syncActiveDescendant(opts.input, state.rows, state.index);
}

function showMenu(state, opts, query) {
  state.rows = renderRows(query, allEntries(opts), opts);
  wireRowClicks(state.rows, state, opts);
  state.index = defaultIndex(state.rows, query);
  state.open = true;
  setChrome(opts, true);
  highlight(state, opts);
}

function hideMenu(state, opts) {
  state.open = false;
  state.rows = [];
  state.index = -1;
  setChrome(opts, false);
  setHint(opts, HINT_TEXT, false);
  opts.input.removeAttribute('aria-activedescendant');
}

function moveSelection(state, opts, delta) {
  const total = state.rows.length;
  if (!total) return;
  state.index = (state.index + delta + total) % total;
  highlight(state, opts);
}

function selectedEntry(state) {
  const rowMeta = state.rows[state.index];
  return rowMeta ? rowMeta.entry : null;
}

// Same gate for Enter and a mouse click: a destructive row only runs once
// its name is typed out in full, everywhere it can be triggered.
function runOrHint(state, opts, entry) {
  if (!canRunOnEnter(entry, opts.input.value)) {
    setHint(opts, destructiveHint(entry), true);
    return;
  }
  hideMenu(state, opts);
  if (entry.kind === 'file') opts.onOpenFile(entry.id);
  else opts.onRun(`/${entry.name}`);
}

function completeInput(state, opts) {
  const entry = selectedEntry(state);
  if (!entry) return;
  opts.input.value = completionFor(entry);
  hideMenu(state, opts);
}

function onRowClick(rowMeta, state, opts) {
  state.index = state.rows.indexOf(rowMeta);
  highlight(state, opts);
  runOrHint(state, opts, rowMeta.entry);
}

function wireRowClicks(rows, state, opts) {
  rows.forEach((rowMeta) => {
    rowMeta.el.addEventListener('click', () => onRowClick(rowMeta, state, opts));
  });
}

function wireChrome(state, opts) {
  opts.closeBtn.addEventListener('click', () => hideMenu(state, opts));
  opts.scrim.addEventListener('click', () => hideMenu(state, opts));
}

function syncToInput(state, opts) {
  const value = opts.input.value;
  if (!isSlashQuery(value)) {
    if (state.open) hideMenu(state, opts);
    return;
  }
  showMenu(state, opts, normalize(value));
}

function openMenu(state, opts) {
  showMenu(state, opts, '');
}

function closeMenu(state, opts) {
  hideMenu(state, opts);
}

function consumeTab(state, opts, evt) {
  evt.preventDefault();
  completeInput(state, opts);
  return true;
}

function consumeEscape(state, opts, evt) {
  evt.preventDefault();
  hideMenu(state, opts);
  return true;
}

function consumeEnter(state, opts, evt) {
  const entry = selectedEntry(state);
  if (!entry) return false;
  evt.preventDefault();
  runOrHint(state, opts, entry);
  return true;
}

function handleKeydown(state, opts, evt) {
  if (!state.open) return false;
  if (evt.key === 'ArrowDown') { evt.preventDefault(); moveSelection(state, opts, MOVE_DOWN); return true; }
  if (evt.key === 'ArrowUp') { evt.preventDefault(); moveSelection(state, opts, MOVE_UP); return true; }
  if (evt.key === 'Tab') return consumeTab(state, opts, evt);
  if (evt.key === 'Enter') return consumeEnter(state, opts, evt);
  if (evt.key === 'Escape') return consumeEscape(state, opts, evt);
  return false;
}

export function createPaletteView(opts) {
  const state = createState();
  wireChrome(state, opts);
  return {
    syncToInput: () => syncToInput(state, opts),
    open: () => openMenu(state, opts),
    close: () => closeMenu(state, opts),
    isOpen: () => state.open,
    handleKeydown: (evt) => handleKeydown(state, opts, evt)
  };
}

// page-view.js — highlights the résumé lines an agent tool just read: the
// `.reading`/`.was-read` classes on [data-line] elements, a per-file margin
// tag naming the tool and lines, the jump chip when a highlight happens
// off-screen, and the file token counts the palette/composer show.
// Framework-free ES module; every export is a no-op when its DOM is absent.
import { lineRangeLabel } from './steps.js';

const RECENT_SCROLL_MS = 1500;
const PULSE_MS = 1200;
const CHARS_PER_TOKEN = 4;
const SCROLL_KEYS = new Set(['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' ']);
const OFF_PAGE_TARGETS = 'input, textarea, select, [contenteditable], #ask-user-modal';
const BUTTON_TARGETS = 'button, summary, [role="button"]';

function scrollBehavior() {
  return matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
}

function scrollToEl(el) {
  if (el) el.scrollIntoView({ block: 'center', behavior: scrollBehavior() });
}

function fileSection(view, file) {
  return view.doc.querySelector(`#file-${file}`);
}

function allLineEls(section) {
  return section ? Array.from(section.querySelectorAll('[data-line]')) : [];
}

function resolveLineEls(section, lines) {
  if (!lines.length) return allLineEls(section);
  const wanted = new Set(lines);
  return allLineEls(section).filter((el) => wanted.has(Number(el.dataset.line)));
}

function sourceLineEls(view, source) {
  return resolveLineEls(fileSection(view, source.file), source.lines);
}

/* ---------------- reading class ---------------- */

// A later step's evidence must not erase an earlier step's: settle (not
// strip) whatever is still .reading before a new highlight, so a multi-step
// turn leaves a full was-read trail even though run-view only calls the
// public settle() once, at turn end.
function settleReadingClass(view) {
  view.doc.querySelectorAll('.reading').forEach(settleOne);
}

function settleOne(el) {
  el.classList.remove('reading');
  el.classList.add('was-read');
}

function addReadingClass(els) {
  els.forEach((el) => el.classList.add('reading'));
}

/* ---------------- margin tag ---------------- */

function buildMarginTag() {
  const tag = document.createElement('div');
  tag.className = 'margin-tag';
  tag.setAttribute('aria-hidden', 'true');
  const tool = document.createElement('span');
  tool.className = 'mt-tool';
  const lines = document.createElement('span');
  lines.className = 'mt-lines';
  tag.append(tool, lines);
  return tag;
}

function marginTagFor(body) {
  return body.querySelector('.margin-tag') || appendMarginTag(body);
}

function appendMarginTag(body) {
  const tag = buildMarginTag();
  body.appendChild(tag);
  return tag;
}

function sizeMarginTag(tag, first, last) {
  const top = first.offsetTop;
  const bottom = last.offsetTop + last.offsetHeight;
  tag.style.setProperty('--mt-top', `${top}px`);
  tag.style.setProperty('--mt-h', `${bottom - top}px`);
}

function labelMarginTag(tag, tool, lines) {
  tag.querySelector('.mt-tool').textContent = `${tool}()`;
  tag.querySelector('.mt-lines').textContent = lineRangeLabel(lines);
}

function placeMarginTag(section, els, evidence) {
  const body = section.querySelector('.file-body');
  if (!body) return;
  const tag = marginTagFor(body);
  sizeMarginTag(tag, els[0], els[els.length - 1]);
  labelMarginTag(tag, evidence.tool, evidence.lines);
}

function readingSpan(body) {
  return Array.from(body.querySelectorAll('.reading, .was-read'));
}

function repositionTag(tag) {
  const body = tag.parentElement;
  const els = body ? readingSpan(body) : [];
  if (els.length) sizeMarginTag(tag, els[0], els[els.length - 1]);
}

function repositionMarginTags(view) {
  view.doc.querySelectorAll('.margin-tag').forEach(repositionTag);
}

/* ---------------- jump chip ---------------- */

function hideJumpChip(view) {
  if (view.jumpChip) view.jumpChip.hidden = true;
}

function jumpChipLabel(view, source, el) {
  const section = fileSection(view, source.file);
  const name = section ? section.dataset.name : '';
  return `↓ Back to ${name} L${el.dataset.line}`;
}

function showJumpChip(view, source, el) {
  const chip = view.jumpChip;
  if (!chip) return;
  chip.textContent = jumpChipLabel(view, source, el);
  chip.hidden = false;
  chip.onclick = () => hideAndReveal(chip, el);
}

function hideAndReveal(chip, el) {
  scrollToEl(el);
  chip.hidden = true;
}

/* ---------------- user-scroll tracking ---------------- */

function markUserScroll(view) {
  view.lastUserScrollAt = performance.now();
}

// Wheel, touch and keys aimed at a text field, the ask_user dialog or the
// agent column (its composer, command menu, transcript and phone sheet) type
// text, pick an option or scroll that box, not the page.
function scrollsPage(view, target) {
  if (target.closest && target.closest(OFF_PAGE_TARGETS)) return false;
  return !(view.agentCol && view.agentCol.contains(target));
}

function onScrollInput(view, evt) {
  if (scrollsPage(view, evt.target)) markUserScroll(view);
}

function spacePressesButton(evt) {
  return evt.key === ' ' && Boolean(evt.target.closest && evt.target.closest(BUTTON_TARGETS));
}

function onScrollKey(view, evt) {
  if (SCROLL_KEYS.has(evt.key) && !spacePressesButton(evt)) onScrollInput(view, evt);
}

function userScrolledRecently(view) {
  return performance.now() - view.lastUserScrollAt < RECENT_SCROLL_MS;
}

function trackUserScroll(view) {
  window.addEventListener('wheel', (evt) => onScrollInput(view, evt), { passive: true });
  window.addEventListener('touchmove', (evt) => onScrollInput(view, evt), { passive: true });
  window.addEventListener('keydown', (evt) => onScrollKey(view, evt));
}

/* ---------------- highlight / settle / clear ---------------- */

function highlightSource(view, tool, source) {
  const section = fileSection(view, source.file);
  const els = resolveLineEls(section, source.lines);
  addReadingClass(els);
  if (els.length) placeMarginTag(section, els, { tool, lines: source.lines });
}

function revealFirst(view, sources) {
  const source = sources[0];
  const els = source ? sourceLineEls(view, source) : [];
  if (!els.length) return;
  if (userScrolledRecently(view)) showJumpChip(view, source, els[0]);
  else scrollToEl(els[0]);
}

function highlight(view, sources, tool) {
  settleReadingClass(view);
  sources.forEach((source) => highlightSource(view, tool, source));
  revealFirst(view, sources);
}

function clearMarks(view) {
  view.doc.querySelectorAll('.reading, .was-read, .pulse').forEach(unmarkOne);
  view.doc.querySelectorAll('.margin-tag').forEach((tag) => tag.remove());
  hideJumpChip(view);
}

function unmarkOne(el) {
  el.classList.remove('reading', 'was-read', 'pulse');
}

/* ---------------- reveal(file, line) ---------------- */

function pulse(view, el) {
  if (view.pulseTimer) clearTimeout(view.pulseTimer);
  el.classList.remove('pulse');
  void el.offsetWidth;
  el.classList.add('pulse');
  view.pulseTimer = setTimeout(() => el.classList.remove('pulse'), PULSE_MS);
}

function revealLine(view, section, line) {
  const el = section.querySelector(`[data-line="${line}"]`);
  if (!el) return;
  scrollToEl(el);
  pulse(view, el);
}

function reveal(view, file, line) {
  const section = fileSection(view, file);
  if (!section) return;
  revealLine(view, section, line);
  section.focus({ preventScroll: true });
}

/* ---------------- files() / tokensFor() ---------------- */

function fileBodyText(section) {
  const body = section.querySelector('.file-body');
  return body ? body.textContent : '';
}

function tokensForChars(chars) {
  return Math.round(chars / CHARS_PER_TOKEN);
}

function writeTokLabel(view, id, tok) {
  if (view.tokWritten.has(id)) return;
  view.tokWritten.add(id);
  const label = view.doc.querySelector(`.tab-tok[data-tok="${id}"]`);
  if (label) label.textContent = `≈${tok} tok`;
}

function describeFile(view, section) {
  const id = section.dataset.file;
  const tok = tokensForChars(fileBodyText(section).length);
  writeTokLabel(view, id, tok);
  return { id, name: section.dataset.name, tok };
}

function files(view) {
  return Array.from(view.doc.querySelectorAll('.file')).map((section) => describeFile(view, section));
}

function sourceChars(view, source) {
  return sourceLineEls(view, source).reduce((total, el) => total + el.textContent.length, 0);
}

function tokensFor(view, sources) {
  const chars = sources.reduce((total, source) => total + sourceChars(view, source), 0);
  return tokensForChars(chars);
}

/* ---------------- factory ---------------- */

function noopPageView() {
  return {
    highlight() {},
    settle() {},
    clear() {},
    reveal() {},
    files: () => [],
    tokensFor: () => 0,
  };
}

function observeResize(view) {
  if (typeof ResizeObserver === 'undefined') return;
  new ResizeObserver(() => repositionMarginTags(view)).observe(view.doc);
}

export function createPageView({ doc, jumpChip, agentCol } = {}) {
  if (!doc) return noopPageView();
  const view = { doc, jumpChip, agentCol, tokWritten: new Set(), lastUserScrollAt: -Infinity, pulseTimer: null };
  trackUserScroll(view);
  observeResize(view);
  return {
    highlight: (sources, tool) => highlight(view, sources, tool),
    settle: () => settleReadingClass(view),
    clear: () => clearMarks(view),
    reveal: (file, line) => reveal(view, file, line),
    files: () => files(view),
    tokensFor: (sources) => tokensFor(view, sources),
  };
}

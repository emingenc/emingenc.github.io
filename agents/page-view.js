// page-view.js — the page around the agent session: the knowledge files its
// tools read (the numbered rows in index.astro's hidden #docWrap, and their
// token counts) and following new output. While a turn runs, the page keeps
// it in view from its prompt line down, unless the visitor scrolls away;
// then the jump chip offers the way back to the newest output.
// Framework-free ES module; a missing element makes its part a no-op.

const CHARS_PER_TOKEN = 4;
const NEAR_BOTTOM_PX = 48;
const USER_SCROLL_MS = 1500;
const USER_INPUTS = ['wheel', 'touchmove', 'pointerdown', 'keydown'];

/* ---------------- knowledge files ---------------- */

function fileSection(view, file) {
  return view.doc ? view.doc.querySelector('#file-' + file) : null;
}

function rowOf(el) {
  return { line: Number(el.dataset.line), text: el.textContent, data: el.dataset };
}

// An empty source.lines means the whole file, as in steps.js.
function rowsFor(view, source) {
  const section = fileSection(view, source.file);
  const rows = section ? Array.from(section.querySelectorAll('[data-line]'), rowOf) : [];
  const wanted = new Set(source.lines);
  return wanted.size ? rows.filter((row) => wanted.has(row.line)) : rows;
}

function tokensForChars(chars) {
  return Math.round(chars / CHARS_PER_TOKEN);
}

function tokensFor(view, sources) {
  const rows = sources.flatMap((source) => rowsFor(view, source));
  return tokensForChars(rows.reduce((total, row) => total + row.text.length, 0));
}

function describeFile(section) {
  const body = section.querySelector('.file-body');
  return { id: section.dataset.file, name: section.dataset.name, tok: tokensForChars(body ? body.textContent.length : 0) };
}

function files(view) {
  return view.doc ? Array.from(view.doc.querySelectorAll('.file'), describeFile) : [];
}

/* ---------------- following new output ---------------- */

function maxScroll() {
  return Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
}

function topGap() {
  return parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
}

// Once a turn outgrows the screen, its prompt line stays at the top: the
// page follows the output down to there, never past it.
function followTarget(view) {
  const bottom = maxScroll();
  if (!view.anchor || !view.anchor.isConnected) return bottom;
  const top = view.anchor.getBoundingClientRect().top + window.scrollY - topGap();
  return Math.min(bottom, Math.max(0, top));
}

function setChip(view, show) {
  if (view.chip && view.chip.hidden === show) view.chip.hidden = !show;
}

function follow(view) {
  const target = followTarget(view);
  if (Math.abs(window.scrollY - target) >= 1) {
    view.scrolledTo = target;
    window.scrollTo(0, target);
  }
  setChip(view, maxScroll() - target > NEAR_BOTTOM_PX);
}

// New output while the visitor reads elsewhere shows the chip instead.
function onGrow(view, height) {
  const grew = height > view.height;
  view.height = height;
  if (view.following) follow(view);
  else if (grew) setChip(view, maxScroll() - window.scrollY > NEAR_BOTTOM_PX);
}

function pin(view, anchor) {
  view.following = true;
  view.anchor = anchor || null;
  view.userAt = -Infinity;
  follow(view);
}

/* ---------------- the visitor's own scrolling ---------------- */

// The page's own scroll lands where follow() sent it. Any other scroll
// right after a wheel, touch, pointer or key input (a scrollbar drag, Tab,
// find-in-page) is the visitor's; one with no input is the browser clamping
// after a resize or shrink, and changes nothing.
function isVisitorScroll(view) {
  const own = Math.abs(window.scrollY - view.scrolledTo) < 1;
  view.scrolledTo = NaN;
  return !own && performance.now() - view.userAt <= USER_SCROLL_MS;
}

// Only a scroll the visitor made decides: back at the bottom, the page
// follows again; anywhere else, it stays put.
function onScroll(view) {
  if (!isVisitorScroll(view)) return;
  view.following = maxScroll() - window.scrollY <= NEAR_BOTTOM_PX;
  if (!view.following) return;
  view.anchor = null;
  setChip(view, false);
}

function trackScrolling(view) {
  const mark = () => { view.userAt = performance.now(); };
  for (const type of USER_INPUTS) window.addEventListener(type, mark, { passive: true });
  window.addEventListener('scroll', () => onScroll(view), { passive: true });
  if (view.list && typeof ResizeObserver !== 'undefined') {
    new ResizeObserver((entries) => onGrow(view, entries[entries.length - 1].contentRect.height)).observe(view.list);
  }
}

/* ---------------- factory ---------------- */

// doc: #docWrap (the knowledge files); chip: the jump chip; list: the
// session's scrollback, whose growth the page follows.
export function createPageView({ doc, chip, list } = {}) {
  const view = { doc, chip, list, following: false, anchor: null, height: 0, scrolledTo: NaN, userAt: -Infinity };
  trackScrolling(view);
  if (chip) chip.addEventListener('click', () => pin(view, null));
  return {
    files: () => files(view),
    rowsFor: (source) => rowsFor(view, source),
    tokensFor: (sources) => tokensFor(view, sources),
    pin: (anchor) => pin(view, anchor),
  };
}

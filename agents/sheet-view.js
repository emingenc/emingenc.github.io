// sheet-view.js — the phone bottom sheet: idle/peek/expanded state, inert
// content while collapsed, focus management on open/close, and the CSS vars
// (--composer-h, --vvh, --sheet-h) layout depends on. Framework-free ES
// module; a no-op API when the panel element is absent.

const PHONE_MAX_WIDTH = 860;
const SHEET_IDLE = 'idle';
const SHEET_PEEK = 'peek';
const SHEET_EXPANDED = 'expanded';

function isPhone(view) {
  return view.phoneQuery.matches;
}

function applyInert(view) {
  if (!view.content) return;
  view.content.inert = isPhone(view) && view.current !== SHEET_EXPANDED;
}

function applySheetHeight(view) {
  const height = view.panel.getBoundingClientRect().height;
  document.documentElement.style.setProperty('--sheet-h', `${height}px`);
}

function applyState(view) {
  view.panel.dataset.sheet = view.current;
  if (view.handle) view.handle.setAttribute('aria-expanded', String(view.current === SHEET_EXPANDED));
  applyInert(view);
  applySheetHeight(view);
}

function firstFocusTarget(view) {
  if (!view.content) return null;
  return view.content.querySelector('.turn-query') || view.content.querySelector('h1, h2, h3, h4, h5, h6');
}

// The newest .turn-query already ships with tabindex="-1" (DOM contract);
// the idle-panel's fallback heading may not, so focus() would silently
// no-op on it without this.
function ensureFocusable(el) {
  if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');
}

function focusContent(view) {
  const target = firstFocusTarget(view);
  if (!target) return;
  ensureFocusable(target);
  target.focus({ preventScroll: true });
}

function restoreFocus(view) {
  const target = view.restoreFocusTo || view.handle;
  view.restoreFocusTo = null;
  if (target) target.focus({ preventScroll: true });
}

function setState(view, next) {
  view.current = next;
  applyState(view);
}

function leaveExpanded(view) {
  if (view.current === SHEET_EXPANDED) restoreFocus(view);
}

function sheetIdle(view) {
  leaveExpanded(view);
  setState(view, SHEET_IDLE);
}

function sheetPeek(view) {
  leaveExpanded(view);
  setState(view, SHEET_PEEK);
}

function sheetExpand(view) {
  if (view.current !== SHEET_EXPANDED) view.restoreFocusTo = document.activeElement;
  setState(view, SHEET_EXPANDED);
  focusContent(view);
}

/* ---------------- click wiring ---------------- */

function onHandleClick(view, evt) {
  evt.stopPropagation();
  if (view.current === SHEET_EXPANDED) sheetPeek(view);
  else sheetExpand(view);
}

function onPanelClick(view) {
  if (isPhone(view) && view.current !== SHEET_EXPANDED) sheetExpand(view);
}

function wireClicks(view) {
  if (view.handle) view.handle.addEventListener('click', (evt) => onHandleClick(view, evt));
  view.panel.addEventListener('click', () => onPanelClick(view));
  view.phoneQuery.addEventListener('change', () => applyInert(view));
}

/* ---------------- CSS vars: composer height, viewport height ---------------- */

function applyComposerHeight(view) {
  if (!view.composer) return;
  document.documentElement.style.setProperty('--composer-h', `${view.composer.offsetHeight}px`);
}

function watchComposer(view) {
  if (!view.composer) return;
  if (typeof ResizeObserver === 'undefined') {
    window.addEventListener('resize', () => applyComposerHeight(view));
  } else {
    new ResizeObserver(() => applyComposerHeight(view)).observe(view.composer);
  }
  applyComposerHeight(view);
}

function applyViewportHeight() {
  if (!window.visualViewport) return;
  document.documentElement.style.setProperty('--vvh', `${window.visualViewport.height}px`);
}

function watchViewport() {
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', applyViewportHeight);
    window.visualViewport.addEventListener('scroll', applyViewportHeight);
  }
  applyViewportHeight();
}

/* ---------------- factory ---------------- */

function noopSheetView() {
  return {
    isPhone: () => false,
    state: () => SHEET_IDLE,
    idle() {},
    peek() {},
    expand() {},
    setSummary() {},
  };
}

function setSummary(view, text) {
  if (view.summary) view.summary.textContent = text;
}

function buildView(elements) {
  const { panel, handle, summary, content, composer } = elements;
  return {
    panel, handle, summary, content, composer,
    phoneQuery: matchMedia(`(max-width: ${PHONE_MAX_WIDTH}px)`),
    current: panel.dataset.sheet || SHEET_IDLE,
    restoreFocusTo: null,
  };
}

export function createSheetView(elements = {}) {
  if (!elements.panel) return noopSheetView();
  const view = buildView(elements);
  wireClicks(view);
  watchComposer(view);
  watchViewport();
  applyState(view);
  return {
    isPhone: () => isPhone(view),
    state: () => view.current,
    idle: () => sheetIdle(view),
    peek: () => sheetPeek(view),
    expand: () => sheetExpand(view),
    setSummary: (text) => setSummary(view, text),
  };
}

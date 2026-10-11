import { uiPincerCommit, uiPincerNow, uiPincerPlayable } from './pincer-flow.js';


const SLIDE_MIN_PX = 12;
const NO_POINTER = null;
const PRIMARY_BUTTON = 0;
const CANNONS = { l: { move: 'l', way: 1 }, r: { move: 'r', way: -1 } };
const uiSlide = { app: null, handle: null, pointerId: NO_POINTER, from: null };

function uiSlideClosest(node, selector) {
  return node && typeof node.closest === 'function' ? node.closest(selector) : null;
}
function uiSlideHandleOf(target) {
  const chip = uiSlideClosest(target, '[data-pincer-handle]');
  const handle = chip ? chip.getAttribute('data-pincer-handle') : null;
  return Object.hasOwn(CANNONS, handle) ? handle : null;
}
function uiSlideIsOurs(app, event) {
  if (uiSlide.from === null || uiSlide.app !== app) return false;
  return uiSlide.pointerId === NO_POINTER || event.pointerId === uiSlide.pointerId;
}

function uiPincerSlideCancel() {
  if (uiSlide.app && uiSlide.app.rig && uiSlide.app.rig.arena) uiSlide.app.rig.arena.slide = null;
  Object.assign(uiSlide, { app: null, handle: null, pointerId: NO_POINTER, from: null });
}
function uiPincerSlideDown(app, event) {
  uiPincerSlideCancel();
  if (!uiPincerPlayable(app) || event.button > PRIMARY_BUTTON) return false;
  const handle = uiSlideHandleOf(event.target);
  if (!handle) return false;
  Object.assign(uiSlide, { app, handle, pointerId: event.pointerId ?? NO_POINTER, from: { x: event.clientX, y: event.clientY } });
  app.rig.arena.slide = { handle };
  return true;
}
function uiSlideReach(event) {
  const cannon = CANNONS[uiSlide.handle];
  return (event.clientX - uiSlide.from.x) * cannon.way;
}
function uiPincerSlideUp(app, event) {
  if (!uiSlideIsOurs(app, event)) return null;
  const move = CANNONS[uiSlide.handle].move;
  const far = uiSlideReach(event) >= SLIDE_MIN_PX;
  uiPincerSlideCancel();
  return far && uiPincerCommit(app, move, uiPincerNow()) ? move : null;
}

export { uiPincerSlideDown, uiPincerSlideUp, uiPincerSlideCancel };

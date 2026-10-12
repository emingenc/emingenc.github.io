
const DRAG_MIN_PX = 24;
const NO_POINTER = null;
const PRIMARY_BUTTON = 0;
const HANDLE_SELECTOR = '[data-net-handle]';
const BUTTON_SELECTOR = '[data-action]';
const HANDLES = { body: { move: 'extend' }, tail: { move: 'shrink' } };

function closestOf(node, selector) {
  return node && typeof node.closest === 'function' ? node.closest(selector) : null;
}
function handleOf(target) {
  if (closestOf(target, BUTTON_SELECTOR)) return null;
  const chip = closestOf(target, HANDLE_SELECTOR);
  const handle = chip ? chip.getAttribute(HANDLE_SELECTOR.slice(1, -1)) : null;
  return Object.hasOwn(HANDLES, handle) ? handle : null;
}
const uiDrag = { app: null, handle: null, pointerId: NO_POINTER, from: null };

function uiNetDragIdle() {
  Object.assign(uiDrag, { app: null, handle: null, pointerId: NO_POINTER, from: null });
}
function uiNetDragInFlight(app) {
  return uiDrag.from !== null && uiDrag.app === app;
}
function uiNetDragIsMine(event) {
  return uiDrag.pointerId === NO_POINTER || event.pointerId === uiDrag.pointerId;
}

function uiNetDragCancel() {
  if (uiDrag.app && uiDrag.app.rig && uiDrag.app.rig.arena) uiDrag.app.rig.arena.drag = null;
  uiNetDragIdle();
}
function uiNetDragDown(port, app, event) {
  if (uiNetDragInFlight(app) && !uiNetDragIsMine(event)) return false;
  uiNetDragCancel();
  const handle = handleOf(event.target);
  if (!port.playable(app) || event.button > PRIMARY_BUTTON || !handle) return false;
  Object.assign(uiDrag, { app, handle, pointerId: event.pointerId ?? NO_POINTER, from: { x: event.clientX, y: event.clientY } });
  app.rig.arena.drag = { handle };
  return true;
}
function uiNetDragUp(port, app, event) {
  if (!uiNetDragInFlight(app) || !uiNetDragIsMine(event)) return null;
  const move = HANDLES[uiDrag.handle].move;
  const far = event.clientX - uiDrag.from.x >= DRAG_MIN_PX;
  uiNetDragCancel();
  return far && port.commit(app, move, port.now()) ? move : null;
}

function uiNetDrag(port) {
  return {
    down: (app, event) => uiNetDragDown(port, app, event),
    up: (app, event) => uiNetDragUp(port, app, event),
    cancel: uiNetDragCancel,
  };
}

export { uiNetDrag };

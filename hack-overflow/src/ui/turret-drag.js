import { uiTurretPlayable } from './turret-flow.js';
import { uiTurretFieldClass } from './turret-scene.js';


const DRAG_SLOP_PX = 6;
const NO_POINTER = null;
const uiDrag = { app: null, bay: -1, n: 0, pointerId: NO_POINTER, from: null, hover: null, listening: false };

function uiDragClosest(node, selector) {
  return node && typeof node.closest === 'function' ? node.closest(selector) : null;
}
function uiDragRect(node) {
  return node && typeof node.getBoundingClientRect === 'function' ? node.getBoundingClientRect() : { left: 0, top: 0 };
}
function uiDragArena() {
  return uiDrag.app && uiDrag.app.rig ? uiDrag.app.rig.arena : null;
}
function uiDragMoveListener(event) {
  uiTurretDragMove(event);
}
function uiDragHover(slotNode) {
  if (uiDrag.hover === slotNode) return;
  if (uiDrag.hover) uiDrag.hover.classList?.remove('is-target');
  uiDrag.hover = slotNode;
  if (slotNode) slotNode.classList?.add('is-target');
}
function uiDragFieldClass() {
  const arena = uiDragArena();
  const field = arena && arena.nodes ? arena.nodes.field : null;
  if (field) field.className = uiTurretFieldClass(arena);
}
function uiDragKeyListener() {
  const arena = uiDragArena();
  if (arena) arena.pointerDriven = false;
}
function uiTurretDragAttach(app) {
  uiDrag.app = app;
  if (uiDrag.listening || typeof document === 'undefined' || !document.addEventListener) return;
  document.addEventListener('pointermove', uiDragMoveListener);
  document.addEventListener('keydown', uiDragKeyListener);
  uiDrag.listening = true;
}
function uiTurretDragCancel() {
  const arena = uiDragArena();
  if (arena) arena.drag = null;
  uiDragHover(null);
  uiDragFieldClass();
  Object.assign(uiDrag, { bay: -1, n: 0, pointerId: NO_POINTER, from: null });
}
function uiTurretDragDetach() {
  uiTurretDragCancel();
  if (uiDrag.listening) {
    document.removeEventListener('pointermove', uiDragMoveListener);
    document.removeEventListener('keydown', uiDragKeyListener);
  }
  uiDrag.listening = false;
  uiDrag.app = null;
}
function uiDragBayOf(app, target) {
  const chip = uiDragClosest(target, '[data-turret-bay]');
  return chip ? Number(chip.getAttribute('data-turret-bay')) : app.rig.arena.picked;
}
function uiTurretDragDown(app, event) {
  app.rig.arena.pointerDriven = true;
  if (!uiTurretPlayable(app) || event.button > 0) return false;
  if (!uiDragClosest(event.target, '[data-turret-drag]')) return false;
  const bay = uiDragBayOf(app, event.target);
  const drone = app.rig.arena.state.bay[bay];
  if (!drone) return false;
  Object.assign(uiDrag, { app, bay, n: drone.n, pointerId: event.pointerId ?? NO_POINTER, from: { x: event.clientX, y: event.clientY } });
  app.rig.arena.drag = { bay, n: drone.n, on: false, x: 0, y: 0 };
  return true;
}
function uiDragIsOurs(event) {
  return uiDrag.from !== null && (uiDrag.pointerId === NO_POINTER || event.pointerId === uiDrag.pointerId);
}
function uiDragSlotNode(event) {
  const hit = typeof document.elementFromPoint === 'function' ? document.elementFromPoint(event.clientX, event.clientY) : null;
  return uiDragClosest(hit || event.target, '[data-turret-slot]');
}
function uiDragFollow(arena, event) {
  const nodes = arena.nodes || {};
  const field = uiDragRect(nodes.field);
  const canvas = uiDragRect(nodes.canvas);
  if (nodes.field && nodes.field.style) {
    nodes.field.style.setProperty('--beam-x', Math.round(event.clientX - field.left) + 'px');
    nodes.field.style.setProperty('--beam-y', Math.round(event.clientY - field.top) + 'px');
  }
  if (nodes.ghost) nodes.ghost.textContent = String(arena.state.bay[uiDrag.bay].v);
  Object.assign(arena.drag, { x: event.clientX - canvas.left, y: event.clientY - canvas.top });
}
function uiTurretDragMove(event) {
  const arena = uiDragArena();
  if (!arena || !arena.drag || !uiDragIsOurs(event)) return;
  const moved = Math.hypot(event.clientX - uiDrag.from.x, event.clientY - uiDrag.from.y) >= DRAG_SLOP_PX;
  if (!arena.drag.on && !moved) return;
  const lifted = !arena.drag.on;
  arena.drag.on = true;
  if (lifted) uiDragFieldClass();
  uiDragFollow(arena, event);
  uiDragHover(uiDragSlotNode(event));
}
function uiTurretDragUp(app, event) {
  if (!uiDragIsOurs(event) || uiDrag.app !== app) return null;
  const slotNode = uiDragSlotNode(event);
  const bay = uiDrag.bay;
  uiTurretDragCancel();
  return slotNode ? 'probe:' + bay + ':' + slotNode.getAttribute('data-turret-slot') : null;
}
function uiTurretDragKeep(app) {
  if (uiDrag.from === null) return;
  const drone = app.rig && app.rig.arena ? app.rig.arena.state.bay[uiDrag.bay] : null;
  if (!drone || drone.n !== uiDrag.n || !uiTurretPlayable(app)) uiTurretDragCancel();
  else uiDragFieldClass();
}

export { uiTurretDragAttach, uiTurretDragDetach, uiTurretDragDown, uiTurretDragMove, uiTurretDragUp, uiTurretDragCancel, uiTurretDragKeep };

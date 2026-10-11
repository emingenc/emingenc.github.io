import { HOLD_MS } from '../game/rooms/data/shield-wave1.js';
import { SHIELD_TEXTS } from '../game/rooms/data/shield-texts.js';
import { uiRenderApp } from './app.js';
import { uiArenaToast } from './arena-shell.js';
import { uiShieldCommit, uiShieldPlayable, uiShieldTime } from './shield-flow.js';


const SWIPE_PX = 36;
const SWIPE_SLANT = 1.5;
const NO_POINTER = null;
const uiPress = { app: null, timer: null, pointerId: NO_POINTER, from: null, node: null, fired: false };

function uiPressClosest(node, selector) {
  return node && typeof node.closest === 'function' ? node.closest(selector) : null;
}
function uiPressOurs(event) {
  return uiPress.app !== null && (uiPress.pointerId === NO_POINTER || event.pointerId === uiPress.pointerId);
}
function uiPressReset() {
  if (uiPress.timer !== null) window.clearTimeout(uiPress.timer);
  if (uiPress.node && uiPress.node.classList) uiPress.node.classList.remove('is-holding');
  Object.assign(uiPress, { app: null, timer: null, pointerId: NO_POINTER, from: null, node: null, fired: false });
}
function uiPressHoldDone() {
  const app = uiPress.app;
  uiPress.timer = null;
  if (!app) return;
  uiPress.fired = true;
  if (uiShieldCommit(app, 'breach', uiShieldTime())) uiRenderApp(app);
}
function uiPressStart(app, event, extra) {
  Object.assign(uiPress, { app, pointerId: event.pointerId ?? NO_POINTER, from: { x: event.clientX, y: event.clientY }, node: null, fired: false }, extra);
}
function uiShieldPressDown(app, event) {
  uiPressReset();
  if (!uiShieldPlayable(app) || event.button > 0) return false;
  const breach = uiPressClosest(event.target, '[data-shield-breach]');
  if (breach) {
    uiPressStart(app, event, { node: breach });
    if (breach.classList) breach.classList.add('is-holding');
    uiPress.timer = window.setTimeout(uiPressHoldDone, HOLD_MS);
    return true;
  }
  if (!uiPressClosest(event.target, '[data-shield-field]')) return false;
  uiPressStart(app, event, {});
  return true;
}
function uiSwipeVerb(from, event) {
  const dx = event.clientX - from.x;
  const dy = event.clientY - from.y;
  if (Math.abs(dx) < SWIPE_PX || Math.abs(dx) < Math.abs(dy) * SWIPE_SLANT) return null;
  return dx < 0 ? 'push' : 'pop';
}
function uiShieldPressUp(app, event) {
  if (!uiPressOurs(event) || uiPress.app !== app) return false;
  const { node, fired, from } = uiPress;
  uiPressReset();
  if (node) {
    if (!fired) uiArenaToast(app, SHIELD_TEXTS.toast.hold, 'info');
    return false;
  }
  const verb = from ? uiSwipeVerb(from, event) : null;
  return verb !== null && uiShieldCommit(app, verb, uiShieldTime());
}
function uiShieldPressCancel() {
  uiPressReset();
}

export { uiShieldPressDown, uiShieldPressUp, uiShieldPressCancel };

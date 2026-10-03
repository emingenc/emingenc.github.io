import { BUILD_PHASE } from '../logic/run-phase.js';
import { uiLineRemovePosition } from './line-actions.js';
import { UI_LOCK_HEADING_KEY } from './render-lock-left.js';

const UI_TRAY_NEXT_KEYS = { ArrowRight:1,ArrowDown:1 };
const UI_TRAY_PREV_KEYS = { ArrowLeft:1,ArrowUp:1 };
function uiTrayStep(key) {
if (UI_TRAY_NEXT_KEYS[key]) return 1;
return UI_TRAY_PREV_KEYS[key] ? -1 :0;
}
function uiFocusedTrayPosition() {
const active = document.activeElement;
const raw = active && active.getAttribute('data-tray-position');
return raw === null || raw === undefined ? null :Number(raw);
}
function uiFocusAwaitsTray() {
const active = document.activeElement;
return !active || active === document.body || active.getAttribute('data-focus-key') === UI_LOCK_HEADING_KEY;
}
function uiEnterTray(app) {
const last = app.run.lock.tray.order.length - 1;
app.trayFocusIndex = Math.max(0,Math.min(app.trayFocusIndex,last));
return true;
}
function uiMoveTrayFocus(app,step) {
const current = uiFocusedTrayPosition();
if (current === null) return uiFocusAwaitsTray() && uiEnterTray(app);
const length = app.run.lock.tray.order.length;
app.trayFocusIndex = (current + step + length) % length;
return true;
}
function uiFocusedLineRemoveAction() {
const active = document.activeElement;
const actionId = active && active.getAttribute('data-action');
return actionId && uiLineRemovePosition(actionId) !== null ? actionId :null;
}
function uiSimpleBuildKeyAction(event) {
if (event.key === 'Backspace') return event.shiftKey ? 'clear' :'backspace';
if (event.key === 'r' || event.key === 'R') return 'run';
return event.key === 's' || event.key === 'S' ? 'submit' :null;
}
function uiBuildKeyAction(event,app) {
const step = uiTrayStep(event.key);
if (step !== 0) return uiMoveTrayFocus(app,step) ? { type:'render' } :null;
if (event.key === 'Escape') return { type:'toggle-menu' };
if (event.key === 'Delete') {
const removeId = uiFocusedLineRemoveAction();
return removeId ? { type:'action',id:removeId } :null;
}
const actionId = uiSimpleBuildKeyAction(event);
return actionId ? { type:'action',id:actionId } :null;
}
function uiKeyAction(event,app) {
const result = app.run && app.run.phase === BUILD_PHASE ? uiBuildKeyAction(event,app) :null;
if (result) event.preventDefault();
return result;
}

export { uiKeyAction };

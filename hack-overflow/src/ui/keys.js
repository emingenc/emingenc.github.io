import { BUILD_PHASE, RESULT_PHASE, REVIEW_PHASE } from '../logic/run-phase.js';
import { uiLineRemovePosition } from './line-actions.js';

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
function uiMoveTrayFocus(app,step) {
const current = uiFocusedTrayPosition();
if (current === null) return false;
const length = app.run.lock.tray.order.length;
app.trayFocusIndex = (current + step + length) % length;
return true;
}
function uiFocusedButtonActionId() {
const active = document.activeElement;
return (active && active.getAttribute && active.getAttribute('data-action')) || null;
}
function uiEnterActionId(phase) {
const focused = uiFocusedButtonActionId();
if (focused) return focused;
if (phase === RESULT_PHASE) return 'next';
return phase === REVIEW_PHASE ? 'practice' :null;
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
function uiResolveKeyAction(event,app) {
if (event.key === 'm' || event.key === 'M') return { type:'action',id:'toggle-sound' };
if (app.menuOpen) return event.key === 'Escape' ? { type:'toggle-menu' } :null;
if (!app.run) return null;
if (app.run.phase === BUILD_PHASE) return uiBuildKeyAction(event,app);
const enterId = event.key === 'Enter' ? uiEnterActionId(app.run.phase) :null;
return enterId ? { type:'action',id:enterId } :null;
}
function uiKeyAction(event,app) {
const result = uiResolveKeyAction(event,app);
if (result) event.preventDefault();
return result;
}

export { uiKeyAction };

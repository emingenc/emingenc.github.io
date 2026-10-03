import { tapIntent, tapCellFor, createDpadGesture, dpadDown, dpadUp, dpadClickIsGhost, dpadLeaveScreen } from '../game/tap.js';
import { uiEl, uiPointerIsCoarse } from './dom.js';
import { uiDpadDirFor } from './grid-dpad.js';
import { uiWalkPath, uiWalkPress, uiWalkRelease } from './grid-walk.js';


const UI_TAP_MARKER_MS = 500;

function uiCreateTouchState() {
const marker = uiEl('div',{ className:'tap-marker' });
const node = uiEl('div',{ className:'grid-touch-layer',attrs:{ 'aria-hidden':'true' },children:[marker] });
return {
node,marker,markerTimer:0,markerFrame:0,markerCell:null,
gesture:createDpadGesture(),holdTimers:new Map(),swallowClickUntil:0,
};
}
function uiTouchState(app) {
return app.game.touch || (app.game.touch = uiCreateTouchState());
}
function uiStageRectFor(app,node) {
const canvas = app.game.stage ? app.game.stage.canvas :null;
return (canvas || node).getBoundingClientRect();
}
function uiCellForEvent(app,node,event) {
const rect = uiStageRectFor(app,node);
return tapCellFor(app.game.world,app.game.view,{ left:event.clientX - rect.left,top:event.clientY - rect.top });
}
function uiMarkerRect(view,cell) {
return { left:(cell.col - view.camera.col) * view.tile,top:(cell.row - view.camera.row) * view.tile,size:view.tile };
}
function uiDrawMarker(state,view) {
const rect = uiMarkerRect(view,state.markerCell);
Object.assign(state.marker.style,{ left:rect.left + 'px',top:rect.top + 'px',width:rect.size + 'px',height:rect.size + 'px' });
}
function uiTrackMarker(app,state) {
if (app.game.view) uiDrawMarker(state,app.game.view);
state.markerFrame = window.requestAnimationFrame(function () { uiTrackMarker(app,state); });
}
function uiStopMarker(state) {
window.cancelAnimationFrame(state.markerFrame);
window.clearTimeout(state.markerTimer);
state.marker.className = 'tap-marker';
state.markerCell = null;
}
function uiPlaceMarker(app,state,cell) {
uiStopMarker(state);
state.markerCell = cell;
state.marker.className = 'tap-marker tap-marker-active';
uiTrackMarker(app,state);
state.markerTimer = window.setTimeout(function () { uiStopMarker(state); },UI_TAP_MARKER_MS);
}
function uiHandleTap(app,event) {
const state = uiTouchState(app);
if (!app.game.view || !state.node.contains(event.target)) return false;
if (app.game.travelOpen) return false;
const cell = uiCellForEvent(app,state.node,event);
const intent = tapIntent(app.game.world,app.game.progress,{ from:app.game.avatar.pos,cell });
if (intent.kind === 'none') return false;
uiWalkPath(app,{ dirs:intent.dirs });
uiPlaceMarker(app,state,cell);
return true;
}
function uiClearDpadOnRelease(app) {
const state = uiTouchState(app);
state.holdTimers.forEach(function (timer) { window.clearTimeout(timer); });
state.holdTimers.clear();
state.gesture = createDpadGesture();
state.swallowClickUntil = 0;
}
function uiFocusKeyOf(event) {
const el = event.target && event.target.closest ? event.target.closest('[data-focus-key]') :null;
return el ? el.getAttribute('data-focus-key') :null;
}
function uiSwallowDpadGhostClick(app,event) {
const state = uiTouchState(app);
if (Date.now() < state.swallowClickUntil) {
state.swallowClickUntil = 0;
event.stopPropagation();
return;
}
if (!uiDpadDirFor(event.target)) return;
if (dpadClickIsGhost(state.gesture,Date.now())) {
event.stopPropagation();
return;
}
app.lastFocusKey = uiFocusKeyOf(event) || app.lastFocusKey;
}
function uiClearHoldTimer(state,pointerId) {
const timer = state.holdTimers.get(pointerId);
if (timer === undefined) return;
window.clearTimeout(timer);
state.holdTimers.delete(pointerId);
}
function uiLeaveDpadScreen(state,press) {
const left = dpadLeaveScreen(state.gesture,press);
if (left) Object.assign(state,left);
}
function uiDropStaleDpadPointer(app,event) {
if (app.screen === 'grid') return;
const state = uiTouchState(app);
uiClearHoldTimer(state,event.pointerId);
uiLeaveDpadScreen(state,{ pointerId:event.pointerId,at:Date.now() });
}
function uiWireCaptureGuards(app) {
document.addEventListener('click',function (event) { uiSwallowDpadGhostClick(app,event); },true);
document.addEventListener('pointerdown',function () { uiTouchState(app).swallowClickUntil = 0; },true);
['pointerup','pointercancel'].forEach(function (type) {
document.addEventListener(type,function (event) { uiDropStaleDpadPointer(app,event); },true);
});
}
let uiDpadGuardsWired = false;
function uiWireDpadGuards(app) {
if (uiDpadGuardsWired) return;
uiDpadGuardsWired = true;
uiWireCaptureGuards(app);
document.addEventListener('contextmenu',function (event) {
if (uiDpadDirFor(event.target)) event.preventDefault();
});
window.addEventListener('blur',function () { uiClearDpadOnRelease(app); });
document.addEventListener('visibilitychange',function () {
if (document.hidden) uiClearDpadOnRelease(app);
});
}
function uiGridTouchLayer(app) {
if (!uiPointerIsCoarse()) return null;
uiWireDpadGuards(app);
return uiTouchState(app).node;
}
function uiStartHoldTimer(app,state,press) {
const timer = window.setTimeout(function () {
state.holdTimers.delete(press.pointerId);
if (app.screen === 'grid' && state.gesture.pressed.get(press.pointerId) === press.dir) uiWalkPress(app,press.dir);
},press.delayMs);
state.holdTimers.set(press.pointerId,timer);
}
function uiPressDpad(app,event,dir) {
const state = uiTouchState(app);
const at = Date.now();
const down = dpadDown(state.gesture,{ pointerId:event.pointerId,dir,at });
state.gesture = down.gesture;
uiWalkPress(app,dir);
uiWalkRelease(app,dir);
if (app.screen !== 'grid') { uiLeaveDpadScreen(state,{ pointerId:event.pointerId,at }); return; }
uiStartHoldTimer(app,state,{ pointerId:event.pointerId,dir,delayMs:down.holdAt - at });
}
function uiGridPointerDown(event,app) {
const dir = uiDpadDirFor(event.target);
if (dir && !app.game.travelOpen) uiPressDpad(app,event,dir);
return Boolean(dir);
}
function uiReleaseDpad(app,event) {
const state = uiTouchState(app);
const up = dpadUp(state.gesture,{ pointerId:event.pointerId,at:Date.now() });
state.gesture = up.gesture;
uiClearHoldTimer(state,event.pointerId);
if (up.release === null) return false;
uiWalkRelease(app,up.release);
return true;
}
function uiGridPointerUp(event,app) {
return uiReleaseDpad(app,event) || uiHandleTap(app,event);
}
function uiGridPointerCancel(event,app) {
return uiReleaseDpad(app,event);
}

export { uiGridTouchLayer, uiGridPointerDown, uiGridPointerUp, uiGridPointerCancel };

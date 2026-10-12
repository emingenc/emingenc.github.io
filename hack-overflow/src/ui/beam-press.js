import { liveCells } from '../game/rooms/beam.js';
import { uiBeamCommit,uiBeamTime } from './beam-flow.js';
import { uiRoomPlayable } from './room-flow.js';


const NO_POINTER = null;
const PRIMARY_BUTTON = 0;
const SLIDER_SLOP_PX = 24;
const CLICK_SWALLOW_MS = 600;
const CELL_ACTION = 'beam-cell-';
const uiPress = { app:null,kind:null,cell:null,node:null,pointerId:NO_POINTER };

function uiPressClosest(node,selector) {
return node && typeof node.closest === 'function' ? node.closest(selector) :null;
}
function uiPressCellOf(node) {
const cell = uiPressClosest(node,'[data-beam-cell]');
return cell ? Number(cell.getAttribute('data-beam-cell')) :null;
}
function uiPressOurs(app,event) {
return uiPress.app === app && (uiPress.pointerId === NO_POINTER || event.pointerId === uiPress.pointerId);
}
function uiBeamPressCancel() {
Object.assign(uiPress,{ app:null,kind:null,cell:null,node:null,pointerId:NO_POINTER });
}
function uiBeamPressDown(app,event) {
uiBeamPressCancel();
if (!uiRoomPlayable(app) || event.button > PRIMARY_BUTTON) return false;
app.rig.arena.swallow = null;
const cell = uiPressCellOf(event.target);
const slider = uiPressClosest(event.target,'[data-beam-slider]');
if (cell === null && !slider) return false;
Object.assign(uiPress,{ app,kind:cell === null ? 'slider' :'cell',cell,node:slider,pointerId:event.pointerId ?? NO_POINTER });
return true;
}
function uiReleaseCell(event) {
const probe = typeof document !== 'undefined' && typeof document.elementFromPoint === 'function';
return uiPressCellOf(probe ? document.elementFromPoint(event.clientX,event.clientY) :event.target);
}
function uiSliderCell(node,event,state) {
const box = node.getBoundingClientRect();
const across = event.clientX >= box.left && event.clientX <= box.right && box.width > 0;
const along = event.clientY >= box.top - SLIDER_SLOP_PX && event.clientY <= box.bottom + SLIDER_SLOP_PX;
if (!across || !along) return null;
const live = liveCells(state);
const at = Math.round(((event.clientX - box.left) / box.width) * (live.length - 1));
return live[Math.min(live.length - 1,Math.max(0,at))];
}
function uiPressTarget(app,press,event) {
if (press.kind === 'slider') return uiSliderCell(press.node,event,app.rig.arena.state);
const cell = uiReleaseCell(event);
return cell === press.cell ? null :cell;
}
function uiBeamPressUp(app,event) {
if (!uiPressOurs(app,event)) return false;
const press = { ...uiPress };
uiBeamPressCancel();
const cell = uiPressTarget(app,press,event);
if (cell === null || cell === undefined) return false;
const now = uiBeamTime();
if (!uiBeamCommit(app,'select:' + cell,now)) return false;
app.rig.arena.swallow = { action:CELL_ACTION,until:now + CLICK_SWALLOW_MS };
return true;
}
function uiBeamSwallowed(app,actionId) {
const arena = app.rig.arena;
const swallow = arena.swallow;
arena.swallow = null;
return Boolean(app.clickByPointer && swallow && actionId.startsWith(swallow.action) && uiBeamTime() < swallow.until);
}

export { uiBeamPressDown,uiBeamPressUp,uiBeamPressCancel,uiBeamSwallowed };

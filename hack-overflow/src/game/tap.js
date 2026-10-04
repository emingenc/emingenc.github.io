import { findPath } from './path.js';
import { cellAtPoint } from './viewport.js';
import { isPassable, thingAt } from './world.js';

const INTERACT_KINDS = new Set(['terminal', 'core', 'kernel', 'rig']);
const TAP_TARGET_PX = 44;
const CELL_CENTRE = 0.5;
const AROUND = [-1, 0, 1].flatMap(function (dRow) { return [-1, 0, 1].map(function (dCol) { return { dCol,dRow }; }); });
function reachOffset(world,view,tap) {
const thing = thingAt(world,tap.cell);
if (!thing || !INTERACT_KINDS.has(thing.kind)) return null;
const dx = (tap.cell.col + CELL_CENTRE - view.camera.col) * view.tile - tap.point.left;
const dy = (tap.cell.row + CELL_CENTRE - view.camera.row) * view.tile - tap.point.top;
const half = Math.max(view.tile,TAP_TARGET_PX) / 2;
return Math.abs(dx) <= half && Math.abs(dy) <= half ? dx * dx + dy * dy :null;
}
function thingsAround(world,cell) {
return AROUND.map(function (step) { return thingAt(world,{ col:cell.col + step.dCol,row:cell.row + step.dRow }); })
.filter(function (thing) { return thing && INTERACT_KINDS.has(thing.kind); });
}
function rigSlopCell(world,under) {
if (thingAt(world,under)) return null;
const around = thingsAround(world,under);
if (around.length !== 1 || around[0].kind !== 'rig') return null;
return { col:around[0].col,row:around[0].row };
}
function tapCellFor(world,view,point) {
const under = cellAtPoint(view,point);
const reached = AROUND.map(function (step) {
const cell = { col:under.col + step.dCol,row:under.row + step.dRow };
return { cell,dist:reachOffset(world,view,{ cell,point }) };
}).filter(function (hit) { return hit.dist !== null; });
if (reached.length === 0) return rigSlopCell(world,under) || under;
return reached.reduce(function (best,hit) { return hit.dist < best.dist ? hit :best; }).cell;
}
function kindOfTap(world,progress,cell) {
const thing = thingAt(world,cell);
if (thing && INTERACT_KINDS.has(thing.kind)) return 'interact';
return isPassable(world,progress,cell) ? 'walk' :'blocked';
}
function tapIntent(world,progress,tap) {
const dirs = findPath(world,progress,{ from:tap.from,to:tap.cell });
if (!dirs || dirs.length === 0) return { kind:'none',dirs:null };
return { kind:kindOfTap(world,progress,tap.cell),dirs };
}

const DPAD_HOLD_DELAY_MS = 250;
const DPAD_CLICK_GUARD_MS = 500;
function createDpadGesture() {
return { pressed:new Map(),lastDpadAt:-Infinity };
}
function dpadDown(gesture,down) {
const pressed = new Map(gesture.pressed);
pressed.set(down.pointerId,down.dir);
return { gesture:{ pressed,lastDpadAt:down.at },holdAt:down.at + DPAD_HOLD_DELAY_MS };
}
function dpadUp(gesture,up) {
if (!gesture.pressed.has(up.pointerId)) return { gesture,release:null };
const pressed = new Map(gesture.pressed);
pressed.delete(up.pointerId);
return { gesture:{ pressed,lastDpadAt:up.at },release:gesture.pressed.get(up.pointerId) };
}
function dpadClickIsGhost(gesture,at) {
return at - gesture.lastDpadAt < DPAD_CLICK_GUARD_MS;
}
function dpadLeaveScreen(gesture,leave) {
if (!gesture.pressed.has(leave.pointerId)) return null;
return { gesture:dpadUp(gesture,leave).gesture,swallowClickUntil:leave.at + DPAD_CLICK_GUARD_MS };
}

export { TAP_TARGET_PX, tapCellFor, tapIntent, createDpadGesture, dpadDown, dpadUp, dpadClickIsGhost, dpadLeaveScreen };

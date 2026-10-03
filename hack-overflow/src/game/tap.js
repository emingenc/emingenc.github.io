import { findPath } from './path.js';
import { isPassable, thingAt } from './world.js';

const INTERACT_KINDS = new Set(['terminal', 'core', 'kernel']);
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

export { tapIntent, createDpadGesture, dpadDown, dpadUp, dpadClickIsGhost, dpadLeaveScreen };

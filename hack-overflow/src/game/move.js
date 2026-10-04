import { LEVEL_XP, sectorLocksLeft } from './progress.js';
import { isOpen, isPassable, thingAt } from './world.js';


const DIRS = { up:{ dc:0,dr:-1 },down:{ dc:0,dr:1 },left:{ dc:-1,dr:0 },right:{ dc:1,dr:0 } };
const MOVING_EVENTS = new Set(['step','cache']);
function cellToward(cell,dir) {
const delta = DIRS[dir];
return { col:cell.col + delta.dc,row:cell.row + delta.dr };
}
function gateNeed(world,progress,gate) {
const level = world.gates[gate.family].level;
return { kind:'level',level,family:gate.family,xpToGo:LEVEL_XP[level] - progress.xp };
}
const NEEDS = {
door:(world,progress,door) => ({ kind:'breach',key:door.key }),
gate:gateNeed,
'kernel-door':(world,progress) => ({ kind:'all',left:progress.left }),
};
function coreEvent(world,progress,core) {
const left = sectorLocksLeft(world,progress,core.family);
return { type:'core',id:core.id,family:core.family,ready:left === 0,claimed:progress.cores.has(core.family),left };
}
const THING_EVENTS = {
cache:(world,progress,cache) => (progress.caches.has(cache.id) ? { type:'step' } :{ type:'cache',id:cache.id }),
terminal:(world,progress,term) => ({ type:'terminal',id:term.id,key:term.key,breached:progress.breached.has(term.key) }),
core:coreEvent,
encrypted:(world,progress,door) => ({ type:'encrypted',id:door.id,family:door.family,name:door.name }),
kernel:() => ({ type:'kernel' }),
rig:(world,progress,rig) => ({ type:'rig',id:rig.id,rigId:rig.rig,met:progress.met?.has(rig.rig) ?? false }),
};
function eventInto(world,progress,cell) {
const thing = thingAt(world,cell);
if (!thing) return { type:isPassable(world,progress,cell) ? 'step' :'bump' };
if (!Object.hasOwn(NEEDS,thing.kind)) return THING_EVENTS[thing.kind](world,progress,thing);
if (isOpen(world,progress,thing.id)) return { type:'step' };
return { type:'blocked',id:thing.id,need:NEEDS[thing.kind](world,progress,thing) };
}
function stepAvatar(world,progress,move) {
const target = cellToward(move.pos,move.dir);
const event = eventInto(world,progress,target);
return { pos:MOVING_EVENTS.has(event.type) ? target :move.pos,facing:move.dir,event };
}

export { DIRS, cellToward, stepAvatar };

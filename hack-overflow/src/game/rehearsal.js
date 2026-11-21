import { objectiveFor } from './objective.js';
import { findPath } from './path.js';
import { rigOf } from './rig-catalog.js';
import { roomLock, roomsFor } from './rooms/room-lock.js';


function nextLockKey(world,progress,from) {
const { targetId } = objectiveFor(world,progress,from);
return world.placed.find((key) => world.terminals[key].id === targetId) ?? null;
}
function stepsTo(world,progress,route) {
const dirs = findPath(world,progress,{ from:route.from,to:{ col:route.thing.col,row:route.thing.row } });
return dirs === null ? null :dirs.length;
}
function openRoom(world,progress,lockKey) {
const rigId = roomsFor(lockKey).find((id) => roomLock(id,'w1').key === lockKey);
return rigId && world.rigs[rigId] && !progress.won.has(rigId) ? world.rigs[rigId] :null;
}
function rehearsalFor(world,progress,from) {
const lockKey = nextLockKey(world,progress,from);
const room = lockKey ? openRoom(world,progress,lockKey) :null;
if (!room) return null;
const lock = world.terminals[lockKey];
const lockSteps = stepsTo(world,progress,{ from,thing:lock });
const roomSteps = stepsTo(world,progress,{ from,thing:room });
if (lockSteps === null || roomSteps === null) return null;
return { lockKey,lockTargetId:lock.id,rigId:room.rig,title:rigOf(room.rig).title,lockSteps,roomSteps };
}

export { rehearsalFor };

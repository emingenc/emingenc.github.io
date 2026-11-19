import { DOOR_COUNT,isLive } from './oracle.js';
import { clamp01 } from '../ease.js';

const FLASH_MS = 220;
const FLASH_ALPHA = 0.7;
const MARK_MS = 150;
const MARK_BACK = 2.2;
const FADE_MS = 200;
const NEVER = -Infinity;

function doorMemory() {
return { opened:new Array(DOOR_COUNT).fill(false),openedAt:new Array(DOOR_COUNT).fill(NEVER),deadAt:new Array(DOOR_COUNT).fill(NEVER),live:new Array(DOOR_COUNT).fill(false),count:0,known:false };
}
function forget(memory) {
memory.openedAt.fill(NEVER);
memory.deadAt.fill(NEVER);
}
function noteDoor(memory,spec) {
const { state,index,now } = spec;
const opened = state.opened.includes(index);
const live = isLive(state,index);
if (opened && !memory.opened[index]) memory.openedAt[index] = now;
if (!opened && memory.live[index] && !live) memory.deadAt[index] = now;
memory.opened[index] = opened;
memory.live[index] = live;
}
function noteDoors(memory,state,now) {
const fresh = !memory.known || state.opened.length < memory.count;
for (let index = 0; index < DOOR_COUNT; index += 1) noteDoor(memory,{ state,index,now });
if (fresh) forget(memory);
memory.count = state.opened.length;
memory.known = true;
}
function flashAlpha(age) {
const left = 1 - clamp01(age / FLASH_MS);
return FLASH_ALPHA * left * left;
}
function markScale(age) {
const rest = clamp01(age / MARK_MS) - 1;
return 1 + (MARK_BACK + 1) * rest * rest * rest + MARK_BACK * rest * rest;
}
function darkMix(age) {
return clamp01(age / FADE_MS);
}

export { doorMemory,noteDoors,flashAlpha,markScale,darkMix };

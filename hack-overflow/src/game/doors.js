import { isOpen } from './world.js';
import { lockLabel, lockName } from './messages.js';
import { clamp01, easeOutCubic } from './ease.js';

const REVEAL_TIMING = { stepMs:450,staggerMs:150 };
const REVEAL_WORDS = { door:'Door',gate:'Gate','kernel-door':'KERNEL door' };
const BARRIER_REVEAL = 'SENTRY FIELD down. The way is open.';
function openablesOf(world) {
const doors = Object.values(world.doors).map((door) => ({ id:door.id,kind:'door',key:door.key,cells:door.cells }));
const gates = Object.values(world.gates).map((gate) => ({ id:gate.id,kind:'gate',name:gate.name,cells:gate.cells }));
const barriers = Object.values(world.barriers).map((barrier) => ({ id:barrier.id,kind:'barrier',name:world.things[barrier.id].name,cells:barrier.cells }));
const kernelDoor = world.kernelDoor ? [{ id:world.kernelDoor.id,kind:'kernel-door',cells:world.kernelDoor.cells }] :[];
return [...doors,...gates,...barriers,...kernelDoor];
}
function withLabel(world,progress,item) {
return item.kind === 'door' ? { ...item,label:lockLabel(world,progress,item.key) } :item;
}
function newlyOpened(world,progress,seenOpen) {
const seen = new Set(seenOpen);
const opened = openablesOf(world).filter((item) => !seen.has(item.id) && isOpen(world,progress,item.id));
return opened.map((item) => withLabel(world,progress,item));
}
function revealText(item) {
if (item.kind === 'barrier') return BARRIER_REVEAL;
const word = REVEAL_WORDS[item.kind] || REVEAL_WORDS.door;
if (item.kind === 'door') return word + ' open: ' + (item.label || lockName(item.key)) + '.';
if (item.kind === 'gate') return word + ' open: ' + item.name + '.';
return word + ' open.';
}
function isOnCamera(cells,range) {
return cells.some((cell) => cell.col >= range.col0 && cell.col <= range.col1 && cell.row >= range.row0 && cell.row <= range.row1);
}
function isRevealing(reveal,id) {
return Boolean(reveal) && Object.hasOwn(reveal.starts,id);
}
function revealableOnCamera(items,range,reveal) {
return items.filter((item) => isOnCamera(item.cells,range) && !isRevealing(reveal,item.id));
}
function startReveal(reveal,id,now) {
const starts = reveal ? reveal.starts :{};
const known = Object.values(starts);
const startAt = known.length === 0 ? now :Math.max(now,Math.max(...known) + REVEAL_TIMING.staggerMs);
return { starts:{ ...starts,[id]:startAt } };
}
function startBatch(reveal,items,now) {
const line = items.map((item) => revealText(item)).join(' ');
return items.reduce((batch,item,index) => {
const next = startReveal(batch.reveal,item.id,now);
const step = { item,startAt:next.starts[item.id],announce:index === 0 ? line :'' };
return { reveal:next,steps:[...batch.steps,step] };
},{ reveal,steps:[] });
}
function opennessAt(reveal,now) {
return Object.fromEntries(Object.entries(reveal.starts).map(([id,startAt]) => [id,easeOutCubic(clamp01((now - startAt) / REVEAL_TIMING.stepMs))]));
}
function revealDone(reveal,now) {
return now >= Math.max(...Object.values(reveal.starts)) + REVEAL_TIMING.stepMs;
}
function drawnOpenness(state,id) {
if (!state.open) return 0;
if (isRevealing(state.reveal,id)) return opennessAt(state.reveal,state.now)[id];
return state.seen ? 1 :0;
}
function wholeCellsOnCamera(camera,view) {
return {
col0:Math.ceil(camera.col),col1:Math.floor(camera.col + view.cols) - 1,
row0:Math.ceil(camera.row),row1:Math.floor(camera.row + view.rows) - 1,
};
}

export {
REVEAL_TIMING,
newlyOpened,
revealText,
isOnCamera,
isRevealing,
revealableOnCamera,
startReveal,
startBatch,
opennessAt,
revealDone,
drawnOpenness,
wholeCellsOnCamera,
};

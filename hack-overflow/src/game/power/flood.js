import { registerActorKind } from '../actors.js';
import { cellToward } from '../move.js';
import { cellKey } from '../path.js';
import { cellAt, thingAt } from '../world.js';

const SPAWN_NEAR = 4;
const SPAWN_FAR = 5;
const SPAWN_MAX = 3;
const NEIGHBOUR_ORDER = ['up','right','down','left'];
const WALKABLE = new Set(['floor','cache']);
const MILESTONE_FIRST = 12;
const MILESTONE_EVERY = 4;
const MILESTONE_LAST = 24;
const FLOOD_SPEC = Object.freeze({ durationMs:10000,bitEveryMs:1200,bits:8,stepMs:600,hold:2,reward:10,source:'flood-held',beat:'flood-1' });
const FLOOD_TEXTS = Object.freeze({
START:(lock) => 'ROOT is rewriting ' + lock + '. Hold the line.',
HELD:'Held. ROOT lost the write. +10 R.',
LOST:(lock) => 'ROOT scribbled over ' + lock + '. Solve and XP stand.',
STAND_DOWN:'Stood down. ROOT backs off.',
});

registerActorKind('flood',{
tick:(actor) => ({ actor,hits:0 }),
intent:() => null,
});

function createBit(spot) {
return { id:spot.id,kind:'flood',col:spot.col,row:spot.row,hp:1,awake:true };
}
function walkable(world,cell) {
const entry = cellAt(world,cell);
return Boolean(entry) && WALKABLE.has(entry.kind);
}
function unreached(world,steps,cell) {
return NEIGHBOUR_ORDER.map((dir) => cellToward(cell,dir)).filter((next) => !steps.has(cellKey(next)) && walkable(world,next));
}
function distances(world,from) {
const steps = new Map([[cellKey(from),0]]);
const queue = [from];
for (let head = 0; head < queue.length; head += 1) {
for (const next of unreached(world,steps,queue[head])) {
steps.set(cellKey(next),steps.get(cellKey(queue[head])) + 1);
queue.push(next);
}
}
return steps;
}
function cellOfKey(key) {
const [col,row] = key.split(',').map(Number);
return { col,row };
}
function inReadingOrder(one,other) {
return one.row - other.row || one.col - other.col;
}
function candidatesOf(world,steps) {
const free = [...steps].map(([key,far]) => ({ ...cellOfKey(key),far })).filter((spot) => spot.far >= 1 && !thingAt(world,spot));
const ring = free.filter((spot) => spot.far >= SPAWN_NEAR && spot.far <= SPAWN_FAR);
const reach = Math.max(0,...free.map((spot) => spot.far));
const cells = ring.length > 0 ? ring :free.filter((spot) => spot.far === reach);
return { full:ring.length > 0,reach,cells:cells.sort(inReadingOrder).map(({ col,row }) => ({ col,row })) };
}
function gap(one,other) {
return Math.abs(one.col - other.col) + Math.abs(one.row - other.row);
}
function spread(cells) {
const picked = cells.slice(0,1);
while (picked.length < Math.min(SPAWN_MAX,cells.length)) {
const room = (cell) => Math.min(...picked.map((other) => gap(cell,other)));
const rest = cells.filter((cell) => !picked.includes(cell));
picked.push(rest.reduce((best,cell) => (room(cell) > room(best) ? cell :best)));
}
return picked;
}
function betterOption(best,option) {
if (option.pool.full !== best.pool.full) return option.pool.full ? option :best;
if (!option.pool.full && option.pool.reach !== best.pool.reach) return option.pool.reach > best.pool.reach ? option :best;
return option.pool.cells.length > best.pool.cells.length ? option :best;
}
function planFlood(world,terminalKey) {
const terminal = Object.hasOwn(world.terminals,terminalKey) ? world.terminals[terminalKey] :null;
if (!terminal) return null;
const options = NEIGHBOUR_ORDER.map((dir) => cellToward(terminal,dir)).filter((cell) => walkable(world,cell))
.map((approach) => ({ approach,pool:candidatesOf(world,distances(world,approach)) }));
if (options.length === 0) return null;
const best = options.reduce(betterOption);
return { approach:best.approach,spawns:spread(best.pool.cells) };
}
function stepBit(world,bit,approach) {
const steps = distances(world,approach);
const far = steps.get(cellKey(bit));
if (far === undefined) return { bit,arrived:false };
if (far === 0) return { bit,arrived:true };
const dir = NEIGHBOUR_ORDER.find((one) => steps.get(cellKey(cellToward(bit,one))) === far - 1);
const next = cellToward(bit,dir);
return { bit:{ ...bit,col:next.col,row:next.row },arrived:far === 1 };
}
function outcome(rewrites) {
return rewrites <= FLOOD_SPEC.hold ? 'held' :'lost';
}
function tallyFlood(count) {
const verdict = outcome(count.rewrites);
const held = verdict === 'held';
return { outcome:verdict,killed:count.killed,rewrites:count.rewrites,reward:held ? FLOOD_SPEC.reward :0,source:held ? FLOOD_SPEC.source :null };
}
function isMilestone(count) {
return count >= MILESTONE_FIRST && count <= MILESTONE_LAST && (count - MILESTONE_FIRST) % MILESTONE_EVERY === 0;
}
function floodAllowed(state) {
if (state.ended) return { ok:false,why:'ended' };
if (!state.hasBolt) return { ok:false,why:'no-bolt' };
if (state.uiBusy) return { ok:false,why:'busy' };
if (state.finaleActive) return { ok:false,why:'finale' };
if (isMilestone(state.lockCount)) return { ok:false,why:'milestone' };
return { ok:true,why:'' };
}

export { FLOOD_SPEC as floodSpec, FLOOD_TEXTS, createBit, planFlood, stepBit, outcome, tallyFlood, floodAllowed };

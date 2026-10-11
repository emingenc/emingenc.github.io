import { POOL,TURRET_W1 } from './data/turret-wave1.js';
import { WAVES } from './data/turret-waves.js';


const MIN_VALUE = 1;
const MAX_VALUE = 9;
const FIRST_DISTINCT = 5;
const MIN_PAIRS = 4;
const MIN_EARLY_PAIRS = 2;
const MIN_TAG_WALKS = 3;
const GENERATE_LIMIT = 300000;
const SEED_STEP = 0x6D2B79F5;
const UINT32 = 4294967296;

const MIX = { a:15,b:7,c:61,d:14 };
function prng(seed) {
let state = seed;
return function next() {
state = (state + SEED_STEP) | 0;
let mixed = Math.imul(state ^ (state >>> MIX.a),1 | state);
mixed = (mixed + Math.imul(mixed ^ (mixed >>> MIX.b),MIX.c | mixed)) ^ mixed;
return ((mixed ^ (mixed >>> MIX.d)) >>> 0) / UINT32;
};
}
function targetAt(spec,drone) {
if (spec.cycle) return spec.cycle[Math.floor((drone - 1) / spec.group) % spec.cycle.length];
return spec.targets.reduce((target,step) => (drone >= step.from ? step.t :target),spec.targets[0].t);
}
function lastDrone(spec) {
return spec.endless ? Infinity :spec.n;
}
function tAt(drone) {
return targetAt(WAVES.w1,drone);
}
function judgeTFor(spec,drone) {
return targetAt(spec,drone >= spec.dualFrom ? Math.min(drone + 1,lastDrone(spec)) :drone);
}
function judgeT(drone) {
return judgeTFor(WAVES.w1,drone);
}
function firstCrossDrone(spec) {
let drone = 1;
while (judgeTFor(spec,drone) === judgeTFor(spec,1) && drone < lastDrone(spec)) drone += 1;
return drone;
}

function createSim(spec) {
return {
spec,crossFrom:firstCrossDrone(spec),board:Array(spec.slots + 1).fill(0),born:Array.from({ length:spec.slots + 1 },() => []),
pairs:0,walks:0,cross:0,early:0,dupOK:false,dupUsed:false,dupSlot:0,dups:0,halves:0,goldPaired:false,
};
}
function litSlot(sim,need) {
return need >= MIN_VALUE && need <= MAX_VALUE && sim.board[need] > 0;
}
function takePartner(sim,need) {
sim.board[need] -= 1;
return sim.born[need].shift();
}
function recordPair(sim,drone,partnerBorn) {
const { spec } = sim;
sim.pairs += 1;
if (drone.number < spec.rushFrom) sim.early += 1;
if (partnerBorn < sim.crossFrom && drone.number >= sim.crossFrom) sim.cross += 1;
if (drone.need === sim.dupSlot && drone.number > spec.dupAt) sim.dupUsed = true;
if (spec.goldEvery > 0 && drone.number % spec.goldEvery === 0) sim.goldPaired = true;
}
function recordStore(sim,drone) {
if (sim.board[drone.value] > 0) sim.dups += 1;
if (2 * drone.value === judgeTFor(sim.spec,drone.number)) sim.halves += 1;
}
function simDrone(sim,drone,tagOnly) {
if (drone.number === sim.spec.dupAt) {
sim.dupOK = sim.board[drone.value] > 0 && !drone.lit;
sim.dupSlot = drone.value;
}
if (!drone.lit) {
recordStore(sim,drone);
return false;
}
const partnerBorn = takePartner(sim,drone.need);
if (tagOnly) {
sim.walks += 1;
return false;
}
recordPair(sim,drone,partnerBorn);
return true;
}
function simStreamFor(spec,stream,tagOnly = false) {
const sim = createSim(spec);
stream.forEach(function (value,index) {
const number = index + 1;
const need = judgeTFor(spec,number) - value;
const stored = !simDrone(sim,{ number,value,need,lit:litSlot(sim,need) },tagOnly);
if (stored) {
sim.board[value] += 1;
sim.born[value].push(number);
}
});
const { pairs,walks,cross,early,dupOK,dupUsed,dups,halves,goldPaired } = sim;
return { pairs,walks,cross,early,dupOK,dupUsed,dups,halves,goldPaired };
}
function simStream(stream,tagOnly = false) {
return simStreamFor(WAVES.w1,stream,tagOnly);
}
function slotProblem(stream) {
for (let index = 0; index < stream.length; index += 1) {
const target = judgeT(index + 1);
const value = stream[index];
const partner = target - value;
if (value < MIN_VALUE || value > MAX_VALUE || partner < MIN_VALUE || partner > MAX_VALUE) return 'slot out of 1-9 at ' + (index + 1);
if (2 * value === target) return 'self-pair trap (wave 2) at ' + (index + 1);
}
return '';
}
function playProblem(stream) {
const played = simStream(stream);
if (!played.dupOK) return 'drone 6 is not a stacking duplicate';
if (!played.dupUsed) return 'the x2 slot is never used';
if (played.cross < 1) return 'no pair crosses the T change';
if (played.early < MIN_EARLY_PAIRS) return 'under 2 pairs before the rush';
if (played.pairs < MIN_PAIRS) return 'under 4 pairs';
return simStream(stream,true).walks < MIN_TAG_WALKS ? 'TAG spam would survive' :'';
}
function streamWhy(stream) {
if (stream.length !== TURRET_W1.n) return 'length';
const bad = slotProblem(stream);
if (bad) return bad;
if (new Set(stream.slice(0,FIRST_DISTINCT)).size !== FIRST_DISTINCT) return 'drones 1-5 not distinct';
return playProblem(stream);
}
function candidate(next) {
return Array.from({ length:TURRET_W1.n },function (_,index) {
const low = judgeT(index + 1) - MAX_VALUE;
return low + Math.floor(next() * (MAX_VALUE + 1 - low));
});
}
const poolCache = new Map();
function buildPool(seed = POOL.seed,size = POOL.size) {
const key = seed + ':' + size;
if (poolCache.has(key)) return poolCache.get(key);
const next = prng(seed);
const seen = new Set();
const out = [];
for (let tries = 0; out.length < size && tries < GENERATE_LIMIT; tries += 1) {
const stream = candidate(next);
const id = stream.join(',');
if (!seen.has(id) && !streamWhy(stream)) {
seen.add(id);
out.push(stream);
}
}
poolCache.set(key,out);
return out;
}
function pickStream(pool,lastIndex,next) {
const choices = pool.map((_,index) => index).filter((index) => index !== lastIndex);
const index = choices[Math.floor(next() * choices.length)];
return { stream:pool[index],index };
}

export { prng,tAt,targetAt,lastDrone,judgeT,judgeTFor,simStream,simStreamFor,streamWhy,buildPool,pickStream };

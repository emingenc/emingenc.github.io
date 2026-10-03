import { HARNESS_FORGE } from './data/harness-forge.js';

const STEP_MS = 50;
const MAX_STEPS_PER_ADVANCE = 8;
const MS_PER_SECOND = 1000;
const CELL_CENTRE = 0.5;
const PERCENT = 100;
const NO_ACCEL = 0;
const START_DIST = 0;
const FIRST_UID = 1;
const LAST_CHECKPOINT = HARNESS_FORGE.checkpoints.length - 1;
const PHASE_BUILD = 'build';
const PHASE_WAVE = 'wave';
const PHASE_WON = 'won';
const PHASE_LOST = 'lost';
const JITTER_SPAN = 3;
const JITTER_SHIFT = 1;
const PRNG_STEP = 0x6d2b79f5;
const PRNG_RANGE = 4294967296;
const PRNG_SHIFT_A = 15;
const PRNG_SHIFT_B = 7;
const PRNG_SHIFT_C = 14;
const PRNG_ODD = 1;
const PRNG_MIX = 61;

function drawRandom(rng) {
const next = (rng + PRNG_STEP) >>> 0;
let mix = Math.imul(next ^ (next >>> PRNG_SHIFT_A),next | PRNG_ODD);
mix ^= mix + Math.imul(mix ^ (mix >>> PRNG_SHIFT_B),mix | PRNG_MIX);
return { rng:next,value:((mix ^ (mix >>> PRNG_SHIFT_C)) >>> 0) / PRNG_RANGE };
}

function pieceSpec(pieceId) {
return HARNESS_FORGE.pieces[pieceId];
}
function threatSpec(threatId) {
return HARNESS_FORGE.threats[threatId];
}
function counterOf(threatId) {
const threat = threatSpec(threatId);
return threat ? threat.counter :null;
}
function damageFor(pieceId,threatId) {
const piece = pieceSpec(pieceId);
const multiplier = counterOf(threatId) === pieceId ? HARNESS_FORGE.counterMultiplier :1;
return piece.damage * multiplier;
}

function segmentsOf(level) {
const segments = [];
let start = 0;
for (let i = 1; i < level.path.length; i += 1) {
const [ac,ar] = level.path[i - 1];
const [bc,br] = level.path[i];
const length = Math.abs(bc - ac) + Math.abs(br - ar);
segments.push({ from:[ac,ar],to:[bc,br],start,length });
start += length;
}
return segments;
}
function pathLength(level) {
return segmentsOf(level).reduce((total,segment) => total + segment.length,0);
}
function lerpSegment(segment,dist) {
const share = segment.length ? (dist - segment.start) / segment.length :0;
const [ac,ar] = segment.from;
const [bc,br] = segment.to;
return { x:ac + (bc - ac) * share + CELL_CENTRE,y:ar + (br - ar) * share + CELL_CENTRE };
}
function positionAt(level,dist) {
const segments = segmentsOf(level);
if (!segments.length) {
const [col,row] = level.path[0];
return { x:col + CELL_CENTRE,y:row + CELL_CENTRE };
}
const clamped = Math.min(Math.max(dist,START_DIST),pathLength(level));
const segment = segments.find((entry) => clamped <= entry.start + entry.length) || segments[segments.length - 1];
return lerpSegment(segment,clamped);
}
function checkpointIndex(level,dist) {
const length = pathLength(level);
if (length <= 0) return LAST_CHECKPOINT;
const index = Math.floor((Math.max(dist,START_DIST) / length) * LAST_CHECKPOINT);
return Math.min(index,LAST_CHECKPOINT);
}
function cellKey(col,row) {
return col + ',' + row;
}
function segmentCells(segment) {
const [ac,ar] = segment.from;
const [bc,br] = segment.to;
const dc = Math.sign(bc - ac);
const dr = Math.sign(br - ar);
const keys = [];
for (let i = 0; i <= segment.length; i += 1) keys.push(cellKey(ac + dc * i,ar + dr * i));
return keys;
}
function pathCells(level) {
const cells = new Set(level.path.map(([col,row]) => cellKey(col,row)));
segmentsOf(level).forEach((segment) => segmentCells(segment).forEach((key) => cells.add(key)));
return cells;
}

function newWaveRecord(index) {
return { index,killed:0,leaked:[],clean:true,spent:0,cleared:false };
}
function createGame(level,seed) {
return {
level,seed,rng:seed >>> 0,tick:0,accMs:0,phase:PHASE_BUILD,waveIndex:0,
budget:level.budget,integrity:level.integrity,maxIntegrity:level.integrity,
pieces:[],enemies:[],queue:[],nextUid:FIRST_UID,events:[],
waves:level.waves.map((wave,index) => newWaveRecord(index)),
leaks:[],stats:{ kills:0,spent:0 }
};
}

function pieceAt(state,col,row) {
return state.pieces.find((piece) => piece.col === col && piece.row === row) || null;
}
function isOver(state) {
return state.phase === PHASE_WON || state.phase === PHASE_LOST;
}
function inBounds(level,col,row) {
return Number.isInteger(col) && Number.isInteger(row) && col >= 0 && row >= 0 && col < level.cols && row < level.rows;
}
function costOf(pieceId) {
const piece = pieceSpec(pieceId);
return piece ? piece.cost :Infinity;
}
function canPlace(state,pieceId,col,row) {
if (isOver(state)) return { ok:false,reason:'over' };
if (!inBounds(state.level,col,row)) return { ok:false,reason:'bounds' };
if (pathCells(state.level).has(cellKey(col,row))) return { ok:false,reason:'path' };
if (pieceAt(state,col,row)) return { ok:false,reason:'occupied' };
if (costOf(pieceId) > state.budget) return { ok:false,reason:'budget' };
return { ok:true };
}
function addSpent(waves,index,amount) {
return waves.map((wave) => (wave.index === index ? { ...wave,spent:wave.spent + amount } :wave));
}
function placePiece(state,pieceId,col,row) {
if (!canPlace(state,pieceId,col,row).ok) return state;
const cost = costOf(pieceId);
const piece = { uid:state.nextUid,type:pieceId,col,row,cd:0 };
return {
...state,
budget:state.budget - cost,
pieces:[...state.pieces,piece],
nextUid:state.nextUid + 1,
waves:addSpent(state.waves,state.waveIndex,cost),
stats:{ ...state.stats,spent:state.stats.spent + cost },
events:[{ kind:'place',pieceUid:piece.uid,type:pieceId,col,row }]
};
}
function sellPiece(state,col,row) {
const piece = pieceAt(state,col,row);
if (state.phase !== PHASE_BUILD || !piece) return state;
const refund = Math.floor((costOf(piece.type) * HARNESS_FORGE.sellPercent) / PERCENT);
return {
...state,
budget:state.budget + refund,
pieces:state.pieces.filter((entry) => entry !== piece),
events:[{ kind:'sell',type:piece.type,refund,col,row }]
};
}

function jitterTick(rng) {
const draw = drawRandom(rng);
return { rng:draw.rng,offset:Math.floor(draw.value * JITTER_SPAN) - JITTER_SHIFT };
}
function buildQueue(wave,firstTick,rng) {
const queue = [];
let current = rng;
wave.spawns.forEach((spawn) => {
for (let k = 0; k < spawn.count; k += 1) {
const jitter = jitterTick(current);
current = jitter.rng;
const tick = Math.max(firstTick,firstTick + (spawn.delay || 0) + k * spawn.gap + jitter.offset);
queue.push({ tick,type:spawn.threat });
}
});
const ordered = queue.map((entry,order) => ({ entry,order }));
ordered.sort((left,right) => left.entry.tick - right.entry.tick || left.order - right.order);
return { queue:ordered.map((item) => item.entry),rng:current };
}
function startWave(state) {
const wave = state.level.waves[state.waveIndex];
if (state.phase !== PHASE_BUILD || !wave) return state;
const built = buildQueue(wave,state.tick + 1,state.rng);
return {
...state,
phase:PHASE_WAVE,accMs:0,rng:built.rng,queue:built.queue,
events:[{ kind:'wave-start',index:state.waveIndex }]
};
}

function enemyPos(state,enemy) {
return positionAt(state.level,enemy.dist);
}
function distance(from,to) {
return Math.hypot(from.x - to.x,from.y - to.y);
}
function pieceCentre(piece) {
return { x:piece.col + CELL_CENTRE,y:piece.row + CELL_CENTRE };
}
function inRange(state,piece,enemy) {
return distance(pieceCentre(piece),enemyPos(state,enemy)) <= pieceSpec(piece.type).range;
}
function isRevealed(state,enemy) {
if (!threatSpec(enemy.type).hidden) return true;
return state.pieces.some((piece) => pieceSpec(piece.type).reveals && inRange(state,piece,enemy));
}

function draftOf(state) {
return {
...state,
pieces:state.pieces.map((piece) => ({ ...piece })),
enemies:state.enemies.map((enemy) => ({ ...enemy })),
queue:state.queue.slice(),
waves:state.waves.map((wave) => ({ ...wave,leaked:wave.leaked.slice() })),
leaks:state.leaks.slice(),
stats:{ ...state.stats },
events:[]
};
}
function currentWave(draft) {
return draft.waves[draft.waveIndex];
}
function spawnDue(draft) {
while (draft.queue.length && draft.queue[0].tick <= draft.tick) {
const { type } = draft.queue.shift();
const hp = threatSpec(type).hp;
const enemy = { uid:draft.nextUid,type,dist:START_DIST,hp,maxHp:hp,revealed:!threatSpec(type).hidden };
draft.nextUid += 1;
draft.enemies.push(enemy);
draft.events.push({ kind:'spawn',enemy:{ ...enemy } });
}
}
function stepDistance(level,enemy) {
const threat = threatSpec(enemy.type);
const accel = threat.accel || NO_ACCEL;
return (threat.speed * (1 + accel * checkpointIndex(level,enemy.dist)) * STEP_MS) / MS_PER_SECOND;
}
function leak(draft,enemy) {
const threat = threatSpec(enemy.type);
const at = positionAt(draft.level,pathLength(draft.level));
draft.integrity -= threat.leak;
draft.leaks.push({ type:enemy.type,wave:draft.waveIndex,checkpoint:LAST_CHECKPOINT });
currentWave(draft).leaked.push(enemy.type);
currentWave(draft).clean = false;
draft.events.push({ kind:'leak',type:enemy.type,leak:threat.leak,checkpoint:LAST_CHECKPOINT,at });
}
function moveEnemies(draft) {
const end = pathLength(draft.level);
const kept = [];
draft.enemies.forEach((enemy) => {
enemy.dist += stepDistance(draft.level,enemy);
if (enemy.dist >= end) leak(draft,enemy);
else kept.push(enemy);
});
draft.enemies = kept;
}
function revealEnemies(draft) {
draft.enemies.forEach((enemy) => {
const seen = isRevealed(draft,enemy);
if (seen && !enemy.revealed) draft.events.push({ kind:'reveal',enemyUid:enemy.uid });
enemy.revealed = seen;
});
}
function targetFor(draft,piece) {
let best = null;
draft.enemies.forEach((enemy) => {
if (enemy.hp <= 0 || !isRevealed(draft,enemy) || !inRange(draft,piece,enemy)) return;
if (!best || enemy.dist > best.dist) best = enemy;
});
return best;
}
function kill(draft,enemy) {
const reward = threatSpec(enemy.type).reward;
draft.budget += reward;
draft.stats.kills += 1;
currentWave(draft).killed += 1;
draft.enemies = draft.enemies.filter((entry) => entry !== enemy);
draft.events.push({ kind:'kill',enemyUid:enemy.uid,type:enemy.type,reward,at:enemyPos(draft,enemy) });
}
function hit(draft,piece,enemy) {
const spec = pieceSpec(piece.type);
const damage = damageFor(piece.type,enemy.type);
const counter = counterOf(enemy.type) === piece.type;
draft.events.push({
kind:'hit',pieceUid:piece.uid,enemyUid:enemy.uid,damage,counter,
from:{ col:piece.col,row:piece.row },to:enemyPos(draft,enemy)
});
enemy.hp -= damage;
if (enemy.hp <= 0) kill(draft,enemy);
else if (spec.pushback) enemy.dist = Math.max(START_DIST,enemy.dist - spec.pushback);
}
function fire(draft) {
const order = draft.pieces.slice().sort((left,right) => left.uid - right.uid);
order.forEach((piece) => {
piece.cd -= 1;
if (piece.cd > 0) return;
piece.cd = 0;
const target = targetFor(draft,piece);
if (!target) return;
hit(draft,piece,target);
piece.cd = pieceSpec(piece.type).cooldown;
});
}
function checkLost(draft) {
if (draft.integrity > 0) return false;
draft.phase = PHASE_LOST;
draft.queue = [];
draft.events.push({ kind:'lost' });
return true;
}
function checkWaveEnd(draft) {
if (draft.queue.length || draft.enemies.length) return;
const wave = currentWave(draft);
const bonus = HARNESS_FORGE.waveBonus + (wave.clean ? HARNESS_FORGE.cleanWaveBonus :0);
wave.cleared = true;
draft.budget += bonus;
draft.events.push({ kind:'wave-clear',index:draft.waveIndex,clean:wave.clean,bonus });
if (draft.waveIndex >= draft.level.waves.length - 1) {
draft.phase = PHASE_WON;
draft.events.push({ kind:'won' });
return;
}
draft.phase = PHASE_BUILD;
draft.waveIndex += 1;
}
function step(state) {
if (state.phase !== PHASE_WAVE) return state;
const draft = draftOf(state);
draft.tick += 1;
spawnDue(draft);
moveEnemies(draft);
if (checkLost(draft)) return draft;
revealEnemies(draft);
fire(draft);
checkWaveEnd(draft);
return draft;
}

function clampDt(dtMs) {
const dt = Number.isFinite(dtMs) ? dtMs :0;
return Math.min(Math.max(dt,0),STEP_MS * MAX_STEPS_PER_ADVANCE);
}
function idle(state) {
if (state.accMs === 0 && !state.events.length) return state;
return { ...state,accMs:0,events:[] };
}
function advance(state,dtMs) {
if (state.phase !== PHASE_WAVE) return idle(state);
let acc = state.accMs + clampDt(dtMs);
let current = state;
const events = [];
while (acc >= STEP_MS && current.phase === PHASE_WAVE) {
current = step(current);
events.push(...current.events);
acc -= STEP_MS;
}
const accMs = current.phase === PHASE_WAVE ? acc :0;
return { ...current,accMs,events };
}

export {
STEP_MS,MAX_STEPS_PER_ADVANCE,createGame,canPlace,placePiece,sellPiece,startWave,step,advance,
pathLength,positionAt,checkpointIndex,pathCells,isRevealed,damageFor,counterOf,pieceAt,enemyPos
};

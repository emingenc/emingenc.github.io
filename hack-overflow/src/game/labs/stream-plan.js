
const TICK_MS = 50;
const LANES = 3;
const LINE_Y = 1;
const STACK_Y = 0.11;
const SHADOW_Y = 0.065;
const MS_PER_S = 1000;
const KIND_KEY = 'key';
const KIND_NOISE = 'noise';
const KIND_BULK = 'bulk';
const KIND_STALE = 'stale';
const KIND_SUMMARY = 'summary';
const KIND_INJECT = 'inject';
const FILLER_KINDS = [KIND_NOISE,KIND_BULK,KIND_STALE,KIND_SUMMARY,KIND_INJECT];
const KEY_VERSION = 2;
const STALE_VERSION = 1;
const NO_VERSION = 0;
const GAP_JITTER = 0.3;
const END_MARGIN_MS = 500;
const LANE_IDS = Array.from({ length:LANES },(unused,lane) => lane);
const NO_TIME = null;
const PLAN_PARTS = { noise:'noise',bulk:'bulk',inject:'injects',summary:'summaries' };
const PRNG_STEP = 0x6d2b79f5;
const PRNG_RANGE = 4294967296;
const PRNG_SHIFT_A = 15;
const PRNG_SHIFT_B = 7;
const PRNG_SHIFT_C = 14;
const PRNG_ODD = 1;
const PRNG_MIX = 61;

function mulberry32(seed) {
let state = seed >>> 0;
return function next() {
state = (state + PRNG_STEP) >>> 0;
let mix = Math.imul(state ^ (state >>> PRNG_SHIFT_A),state | PRNG_ODD);
mix ^= mix + Math.imul(mix ^ (mix >>> PRNG_SHIFT_B),mix | PRNG_MIX);
return ((mix ^ (mix >>> PRNG_SHIFT_C)) >>> 0) / PRNG_RANGE;
};
}
function pickFrom(list,next) {
return list[Math.floor(next() * list.length)];
}
function lerp(from,to,ratio) {
return from + (to - from) * ratio;
}
function progress(stage,elapsedMs) {
return Math.min(1,Math.max(0,elapsedMs / stage.durationMs));
}
function stageSpeed(stage,elapsedMs) {
return lerp(stage.speed.startY,stage.speed.endY,progress(stage,elapsedMs));
}
function stepY(stage,elapsedMs) {
return stageSpeed(stage,elapsedMs) * TICK_MS / MS_PER_S;
}
function rideMs(stage,at,distance) {
let height = 0;
let elapsed = at;
while (height < distance) {
elapsed += TICK_MS;
height += stepY(stage,elapsed);
}
return elapsed - at;
}
function fallMs(stage,at) {
return rideMs(stage,at,LINE_Y);
}
function leadY(stage,from,to) {
let height = 0;
for (let at = from; at < to; at += TICK_MS) height += stepY(stage,at + TICK_MS);
return height;
}
function snapToTick(ms) {
return Math.ceil(ms / TICK_MS) * TICK_MS;
}
function gapAt(stage,at,next) {
const { startMs,endMs } = stage.spawn;
const base = lerp(startMs,endMs,progress(stage,at));
return base * (1 + (next() * 2 - 1) * GAP_JITTER);
}
function slotTimes(stage,next) {
const times = [];
let at = snapToTick(stage.spawn.firstAtMs);
while (at + fallMs(stage,at) + END_MARGIN_MS <= stage.durationMs) {
times.push(at);
at = snapToTick(at + gapAt(stage,at,next));
}
return times;
}
function keySlots(count,slots,next) {
const out = new Set();
for (let segment = 0; segment < count; segment += 1) {
const first = Math.ceil(segment * slots / count);
const last = Math.ceil((segment + 1) * slots / count) - 1;
out.add(first + Math.floor(next() * (last - first + 1)));
}
return out;
}
function shuffled(list,next) {
const out = list.slice();
for (let i = out.length - 1; i > 0; i -= 1) {
const j = Math.floor(next() * (i + 1));
[out[i],out[j]] = [out[j],out[i]];
}
return out;
}
function baseChunk(kind,entry) {
return { kind,label:entry.label,tokens:entry.tokens,key:null,value:null,v:NO_VERSION };
}
function keyChunk(entry) {
return { kind:KIND_KEY,label:entry.label,tokens:entry.tokens,key:entry.key,value:entry.value,v:KEY_VERSION };
}
function staleChunk(entry) {
const old = entry.stale;
return { kind:KIND_STALE,label:old.label,tokens:old.tokens,key:entry.key,value:old.value,v:STALE_VERSION };
}
function weightedKind(stage,planned,next) {
const kinds = FILLER_KINDS.filter((kind) => stage.kinds.includes(kind));
const total = kinds.reduce((sum,kind) => sum + (stage.mix[kind] || 0),0);
let roll = next() * total;
for (const kind of kinds) {
roll -= stage.mix[kind] || 0;
if (roll < 0) return kind;
}
return KIND_NOISE;
}
function staleCandidates(planned,used) {
return planned.filter((item) => item.entry.stale && !used.has(item.entry.key));
}
function fillerChunk(stage,ctx,next) {
const kind = weightedKind(stage,ctx.planned,next);
if (kind === KIND_STALE) {
const pool = staleCandidates(ctx.planned,ctx.staleUsed);
if (!pool.length) return baseChunk(KIND_NOISE,pickFrom(stage.noise,next));
const entry = pickFrom(pool,next).entry;
ctx.staleUsed.add(entry.key);
return staleChunk(entry);
}
return baseChunk(kind,pickFrom(stage[PLAN_PARTS[kind]],next));
}
function slotChunk(stage,ctx,index) {
if (!ctx.keySet.has(index)) return fillerChunk(stage,ctx,ctx.next);
const entry = ctx.keys[ctx.keyIndex];
ctx.keyIndex += 1;
const chunk = keyChunk(entry);
ctx.planned.push({ entry });
return chunk;
}
function oldestLane(lastAt) {
return LANE_IDS.reduce((best,lane) => (lastAt[lane] < lastAt[best] ? lane :best),0);
}
function pickLane(stage,ctx,at) {
const open = LANE_IDS.filter((lane) => ctx.lastAt[lane] === NO_TIME || leadY(stage,ctx.lastAt[lane],at) >= STACK_Y);
return pickFrom(open.length ? open :[oldestLane(ctx.lastAt)],ctx.next);
}
function shadowOf(stage,ctx,slot) {
const roll = ctx.next();
const prev = slot.prev;
if (!prev || prev.kind === KIND_KEY || roll >= stage.shadow) return null;
const at = snapToTick(prev.at + rideMs(stage,prev.at,SHADOW_Y));
return at <= slot.at ? { at,lane:prev.lane } :null;
}
function placeSlot(stage,ctx,slot) {
const chunk = slotChunk(stage,ctx,slot.index);
const shadow = chunk.kind === KIND_KEY ? shadowOf(stage,ctx,slot) :null;
const at = shadow ? shadow.at :slot.at;
const lane = shadow ? shadow.lane :pickLane(stage,ctx,at);
ctx.lastAt[lane] = at;
return { at,lane,...chunk };
}
function buildPlan(stage,seed) {
const next = mulberry32(seed);
const times = slotTimes(stage,next);
const ctx = { next,keys:shuffled(stage.keys,next).slice(0,stage.keyCount),keyIndex:0,planned:[],staleUsed:new Set(),
keySet:keySlots(stage.keyCount,times.length,next),lastAt:LANE_IDS.map(() => NO_TIME) };
const plan = [];
times.forEach((at,index) => plan.push(placeSlot(stage,ctx,{ index,at,prev:plan[plan.length - 1] })));
return plan.map((item,uid) => ({ ...item,uid }));
}

export { TICK_MS,LANES,LINE_Y,STACK_Y,SHADOW_Y,KIND_KEY,stageSpeed,stepY,buildPlan };


import { TICK_MS,LANES,LINE_Y,STACK_Y,SHADOW_Y,KIND_KEY,stageSpeed,stepY,buildPlan } from './stream-plan.js';

const CATCH_MIN_Y = 0.12;
const STATUS_RUN = 'running';
const STATUS_END = 'ended';
const STATUS_FAIL = 'failed';
const KEY_POINTS = 100;
const COMBO_POINTS = 5;
const COMBO_STEP = 4;
const MAX_MULTIPLIER = 5;
const LAST_CUTS_SHOWN = 2;
const FIRST_STAR = 0;

function createRun(stage,seed) {
const plan = buildPlan(stage,seed);
return { stageId:stage.id,seed,stage,plan,planIndex:0,elapsedMs:0,acc:0,status:STATUS_RUN,chunks:[],window:[],
budget:stage.budget,used:0,integrity:stage.lives,maxIntegrity:stage.lives,combo:0,bestCombo:0,multiplier:1,
comboPoints:0,score:0,keysTotal:plan.filter((item) => item.kind === KIND_KEY).length,cuts:[],failure:null,events:[],
stats:{ caught:0,flicked:0,whiffs:0,missed:0,leaked:0,pruned:0 } };
}

function isKey(chunk) {
return chunk.kind === KIND_KEY;
}
function deadUids(window) {
return window.filter((entry) => entry.key && window.some((other) => other.key === entry.key && other.v > entry.v))
.map((entry) => entry.uid);
}
function readWindow(state) {
const facts = {};
const bestV = {};
state.window.forEach((entry) => {
if (entry.key && !(bestV[entry.key] >= entry.v)) {
bestV[entry.key] = entry.v;
facts[entry.key] = entry.value;
}
});
return { used:state.used,keysHeld:state.window.filter(isKey).length,dead:deadUids(state.window),facts };
}
function lowestInLane(state,lane) {
let best = null;
state.chunks.forEach((chunk) => {
if (chunk.lane === lane && chunk.y >= CATCH_MIN_Y && (!best || chunk.y > best.y)) best = chunk;
});
return best;
}

function draftOf(state) {
return { ...state,chunks:state.chunks.map((chunk) => ({ ...chunk })),window:state.window.slice(),
cuts:state.cuts.slice(),stats:{ ...state.stats },events:[] };
}
function emit(draft,event) {
draft.events.push(event);
}
function multiplierOf(combo) {
return Math.min(MAX_MULTIPLIER,1 + Math.floor(combo / COMBO_STEP));
}
function clean(draft) {
draft.combo += 1;
draft.bestCombo = Math.max(draft.bestCombo,draft.combo);
const before = draft.multiplier;
draft.multiplier = multiplierOf(draft.combo);
draft.comboPoints += COMBO_POINTS * draft.multiplier;
if (draft.multiplier > before) emit(draft,{ type:'combo',tone:'good',text:`x${draft.multiplier}` });
}
function slip(draft) {
draft.combo = 0;
draft.multiplier = 1;
}
function setFailure(draft,failure) {
if (draft.status !== STATUS_RUN) return;
draft.status = STATUS_FAIL;
draft.failure = failure;
emit(draft,{ type:'end',tone:'bad',text:failure.text,label:failure.label });
}
function loseIntegrity(draft,failure) {
draft.integrity = Math.max(0,draft.integrity - 1);
emit(draft,{ type:'integrity',tone:'bad',label:failure.label,text:`${draft.integrity} left` });
if (draft.integrity === 0) setFailure(draft,failure);
}
function entryOf(chunk) {
return { uid:chunk.uid,kind:chunk.kind,label:chunk.label,tokens:chunk.tokens,key:chunk.key,value:chunk.value,v:chunk.v };
}
function overflowFailure(pusher,victim) {
const text = `OVERFLOW: ${pusher.label} (${pusher.tokens} tok) pushed KEY ${victim.label} out of the window.`;
return { kind:'overflow',text,label:pusher.label };
}
function cutOldest(draft,pusher) {
const victim = draft.window.shift();
draft.used -= victim.tokens;
draft.cuts.push({ uid:victim.uid,label:victim.label,kind:victim.kind,key:victim.key });
emit(draft,{ type:'cut',tone:isKey(victim) ? 'bad' :'info',uid:victim.uid,label:victim.label });
if (!isKey(victim)) return;
slip(draft);
loseIntegrity(draft,overflowFailure(pusher,victim));
}
function store(draft,chunk) {
draft.window.push(entryOf(chunk));
draft.used += chunk.tokens;
while (draft.used > draft.budget && draft.window.length) cutOldest(draft,chunk);
}
function removeChunk(draft,chunk) {
draft.chunks = draft.chunks.filter((other) => other.uid !== chunk.uid);
}
function whiff(draft,lane) {
draft.stats.whiffs += 1;
slip(draft);
emit(draft,{ type:'whiff',tone:'bad',lane });
}

function catchKey(draft,chunk) {
emit(draft,{ type:'catch',tone:'good',lane:chunk.lane,uid:chunk.uid,label:chunk.label });
clean(draft);
store(draft,chunk);
}
function catchSummary(draft,chunk) {
const dead = new Set(deadUids(draft.window));
const kept = draft.window.filter((entry) => isKey(entry) && !dead.has(entry.uid));
const dropped = draft.window.length - kept.length;
draft.window = kept;
draft.used = kept.reduce((sum,entry) => sum + entry.tokens,0);
emit(draft,{ type:'catch',tone:'good',lane:chunk.lane,uid:chunk.uid,label:chunk.label });
emit(draft,{ type:'summarize',tone:'good',label:chunk.label,text:`${dropped} dropped` });
clean(draft);
}
function catchJunk(draft,chunk) {
emit(draft,{ type:'catch',tone:'bad',lane:chunk.lane,uid:chunk.uid,label:chunk.label });
slip(draft);
store(draft,chunk);
}
function catchInject(draft,chunk) {
emit(draft,{ type:'inject',tone:'bad',lane:chunk.lane,uid:chunk.uid,label:chunk.label });
slip(draft);
loseIntegrity(draft,{ kind:'injected',text:`INJECTED: ${chunk.label} told the model to ignore its rules.`,label:chunk.label });
}
const CATCH_RULES = { key:catchKey,summary:catchSummary,inject:catchInject,noise:catchJunk,bulk:catchJunk,stale:catchJunk };

function doCatch(draft,action) {
const target = lowestInLane(draft,action.lane);
if (!target) return whiff(draft,action.lane);
removeChunk(draft,target);
draft.stats.caught += 1;
CATCH_RULES[target.kind](draft,target);
}
function flickKey(draft,chunk) {
slip(draft);
loseIntegrity(draft,{ kind:'flicked',text:`FLICKED: you threw away KEY ${chunk.label}, a fact the answer needed.`,label:chunk.label });
}
function flickJunk(draft) {
clean(draft);
}
function flickSummary(draft) {
slip(draft);
}
const FLICK_RULES = { key:flickKey,summary:flickSummary,inject:flickJunk,noise:flickJunk,bulk:flickJunk,stale:flickJunk };
function doFlick(draft,action) {
const target = lowestInLane(draft,action.lane);
if (!target) return whiff(draft,action.lane);
removeChunk(draft,target);
draft.stats.flicked += 1;
const rule = FLICK_RULES[target.kind];
const good = rule === flickJunk;
emit(draft,{ type:'flick',tone:good ? 'good' :'bad',lane:target.lane,uid:target.uid,label:target.label });
rule(draft,target);
}
function doPrune(draft) {
const dead = new Set(deadUids(draft.window));
if (!dead.size) return whiff(draft);
draft.window = draft.window.filter((entry) => !dead.has(entry.uid));
draft.used = draft.window.reduce((sum,entry) => sum + entry.tokens,0);
draft.stats.pruned += dead.size;
emit(draft,{ type:'prune',tone:'good',text:`${dead.size} pruned` });
clean(draft);
}

function moveChunks(draft) {
const dy = stepY(draft.stage,draft.elapsedMs);
draft.chunks.forEach((chunk) => {
chunk.y += dy;
});
}
function missKey(draft,chunk) {
draft.stats.missed += 1;
slip(draft);
emit(draft,{ type:'miss',tone:'bad',lane:chunk.lane,uid:chunk.uid,label:chunk.label });
loseIntegrity(draft,{ kind:'miss',text:`MISSED: KEY ${chunk.label} fell past the window before you caught it.`,label:chunk.label });
}
function leakInject(draft,chunk) {
draft.stats.leaked += 1;
slip(draft);
emit(draft,{ type:'leak',tone:'bad',lane:chunk.lane,uid:chunk.uid,label:chunk.label });
loseIntegrity(draft,{ kind:'injected',text:`INJECTED: ${chunk.label} was never flicked, so it reached the model and told it to ignore its rules.`,label:chunk.label });
}
const FALL_RULES = { key:missKey,inject:leakInject };
function resolveFallen(draft) {
const fallen = draft.chunks.filter((chunk) => chunk.y >= LINE_Y);
draft.chunks = draft.chunks.filter((chunk) => chunk.y < LINE_Y);
fallen.filter((chunk) => Object.hasOwn(FALL_RULES,chunk.kind)).forEach((chunk) => FALL_RULES[chunk.kind](draft,chunk));
}
function spawnDue(draft) {
while (draft.planIndex < draft.plan.length && draft.plan[draft.planIndex].at <= draft.elapsedMs) {
const { at,...chunk } = draft.plan[draft.planIndex];
draft.chunks.push({ ...chunk,y:0 });
draft.planIndex += 1;
}
}
function shortFailure(state,stage) {
const held = readWindow(state).keysHeld;
const cuts = state.cuts.slice(-LAST_CUTS_SHOWN).map((cut) => cut.label);
const tail = cuts.length ? ` Last cut: ${cuts.join(', ')}.` :'';
const text = `SHORT: held ${held} of ${state.keysTotal} keys, needed ${stage.stars[FIRST_STAR]} for a star.${tail}`;
return { kind:'short',text,label:cuts.length ? cuts[cuts.length - 1] :'' };
}
function starsOf(keysHeld,stage) {
return stage.stars.filter((need) => keysHeld >= need).length;
}
function finishRun(draft) {
draft.status = STATUS_END;
draft.chunks = [];
if (starsOf(readWindow(draft).keysHeld,draft.stage) === 0) draft.failure = shortFailure(draft,draft.stage);
emit(draft,{ type:'end',tone:draft.failure ? 'bad' :'good',text:draft.failure ? draft.failure.text :'' });
}
function tick(draft) {
draft.elapsedMs += TICK_MS;
moveChunks(draft);
resolveFallen(draft);
if (draft.status !== STATUS_RUN) return;
spawnDue(draft);
if (draft.elapsedMs >= draft.stage.durationMs) finishRun(draft);
}
const HANDLERS = { tick,catch:doCatch,flick:doFlick,prune:doPrune };

function finalize(draft) {
draft.score = readWindow(draft).keysHeld * KEY_POINTS + draft.comboPoints;
return draft;
}
function reduce(state,action) {
if (state.status !== STATUS_RUN || !Object.hasOwn(HANDLERS,action.type)) return state;
const draft = draftOf(state);
HANDLERS[action.type](draft,action);
return finalize(draft);
}
function advance(state,dtMs) {
if (state.status !== STATUS_RUN) return state;
const total = state.acc + Math.max(0,dtMs);
const steps = Math.floor(total / TICK_MS);
const events = [];
let current = state;
for (let i = 0; i < steps && current.status === STATUS_RUN; i += 1) {
current = reduce(current,{ type:'tick' });
events.push(...current.events);
}
return { ...current,acc:total - steps * TICK_MS,events };
}
function resultOf(state,stage) {
const keysHeld = readWindow(state).keysHeld;
const stars = state.status === STATUS_END ? starsOf(keysHeld,stage) :0;
const shortRun = state.status === STATUS_END && stars === 0;
const failure = state.failure || (shortRun ? shortFailure(state,stage) :null);
return { stars,score:state.score,keysHeld,keysTotal:state.keysTotal,cleared:stars > 0,failure,bestCombo:state.bestCombo };
}

export { TICK_MS,LANES,CATCH_MIN_Y,STACK_Y,SHADOW_Y,stageSpeed,buildPlan,createRun,reduce,advance,readWindow,resultOf,lowestInLane };

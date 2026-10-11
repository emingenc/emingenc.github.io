import { ASSIST_PACE,BRUTE_MS_PER_COMPARE,FUSE_MS,PACE_MAX,SCORE } from './data/turret-wave1.js';
import { GOLD_MULT,OVERFLOW_AHEAD,OVERFLOW_CHUNK,WAVES } from './data/turret-waves.js';
import { TURRET_TEXTS,fillText } from './data/turret-texts.js';
import { targetAt } from './turret-stream.js';
import { overflowDrones } from './turret-w2-stream.js';


const MIN_SLOT = 1;
const MAX_STARS = 3;
const STORE_POINTS = 10;
const DEFAULT_CTX = { pace:ASSIST_PACE,fuseLeft:0 };
const PROBE_PARTS = 3;
const TAG_PARTS = 2;
const RADIX = 10;
const VERB_PARTS = { probe:PROBE_PARTS,tag:TAG_PARTS,fuse:TAG_PARTS,trust:TAG_PARTS,swarm:TAG_PARTS };
const ANSWER_KINDS = new Set(['pair','store','tag']);

function bayCap(state) {
const spec = state.spec;
if (state.bay.some((drone) => drone.n < spec.dualFrom)) return 1;
return state.next + 1 >= spec.dualFrom ? spec.bayCap :1;
}
function fuseMsFor(number,spec = WAVES.w1) {
if (number < spec.fuseFrom) return null;
const base = number >= spec.fuse2From ? FUSE_MS.second :FUSE_MS.first;
return Math.max(spec.fuseFloor,base - spec.fuseStep * Math.max(0,number - spec.fuse2From));
}
function ensureStream(state) {
if (!state.spec.endless || state.stream.length >= state.next + OVERFLOW_AHEAD) return;
state.stream = state.stream.concat(overflowDrones(state.spec,state.stream,OVERFLOW_CHUNK));
}
function isGold(spec,number) {
return spec.goldEvery > 0 && number % spec.goldEvery === 0;
}
function arrive(state) {
const value = state.stream[state.next];
state.next += 1;
const number = state.next;
state.bay.push({ n:number,v:value,fuseMs:fuseMsFor(number,state.spec),gold:isGold(state.spec,number) });
state.log.push({ n:number,v:value,mark:'' });
if (number === state.spec.hintAt) state.hint = { n:number,choice:null };
ensureStream(state);
}
function refill(state) {
ensureStream(state);
while (state.next < state.stream.length && state.bay.length < bayCap(state)) arrive(state);
}
function cloneState(state) {
return Object.assign({},state,{
bay:state.bay.map((drone) => Object.assign({},drone)),board:state.board.slice(),hint:state.hint ? { ...state.hint } :null,
born:state.born.map((list) => list.slice()),log:state.log.map((entry) => Object.assign({},entry)),
});
}
function waveSpec(options) {
if (options.wave !== 'overflow') return WAVES[options.wave || 'w1'];
return options.assist ? WAVES.overflowAssist :WAVES.overflow;
}
function createTurret(stream,options = {}) {
const spec = waveSpec(options);
const state = {
spec,stream,assist:Boolean(options.assist),next:0,bay:[],board:Array(spec.slots + 1).fill(0),
born:Array.from({ length:spec.slots + 1 },() => []),integrity:spec.integrity,combo:0,maxCombo:0,
score:0,steps:0,wrong:0,pairs:0,fuses:0,resolved:0,log:[],status:'running',last:null,
double:false,insured:0,billed:null,hint:null,golds:0,
};
refill(state);
return state;
}
function turretTarget(state) {
return targetAt(state.spec,state.next);
}
function bayOf(state) {
return state.bay;
}
function keyFor(state,bay) {
const drone = typeof bay === 'number' ? state.bay[bay] :bay;
return turretTarget(state) - drone.v;
}
function bruteCompares(count) {
return (count * (count - 1)) / 2;
}
function parOf(state) {
return state.stream.length;
}
function turretStars(state) {
if (state.status !== 'won') return 0;
if (state.wrong > 0) return 1;
return state.steps <= parOf(state) ? MAX_STARS :MAX_STARS - 1;
}
function paceAt(elapsedMs,count,assist) {
if (assist) return ASSIST_PACE;
const ghostMs = bruteCompares(count) * BRUTE_MS_PER_COMPARE;
const left = ghostMs > 0 ? Math.min(1,Math.max(0,1 - elapsedMs / ghostMs)) :0;
return ASSIST_PACE + (PACE_MAX - ASSIST_PACE) * left;
}
function waveClockOn(state) {
return state.steps > 0 || state.fuses > 0 || state.bay.some((drone) => drone.fuseMs !== null);
}
function pairScore(combo,pace,fuseLeft) {
const bonus = SCORE.fuseBonus * Math.min(1,Math.max(0,fuseLeft));
return Math.round(SCORE.base * Math.min(combo,WAVES.w1.comboCap) * pace) + Math.round(bonus);
}
function hintOffer(state) {
if (state.status !== 'running' || !state.hint || state.hint.choice) return null;
const bay = state.bay.findIndex((drone) => drone.n === state.hint.n);
return bay < 0 ? null :{ bay,n:state.hint.n,slot:keyFor(state,bay) };
}
function verifyHint(state) {
if (!hintOffer(state)) return state;
return Object.assign(cloneState(state),{ hint:{ ...state.hint,choice:'verify' } });
}
function swarmReady(state) {
return state.status === 'running' && state.spec.swarm !== null && state.bay.length >= bayCap(state);
}
function swarmWindowMs(state) {
const swarm = state.spec.swarm;
if (!swarm) return 0;
return swarm.lanes * Math.max(swarm.floor,swarm.start - swarm.step * state.next);
}
function turretMoves(state) {
if (state.status !== 'running') return [];
const moves = state.bay.flatMap(function (_,index) {
const probes = Array.from({ length:state.spec.slots },(__,slot) => 'probe:' + index + ':' + (slot + MIN_SLOT));
return [...probes,'tag:' + index];
});
const offer = hintOffer(state);
return offer ? [...moves,'trust:' + offer.bay] :moves;
}
function parseMove(moveId) {
const parts = String(moveId).split(':');
const verb = parts[0];
if (parts.length !== VERB_PARTS[verb]) return null;
const bay = Number.parseInt(parts[1],RADIX);
const slot = verb === 'probe' ? Number.parseInt(parts[2],RADIX) :0;
return Number.isInteger(bay) && Number.isInteger(slot) ? { verb,bay,slot } :null;
}
function isLit(state,key) {
return key >= MIN_SLOT && key <= state.spec.slots && state.board[key] > 0;
}
function mark(state,number,value) {
const entry = state.log.find((item) => item.n === number);
if (entry) entry.mark = value;
}
function leave(state,drone) {
state.bay = state.bay.filter((item) => item !== drone);
state.resolved += 1;
if (state.hint && state.hint.n === drone.n && !state.hint.choice) state.hint.choice = 'verify';
}
function hurt(state) {
state.integrity -= 1;
if (state.integrity <= 0) state.status = 'failed';
}
function takePartner(state,key) {
state.board[key] -= 1;
return state.born[key].shift();
}
function storeDrone(state,drone) {
if (state.spec.billed && !state.billed && state.board[drone.v] > 0) state.billed = { n:drone.n,v:drone.v };
state.board[drone.v] += 1;
state.born[drone.v].push(drone.n);
leave(state,drone);
}
function outcome(turn,extra) {
const { state,drone,key,bay } = turn;
const base = { bay,n:drone.n,v:drone.v,key,t:turretTarget(state),damage:0,ram:false,points:0,gold:turn.gold };
state.last = Object.assign(base,extra);
}
function goldFirst(state,drone) {
return Boolean(drone.gold) && state.bay.some((other) => other.n < drone.n);
}
function armGold(turn) {
if (!turn.gold) return;
const { state,drone } = turn;
state.double = true;
state.golds += 1;
state.insured = state.bay.find((other) => other.n < drone.n).n;
}
function answerPoints(turn,points) {
return turn.gold ? points * GOLD_MULT :points;
}
function playPair(turn) {
const { state,drone,key,play } = turn;
const partner = takePartner(state,key);
if (!turn.trust) state.combo += 1;
state.maxCombo = Math.max(state.maxCombo,state.combo);
state.pairs += 1;
const points = answerPoints(turn,pairScore(turn.trust ? 1 :state.combo,play.pace,play.fuseLeft));
state.score += points;
mark(state,drone.n,'paired');
mark(state,partner,'paired');
outcome(turn,{ kind:'pair',partner,points,combo:state.combo });
leave(state,drone);
armGold(turn);
}
function playStore(turn,kind) {
const { state,drone } = turn;
const points = answerPoints(turn,STORE_POINTS);
state.score += points;
outcome(turn,{ kind,points,self:2 * drone.v === turretTarget(state) });
storeDrone(state,drone);
armGold(turn);
}
function playWrong(turn) {
const { state,drone,key,slot } = turn;
const ram = drone.n >= state.spec.rushFrom;
state.wrong += 1;
state.combo = 0;
const spot = isLit(state,slot) ? TURRET_TEXTS.toast.lit :TURRET_TEXTS.toast.empty;
const values = { slot,v:drone.v,t:turretTarget(state),key,state:spot };
const why = fillText(TURRET_TEXTS.toast.wrong,values) + (ram ? TURRET_TEXTS.toast.ram :'');
outcome(turn,{ kind:'wrong',slot,ram,damage:ram ? 1 :0,why });
if (ram) hurt(state);
}
function playProbe(turn) {
turn.state.steps += 1;
if (turn.slot !== turn.key) return playWrong(turn);
return isLit(turn.state,turn.key) ? playPair(turn) :playStore(turn,'store');
}
function playTrust(turn) {
turn.state.steps += 1;
turn.state.hint.choice = 'trust';
turn.trust = true;
return isLit(turn.state,turn.key) ? playPair(turn) :playStore(turn,'store');
}
function playWalk(turn) {
const { state,drone,key } = turn;
const partner = takePartner(state,key);
state.wrong += 1;
state.combo = 0;
mark(state,partner,'out');
const why = fillText(TURRET_TEXTS.toast.walk,{ v:drone.v,key });
outcome(turn,{ kind:'walk',partner,damage:1,why });
storeDrone(state,drone);
hurt(state);
}
function playTag(turn) {
turn.state.steps += 1;
return isLit(turn.state,turn.key) ? playWalk(turn) :playStore(turn,'tag');
}
function playFuse(turn) {
const { state,drone,key } = turn;
const lit = isLit(state,key);
const covered = state.insured === drone.n;
state.fuses += 1;
state.combo = 0;
mark(state,drone.n,'out');
const spot = lit ? TURRET_TEXTS.toast.lit :TURRET_TEXTS.toast.empty;
const text = covered ? TURRET_TEXTS.toast.fuseCovered :TURRET_TEXTS.toast.fuse;
const why = fillText(text,{ v:drone.v,t:turretTarget(state),key,state:spot });
outcome(turn,{ kind:'fuse',lit,covered,damage:covered ? 0 :1,why });
state.insured = 0;
leave(state,drone);
if (!covered) hurt(state);
}
function playSwarm(turn) {
const { state } = turn;
const value = state.stream[state.next];
state.next += 1;
state.log.push({ n:state.next,v:value,mark:'out' });
state.resolved += 1;
state.combo = 0;
const target = targetAt(state.spec,state.next);
const why = fillText(TURRET_TEXTS.toast.swarm,{ v:value,t:target,key:target - value });
state.last = { bay:0,n:state.next,v:value,key:target - value,t:target,damage:1,ram:true,points:0,gold:false,kind:'swarm',why };
hurt(state);
}
const PLAYS = { probe:playProbe,tag:playTag,fuse:playFuse,trust:playTrust,swarm:playSwarm };

function settle(state) {
if (state.status !== 'running') return;
refill(state);
if (!state.spec.endless && state.next >= state.stream.length && state.bay.length === 0) state.status = 'won';
}
function validMove(state,move) {
if (move.verb === 'swarm') return swarmReady(state);
if (move.verb === 'trust') return hintOffer(state)?.bay === move.bay;
const slotOk = move.verb !== 'probe' || (move.slot >= MIN_SLOT && move.slot <= state.spec.slots);
return slotOk && Boolean(state.bay[move.bay]);
}
function spendDouble(state,play) {
const mate = state.bay[0];
if (!ANSWER_KINDS.has(state.last.kind) || !mate) return;
state.double = false;
const first = state.last;
const turn = { state,drone:mate,key:keyFor(state,mate),bay:0,slot:0,play,gold:false };
if (isLit(state,turn.key)) playPair(turn);
else playStore(turn,'store');
state.last = Object.assign({},first,{ also:state.last });
}
function applyTurret(state,moveId,ctx = DEFAULT_CTX) {
const move = parseMove(moveId);
if (state.status !== 'running' || !move || !validMove(state,move)) return state;
const draft = cloneState(state);
const drone = draft.bay[move.bay] || draft.bay[0];
const play = state.assist ? DEFAULT_CTX :Object.assign({},DEFAULT_CTX,ctx);
const spending = draft.double;
PLAYS[move.verb]({ state:draft,drone,key:keyFor(draft,drone),bay:move.bay,slot:move.slot,play,gold:goldFirst(draft,drone) });
if (spending) spendDouble(draft,play);
settle(draft);
return draft;
}

export {
createTurret,turretMoves,applyTurret,turretTarget,bayOf,keyFor,fuseMsFor,bruteCompares,parOf,turretStars,
paceAt,pairScore,waveClockOn,hintOffer,verifyHint,swarmReady,swarmWindowMs,
};

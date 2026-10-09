import { ASSIST_PACE,BRUTE_MS_PER_COMPARE,FUSE_MS,PACE_MAX,SCORE,TURRET_W1 } from './data/turret-wave1.js';
import { TURRET_TEXTS,fillText } from './data/turret-texts.js';
import { tAt } from './turret-stream.js';


const MIN_SLOT = 1;
const MAX_STARS = 3;
const STORE_POINTS = 10;
const DEFAULT_CTX = { pace:ASSIST_PACE,fuseLeft:0 };
const PROBE_PARTS = 3;
const TAG_PARTS = 2;
const RADIX = 10;
const VERB_PARTS = { probe:PROBE_PARTS,tag:TAG_PARTS,fuse:TAG_PARTS };

function bayCap(state) {
if (state.bay.some((drone) => drone.n < TURRET_W1.dualFrom)) return 1;
return state.next + 1 >= TURRET_W1.dualFrom ? TURRET_W1.bayCap :1;
}
function fuseMsFor(number) {
if (number >= TURRET_W1.fuse2From) return FUSE_MS.second;
return number >= TURRET_W1.fuseFrom ? FUSE_MS.first :null;
}
function refill(state) {
while (state.next < state.stream.length && state.bay.length < bayCap(state)) {
const value = state.stream[state.next];
state.next += 1;
state.bay.push({ n:state.next,v:value,fuseMs:fuseMsFor(state.next) });
state.log.push({ n:state.next,v:value,mark:'' });
}
}
function cloneState(state) {
return Object.assign({},state,{
bay:state.bay.map((drone) => Object.assign({},drone)),board:state.board.slice(),
born:state.born.map((list) => list.slice()),log:state.log.map((entry) => Object.assign({},entry)),
});
}
function createTurret(stream,options = {}) {
const state = {
stream,assist:Boolean(options.assist),next:0,bay:[],board:Array(TURRET_W1.slots + 1).fill(0),
born:Array.from({ length:TURRET_W1.slots + 1 },() => []),integrity:TURRET_W1.integrity,combo:0,maxCombo:0,
score:0,steps:0,wrong:0,pairs:0,fuses:0,resolved:0,log:[],status:'running',last:null,
};
refill(state);
return state;
}
function turretTarget(state) {
return tAt(state.next);
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
return Math.round(SCORE.base * Math.min(combo,TURRET_W1.comboCap) * pace) + Math.round(bonus);
}
function turretMoves(state) {
if (state.status !== 'running') return [];
return state.bay.flatMap(function (_,index) {
const probes = Array.from({ length:TURRET_W1.slots },(__,slot) => 'probe:' + index + ':' + (slot + MIN_SLOT));
return [...probes,'tag:' + index];
});
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
return key >= MIN_SLOT && key <= TURRET_W1.slots && state.board[key] > 0;
}
function mark(state,number,value) {
const entry = state.log.find((item) => item.n === number);
if (entry) entry.mark = value;
}
function leave(state,drone) {
state.bay = state.bay.filter((item) => item !== drone);
state.resolved += 1;
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
state.board[drone.v] += 1;
state.born[drone.v].push(drone.n);
leave(state,drone);
}
function outcome(turn,extra) {
const { state,drone,key,bay } = turn;
const base = { bay,n:drone.n,v:drone.v,key,t:turretTarget(state),damage:0,ram:false,points:0 };
state.last = Object.assign(base,extra);
}
function playPair(turn) {
const { state,drone,key,play } = turn;
const partner = takePartner(state,key);
state.combo += 1;
state.maxCombo = Math.max(state.maxCombo,state.combo);
state.pairs += 1;
const points = pairScore(state.combo,play.pace,play.fuseLeft);
state.score += points;
mark(state,drone.n,'paired');
mark(state,partner,'paired');
outcome(turn,{ kind:'pair',partner,points,combo:state.combo });
leave(state,drone);
}
function playStore(turn,kind) {
const { state,drone } = turn;
state.score += STORE_POINTS;
outcome(turn,{ kind,points:STORE_POINTS });
storeDrone(state,drone);
}
function playWrong(turn) {
const { state,drone,key,slot } = turn;
const ram = drone.n >= TURRET_W1.rushFrom;
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
state.fuses += 1;
state.combo = 0;
mark(state,drone.n,'out');
const spot = lit ? TURRET_TEXTS.toast.lit :TURRET_TEXTS.toast.empty;
const why = fillText(TURRET_TEXTS.toast.fuse,{ v:drone.v,t:turretTarget(state),key,state:spot });
outcome(turn,{ kind:'fuse',lit,damage:1,why });
leave(state,drone);
hurt(state);
}
const PLAYS = { probe:playProbe,tag:playTag,fuse:playFuse };

function settle(state) {
if (state.status !== 'running') return;
refill(state);
if (state.next >= state.stream.length && state.bay.length === 0) state.status = 'won';
}
function validMove(state,move) {
const slotOk = move.verb !== 'probe' || (move.slot >= MIN_SLOT && move.slot <= TURRET_W1.slots);
return slotOk && Boolean(state.bay[move.bay]);
}
function applyTurret(state,moveId,ctx = DEFAULT_CTX) {
const move = parseMove(moveId);
if (state.status !== 'running' || !move || !validMove(state,move)) return state;
const draft = cloneState(state);
const drone = draft.bay[move.bay];
const play = state.assist ? DEFAULT_CTX :Object.assign({},DEFAULT_CTX,ctx);
PLAYS[move.verb]({ state:draft,drone,key:keyFor(draft,drone),bay:move.bay,slot:move.slot,play });
settle(draft);
return draft;
}

export {
createTurret,turretMoves,applyTurret,turretTarget,bayOf,keyFor,fuseMsFor,bruteCompares,parOf,turretStars,
paceAt,pairScore,waveClockOn,
};

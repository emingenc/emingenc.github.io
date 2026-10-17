import { ammoMax,spendShot } from '../ammo.js';
import { BEAM_TEXTS } from './data/beam-texts.js';
import { ASSIST_PACE,BEAM_WAVES,DEFAULT_CTX,HEARTS,HINT_SHOTS,MITE,SCORE,SHARD } from './data/beam-wave.js';
import { fillText } from './data/turret-texts.js';
import { beamBudget,beamPar,bestSplit,endOf,isLive,liveCells,loseHearts,middleOf,payShot,reject,roundBudget,scopeCells,sidesOf,waveOf,worstSide } from './beam-base.js';
import { ROTATED_HANDLERS,rotatedExtras,rotatedMoves } from './beam-rotated.js';


const MAX_STARS = 3;
const SELECT = 'select:';
const MOVE_FIRE = 'fire';
const MOVE_LOCK = 'lock';
const MOVE_BOLT_MITE = 'bolt:mite';
const MOVE_BOLT_SHARD = 'bolt:shard';
const TOASTS = BEAM_TEXTS.toast;
const WHY = BEAM_TEXTS.why;

function bruteShots(wave) {
return typeof wave === 'number' ? wave :waveOf(wave).rounds.reduce((sum,cells) => sum + cells,0);
}
function answerWord(wave,side) {
return BEAM_TEXTS.words[wave][side];
}
function createBeam(wave,options = {}) {
const spec = waveOf(wave);
const bolt = Boolean(options.bolt);
const state = {
wave,n:spec.n,round:0,rounds:spec.rounds.slice(),assist:Boolean(options.assist),bolt,ammo:bolt ? (options.ammo ?? ammoMax(1)) :null,lo:0,hi:spec.n - 1,
probes:0,roundShots:0,hearts:HEARTS,selected:null,mites:[],shard:null,shardShed:false,nextId:1,score:0,combo:0,maxCombo:0,slips:0,
hits:0,bites:0,decoys:0,log:[],status:'running',last:null,
};
return spec.rotated ? Object.assign(state,rotatedExtras(options)) :state;
}
function upperMiddleOf(state) {
return Math.floor((state.lo + state.hi + 1) / 2);
}
function middleHint(state) {
const show = BEAM_WAVES[state.wave].hint && state.round === 0 && state.status === 'running' && state.probes < HINT_SHOTS;
return show ? middleOf(state) :null;
}
function beamMoves(state) {
if (state.status !== 'running') return [];
if (state.rotated) return rotatedMoves(state);
const moves = liveCells(state).map((cell) => SELECT + cell);
if (isLive(state,state.selected)) moves.push(MOVE_FIRE);
if (state.bolt && state.mites.length > 0) moves.push(MOVE_BOLT_MITE);
if (state.bolt && state.shard) moves.push(MOVE_BOLT_SHARD);
return moves;
}
function beamStars(state) {
if (state.status !== 'won') return 0;
if ((state.bolt ? state.hits :state.decoys) > 0) return 1;
return state.slips > 0 || state.probes > beamPar(state.wave) ? MAX_STARS - 1 :MAX_STARS;
}
function cloneState(state) {
return Object.assign({},state,{
mites:state.mites.map((mite) => Object.assign({},mite)),shard:state.shard && Object.assign({},state.shard),log:state.log.slice(),
});
}
function selectCell(turn) {
const { state,move } = turn;
const cell = Number(move.slice(SELECT.length));
if (state.pending) return reject(turn,BEAM_TEXTS.rotated.rejectPending);
if (!isLive(state,cell)) return reject(turn,fillText(TOASTS.rejectDead,{ cell:move.slice(SELECT.length),lo:state.lo,hi:state.hi }));
state.selected = cell;
state.last = { move,ok:true,kind:'select',cell,toast:fillText(BEAM_TEXTS.coach.select,{ cell }) };
return state;
}
function lockEarly(turn) {
const { state } = turn;
return reject(turn,fillText(TOASTS.lockEarly,{ m:state.hi - state.lo + 1 }));
}
function judgeShot(state,cell) {
const sides = sidesOf(state,cell);
const side = sides.up >= sides.down ? 'up' :'down';
const kept = sides[side];
const live = state.hi - state.lo + 1;
const to = side === 'up' ? { lo:cell + 1,hi:state.hi } :{ lo:state.lo,hi:state.lo + sides.down - 1 };
const shot = {
cell,sides,side,from:{ lo:state.lo,hi:state.hi },to,kept,dead:live - kept,best:bestSplit(state),
slip:Math.max(sides.down,sides.up) > bestSplit(state),decoy:kept === live,answer:answerWord(state.wave,side),
};
shot.why = whyOf(state,shot);
return shot;
}
function whyOf(state,shot) {
if (shot.decoy) return decoyLine(state,shot) + WHY.hit;
if (!shot.slip) return '';
const mid = middleOf(state);
const split = sidesOf(state,mid);
const key = shot.cell === upperMiddleOf(state) ? 'upperMiddle' :'slip';
const values = { cell:shot.cell,lo:state.lo,hi:state.hi,a:shot.sides.down,b:shot.sides.up,c:split.down,d:split.up,mid };
return fillText(WHY[key],values);
}
function decoyLine(state,shot) {
const live = state.hi - state.lo + 1;
return fillText(live === 2 ? WHY.decoy :WHY.decoyTop,{ cell:shot.cell,lo:state.lo,hi:state.hi,m:live });
}
function moveShot(state,shot) {
state.probes += 1;
state.roundShots += 1;
state.selected = null;
state.lo = shot.to.lo;
state.hi = shot.to.hi;
state.log.push({ cell:shot.cell,answer:shot.answer,from:shot.from,to:shot.to });
}
function tickMites(state) {
const ticking = state.mites.map((mite) => Object.assign({},mite,{ bitesIn:mite.bitesIn - 1 }));
const bitten = ticking.filter((mite) => mite.bitesIn <= 0).length;
state.mites = ticking.filter((mite) => mite.bitesIn > 0);
state.bites += bitten;
loseHearts(state,bitten);
return bitten;
}
function dropMite(state) {
if (!BEAM_WAVES[state.wave].mites || state.probes % MITE.every !== 0) return false;
state.mites.push({ id:state.nextId,bitesIn:MITE.bitesIn });
state.nextId += 1;
return true;
}
function shedShard(state,shot) {
const greedy = state.bolt && !state.shardShed && state.ammo >= SHARD.minAmmo && shot.dead >= SHARD.minDead;
if (!greedy) return false;
state.shard = { id:state.nextId };
state.nextId += 1;
state.shardShed = true;
return true;
}
function settleProbe(state,shot) {
const bites = tickMites(state);
return { bites,mite:dropMite(state),shard:shedShard(state,shot) };
}
function endLine(state,end) {
const shots = end === 'lock' ? state.probes :state.roundShots;
const values = { cell:state.lo,shots,par:beamPar(state.wave),m:state.hi - state.lo + 1,lo:state.lo,hi:state.hi };
if (end === 'lock') return fillText(state.probes > values.par ? WHY.winOver :WHY.win,values);
return fillText(end === 'hearts' ? WHY.lostHearts :WHY.lostShots,values);
}
function eventLines(events,bolt) {
const lines = [];
if (events.shardLost) lines.push(TOASTS.shardLost);
if (events.bites > 0) lines.push(bolt ? TOASTS.bite :TOASTS.biteNoBolt);
if (events.mite) lines.push(fillText(TOASTS.miteDrop,{ n:MITE.bitesIn }));
if (events.shard) lines.push(fillText(BEAM_TEXTS.coach.shard,{ points:SHARD.score }));
return lines;
}
function shotToast(shot,events,bolt) {
const values = { cell:shot.cell,lo:shot.from.lo,hi:shot.from.hi,word:shot.answer,nlo:shot.to.lo,nhi:shot.to.hi,size:shot.kept,best:shot.best };
return [fillText(TOASTS.shot,values),shot.why].concat(eventLines(events,bolt)).filter(Boolean).join(' ');
}
function landShot(turn,shot) {
const { state,play } = turn;
const events = { shardLost:Boolean(state.shard),bites:0,mite:false,shard:false };
state.shard = null;
moveShot(state,shot);
events.points = payShot(state,shot,play);
if (shot.decoy) {
state.decoys += 1;
loseHearts(state,1);
}
if (state.lo !== state.hi) Object.assign(events,settleProbe(state,shot));
return events;
}
function roundLine(state,shots) {
return fillText(TOASTS.roundLock,{ done:state.round,shots,next:state.round + 1,n:state.n });
}
function shotResult(state,result) {
if (result.end === 'round') return roundLine(state,result.shots);
return result.end ? endLine(state,result.end) :shotToast(result.shot,result.events,state.bolt);
}
function fireShot(turn) {
const { state,move } = turn;
if (!isLive(state,state.selected)) return reject(turn,TOASTS.rejectNone);
const shot = judgeShot(state,state.selected);
const events = landShot(turn,shot);
const shots = state.roundShots;
const end = endOf(state);
const toast = shotResult(state,{ end,shot,events,shots });
state.last = Object.assign({ move,ok:true,kind:'shot',end,events,toast,points:events.points,why:shot.why },pickShot(shot));
return state;
}
function pickShot(shot) {
const { cell,answer,side,from,to,kept,dead,slip,decoy } = shot;
return { cell,answer,side,from,to,kept,dead,slip,decoy };
}
function spendBolt(state) {
const shot = spendShot(state.ammo);
state.ammo = shot.ammo;
return shot.dry;
}
function dryBolt(turn) {
turn.state.last = { move:turn.move,ok:false,kind:'bolt',dry:true,toast:TOASTS.dry };
return turn.state;
}
function boltMite(turn) {
const { state,move } = turn;
if (!state.bolt || state.mites.length === 0) return reject(turn,TOASTS.rejectNoBolt);
if (spendBolt(state)) return dryBolt(turn);
state.mites = state.mites.slice(1);
state.last = { move,ok:true,kind:'bolt',target:'mite',toast:fillText(TOASTS.boltMite,{ ammo:state.ammo }) };
return state;
}
function boltShard(turn) {
const { state,move } = turn;
if (!state.bolt || !state.shard) return reject(turn,TOASTS.rejectNoBolt);
if (spendBolt(state)) return dryBolt(turn);
state.shard = null;
state.score += SHARD.score;
state.last = { move,ok:true,kind:'bolt',target:'shard',points:SHARD.score,toast:fillText(TOASTS.boltShard,{ points:SHARD.score,ammo:state.ammo }) };
return state;
}
const HANDLERS = { select:selectCell,[MOVE_FIRE]:fireShot,[MOVE_LOCK]:lockEarly,[MOVE_BOLT_MITE]:boltMite,[MOVE_BOLT_SHARD]:boltShard };
function handlerOf(state,move) {
if (state.rotated && Object.hasOwn(ROTATED_HANDLERS,move)) return ROTATED_HANDLERS[move];
return HANDLERS[move.startsWith(SELECT) ? 'select' :move];
}
function applyBeam(state,move,ctx = DEFAULT_CTX) {
if (state.status !== 'running' || typeof move !== 'string') return state;
const handler = handlerOf(state,move);
if (!handler) return state;
const play = state.assist ? DEFAULT_CTX :Object.assign({ pace:ASSIST_PACE },ctx);
return handler({ state:cloneState(state),move,play });
}

export { createBeam,applyBeam,beamMoves,beamStars,beamPar,beamBudget,roundBudget,liveCells,scopeCells,middleOf,sidesOf,worstSide,middleHint,bruteShots,answerWord };

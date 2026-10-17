import { BEAM_TEXTS } from './data/beam-texts.js';
import { W3_STREAMS } from './data/beam-w3-pool.js';
import { fillText } from './data/turret-texts.js';
import { beamPar,bestSplit,endOf,isLive,liveCells,loseHearts,middleOf,payShot,reject,sidesOf,worstSide } from './beam-base.js';


const LEFT = 'left';
const RIGHT = 'right';
const WORD_KEY = { left:'down',right:'up' };
const TEXT = BEAM_TEXTS.rotated;

function rotatedExtras(options) {
return { rotated:true,stream:options.stream ?? W3_STREAMS[0],pending:null };
}
function rotatedEnds(state) {
return { lo:state.stream.values[state.lo],hi:state.stream.values[state.hi] };
}
function rotatedCall(state,cell) {
const { values,target } = state.stream;
const [al,am,ah] = [values[state.lo],values[cell],values[state.hi]];
const leftSorted = al <= am;
const inside = leftSorted ? al <= target && target < am :am < target && target <= ah;
return {
side:inside === leftSorted ? LEFT :RIGHT,key:(leftSorted ? 'sorted' :'rotated') + (inside ? 'In' :'Out'),values:{ al,am,ah,t:target },
};
}
function rotatedMoves(state) {
if (state.pending) return ['keep:left','keep:right'];
const moves = liveCells(state).map((cell) => 'select:' + cell);
if (isLive(state,state.selected)) moves.push('fire');
return moves;
}
function endLine(state,end) {
const values = { cell:state.lo,t:state.stream.target,shots:state.probes,par:beamPar(state.wave),m:state.hi - state.lo + 1,lo:state.lo,hi:state.hi };
if (end === 'lock') return fillText(state.probes > values.par ? TEXT.winOver :TEXT.win,values);
return fillText(end === 'hearts' ? TEXT.lostHearts :BEAM_TEXTS.why.lostShots,values);
}
function slipLine(state,cell) {
const sides = sidesOf(state,cell);
const mid = middleOf(state);
const split = sidesOf(state,mid);
return ' ' + fillText(BEAM_TEXTS.why.slip,{ cell,lo:state.lo,hi:state.hi,a:sides.down,b:sides.up,c:split.down,d:split.up,mid });
}
function spendProbe(turn,cell) {
const { state,play } = turn;
const slip = worstSide(state,cell) > bestSplit(state);
const line = slip ? slipLine(state,cell) :'';
state.probes += 1;
state.roundShots += 1;
state.selected = null;
return { slip,line,points:payShot(state,{ slip },play) };
}
function openProbe(turn,shot) {
const { state,move } = turn;
const { cell,value,slip,line,points } = shot;
state.pending = { cell,value };
const toast = fillText(TEXT.probe,{ cell,lo:state.lo,hi:state.hi,value,t:state.stream.target }) + line;
state.last = { move,ok:true,kind:'shot',hit:false,cell,value,slip,end:'',points,toast };
return state;
}
function hitProbe(turn,shot) {
const { state,move } = turn;
const { cell,value,slip,points } = shot;
const from = { lo:state.lo,hi:state.hi };
state.lo = cell;
state.hi = cell;
state.log.push({ cell,value,answer:'HIT',from,to:{ lo:cell,hi:cell } });
const end = endOf(state);
state.last = { move,ok:true,kind:'shot',hit:true,cell,value,slip,end,points,toast:endLine(state,end) };
return state;
}
function fireProbe(turn) {
const { state } = turn;
if (state.pending) return reject(turn,TEXT.rejectPending);
if (!isLive(state,state.selected)) return reject(turn,BEAM_TEXTS.toast.rejectNone);
const cell = state.selected;
const value = state.stream.values[cell];
const shot = Object.assign({ cell,value },spendProbe(turn,cell));
return value === state.stream.target ? hitProbe(turn,shot) :openProbe(turn,shot);
}
function wrongKeep(turn,call,side) {
const { state,move } = turn;
loseHearts(state,1);
state.decoys += 1;
state.combo = 0;
const end = state.hearts <= 0 ? endOf(state) :'';
const word = BEAM_TEXTS.words.w3[WORD_KEY[side]];
const toast = end ? endLine(state,end) :fillText(TEXT.wrong,{ word,why:fillText(TEXT[call.key],call.values) });
state.last = { move,ok:true,kind:'keep',wrong:true,side,end,toast };
return state;
}
function rightKeep(turn,call,side) {
const { state,move } = turn;
const { cell,value } = state.pending;
const from = { lo:state.lo,hi:state.hi };
if (side === LEFT) state.hi = cell;
else state.lo = cell + 1;
const to = { lo:state.lo,hi:state.hi };
const word = BEAM_TEXTS.words.w3[WORD_KEY[side]];
state.pending = null;
state.log.push({ cell,value,answer:word,from,to });
const end = endOf(state);
const size = to.hi - to.lo + 1;
const why = fillText(TEXT[call.key],call.values);
const toast = end ? endLine(state,end) :fillText(TEXT.keep,{ word,nlo:to.lo,nhi:to.hi,size,why });
state.last = { move,ok:true,kind:'keep',wrong:false,side,from,to,kept:size,end,toast };
return state;
}
function keepHalf(turn,side) {
if (!turn.state.pending) return reject(turn,TEXT.rejectKeep);
const call = rotatedCall(turn.state,turn.state.pending.cell);
return side === call.side ? rightKeep(turn,call,side) :wrongKeep(turn,call,side);
}
const ROTATED_HANDLERS = { fire:fireProbe,'keep:left':(turn) => keepHalf(turn,LEFT),'keep:right':(turn) => keepHalf(turn,RIGHT) };

export { ROTATED_HANDLERS,rotatedExtras,rotatedEnds,rotatedCall,rotatedMoves };

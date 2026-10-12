import { NET_INTEGRITY,NET_SCORE,NET_WAVES } from './data/net-waves.js';
import { NET_TEXTS,fillText } from './data/net-texts.js';


const MAX_STARS = 3;
const DEFAULT_WAVE = 'w1';
const MOVE_ORDER = ['extend','shrink','jump','flick'];
const NOT_SEEN = -1;
const MIN_JUMP_SAVING = 2;

function rulesOf(wave) {
return typeof wave === 'string' ? NET_WAVES[wave] :wave;
}
function countOf(items) {
return items.reduce(function (counts,item) {
return Object.assign(counts,{ [item]:(counts[item] ?? 0) + 1 });
},{});
}
function netPeek(state) {
return state.stream.items[state.r];
}
function netSum(state) {
return state.sum;
}
function netBest(state) {
return state.best;
}

const JUDGES = {
distinct:{
enter:(state,item) => { state.count[item] = (state.count[item] ?? 0) + 1; },
leave:(state,item) => { state.count[item] -= 1; },
blocked:(state) => (state.count[netPeek(state)] ?? 0) > 0,
strained:() => false,
tearWhy:(state) => fillText(NET_TEXTS.toast.tear,{ x:netPeek(state) }),
wastedWhy:() => NET_TEXTS.toast.wasted,
strainWhy:() => '',
},
sum:{
enter:(state,item) => { state.sum += item; },
leave:(state,item) => { state.sum -= item; },
blocked:(state) => state.sum > state.stream.k,
strained:(state) => state.sum > state.stream.k,
tearWhy:(state) => fillText(NET_TEXTS.toast.tearSum,{ sum:state.sum,k:state.stream.k }),
wastedWhy:(state) => fillText(NET_TEXTS.toast.wastedSum,{ sum:state.sum,k:state.stream.k }),
strainWhy:(state) => fillText(NET_TEXTS.toast.strain,{ sum:state.sum,k:state.stream.k }),
},
};
function judgeOf(state) {
return JUDGES[state.rules.judge];
}

function createNet(stream,options = {}) {
const rules = rulesOf(options.wave ?? DEFAULT_WAVE);
return {
stream,wave:rules.id,rules,l:0,r:0,count:{},sum:0,best:0,integrity:NET_INTEGRITY,steps:0,wrong:0,tears:0,
flicked:false,score:0,status:'running',fail:'',last:null,
};
}
function cloneState(state) {
return Object.assign({},state,{ count:Object.assign({},state.count) });
}
function lastSeen(state) {
const peek = netPeek(state);
return state.r > 0 && peek !== undefined ? state.stream.items.lastIndexOf(peek,state.r - 1) :NOT_SEEN;
}
function netWouldTear(state) {
return state.status === 'running' && state.r < state.stream.items.length && judgeOf(state).blocked(state);
}

const LEGAL = {
extend:(state) => state.r < state.stream.items.length,
shrink:(state) => state.l < state.r,
jump:(state) => Boolean(state.rules.jump) && lastSeen(state) !== NOT_SEEN,
flick:(state) => !state.flicked && state.l <= state.stream.gold && state.stream.gold < state.r,
};
function netMoves(state) {
if (state.status !== 'running') return [];
return MOVE_ORDER.filter((move) => LEGAL[move](state));
}

function outcome(move,kind,why) {
return { kind,move,why };
}
function tear(state,last) {
state.steps += 1;
state.wrong += 1;
state.tears += 1;
state.integrity -= 1;
state.l = state.r;
state.count = {};
state.sum = 0;
state.last = last;
if (state.integrity > 0) return;
state.status = 'failed';
state.fail = 'tear';
}
function playExtend(state) {
const judge = judgeOf(state);
if (judge.blocked(state)) return tear(state,outcome('extend','tear',judge.tearWhy(state)));
judge.enter(state,netPeek(state));
state.r += 1;
state.steps += 1;
state.last = judge.strained(state) ? outcome('extend','strain',judge.strainWhy(state)) :outcome('extend','extend','');
}
function playShrink(state) {
const judge = judgeOf(state);
const wasted = !judge.blocked(state);
const why = wasted ? judge.wastedWhy(state) :'';
judge.leave(state,state.stream.items[state.l]);
state.l += 1;
state.steps += 1;
if (wasted) state.wrong += 1;
state.last = outcome('shrink',wasted ? 'wasted' :'shrink',why);
}
function firstRepeat(items) {
const counts = countOf(items);
return items.find((item) => counts[item] > 1);
}
function jumpTarget(state) {
const behind = lastSeen(state) + 1;
return state.rules.jump === 'max' ? Math.max(state.l,behind) :behind;
}
function wastedJump(state,target) {
const toast = target < state.l ? NET_TEXTS.toast.jumpBack :NET_TEXTS.toast.jumpStays;
state.wrong += 1;
state.last = outcome('jump','wasted',fillText(toast,{ x:netPeek(state),l:target }));
}
function playJump(state) {
const peek = netPeek(state);
const target = jumpTarget(state);
const repeat = firstRepeat(state.stream.items.slice(target,state.r));
if (repeat !== undefined) return tear(state,outcome('jump','tear-jump',fillText(NET_TEXTS.toast.tearJump,{ x:peek,l:target,y:repeat })));
if (target > state.l) state.last = outcome('jump','jump','');
else wastedJump(state,target);
state.count = countOf(state.stream.items.slice(target,state.r));
state.l = target;
state.steps += 1;
}
function playFlick(state) {
const gold = state.stream.items[state.stream.gold];
state.flicked = true;
state.steps += 1;
state.score += NET_SCORE.gold;
state.last = outcome('flick','flick',fillText(NET_TEXTS.toast.flick,{ x:gold,points:NET_SCORE.gold }));
}
const PLAYS = { extend:playExtend,shrink:playShrink,jump:playJump,flick:playFlick };

function settle(state) {
const judge = judgeOf(state);
if (!judge.strained(state)) state.best = Math.max(state.best,state.r - state.l);
if (state.r < state.stream.items.length || judge.strained(state)) return;
state.status = 'won';
state.score += NET_SCORE.clear + NET_SCORE.perBest * state.best + NET_SCORE.perIntegrity * state.integrity;
}
function applyNet(state,move) {
if (!netMoves(state).includes(move)) return state;
const draft = cloneState(state);
PLAYS[move](draft);
if (draft.status === 'running') settle(draft);
return draft;
}

function perfectMove(state) {
if (!judgeOf(state).blocked(state)) return 'extend';
const shrinksNeeded = state.rules.jump ? lastSeen(state) + 1 - state.l :0;
return shrinksNeeded >= MIN_JUMP_SAVING ? 'jump' :'shrink';
}
function netLine(stream,wave = DEFAULT_WAVE) {
const line = [];
let state = createNet(stream,{ wave });
while (state.status === 'running') {
line.push(perfectMove(state));
state = applyNet(state,line[line.length - 1]);
}
return line;
}
function netPar(stream,wave = DEFAULT_WAVE) {
return netLine(stream,wave).length;
}
function netStars(state) {
if (state.status !== 'won') return 0;
if (state.wrong > 0) return 1;
return state.steps <= netPar(state.stream,state.rules) ? MAX_STARS :MAX_STARS - 1;
}

function readsFrom(scratch) {
const judge = judgeOf(scratch);
let reads = 0;
while (scratch.r < scratch.stream.items.length) {
reads += 1;
if (judge.blocked(scratch)) break;
judge.enter(scratch,netPeek(scratch));
scratch.r += 1;
if (judge.strained(scratch)) break;
}
return reads;
}
function bruteReads(stream,wave = DEFAULT_WAVE) {
return stream.items.reduce(function (total,_,start) {
const scratch = Object.assign(createNet(stream,{ wave }),{ l:start,r:start });
return total + readsFrom(scratch);
},0);
}

export { createNet,applyNet,netMoves,netPar,netLine,netStars,netBest,netPeek,netSum,netWouldTear,bruteReads };

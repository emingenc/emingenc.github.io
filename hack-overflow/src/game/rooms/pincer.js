import { PINCER_TEXTS,fillText } from './data/pincer-texts.js';
import { CANNON_SLOTS,LOOKUP_STEPS,SORT_STEPS } from './data/pincer-waves.js';
import { eat,pairsOf,pillarsOf,specOf,sumOf,win } from './pincer-base.js';
import { canBank,canStep,currentArea,playBank,playDamFire,playDamPointer } from './pincer-dam.js';
import { pincerWhyNot } from './pincer-refuse.js';
import { canLookup,canSort,playLookup,playSort } from './pincer-route.js';


const MAX_STARS = 3;
const PLANK_MIN_CHARGES = 2;
const NO_EATER = -1;
const NO_PARTNER = -1;
const NO_PAR = 0;
const MOVE_ORDER = ['l','r','fire','plank','sort','lookup','bank'];
const SIDES = {
l:{ field:'l',step:1,kind:'left',safeKind:'left-wrong',safeToast:'rightSafeLeft',dropToast:'dropLeft',isRight:(sum,target) => sum < target },
r:{ field:'r',step:-1,kind:'right',safeKind:'right-wrong',safeToast:'rightSafeRight',dropToast:'dropRight',isRight:(sum,target) => sum > target },
};
const POINTER_NAMES = { l:'L>',r:'<R' };

function allPairs(layout) {
return pairsOf(layout.pillars,layout.target);
}
function isFound(state,pair) {
return state.found.some((item) => item[0] === pair[0] && item[1] === pair[1]);
}
function cloneState(state) {
return Object.assign({},state,{ found:state.found.map((pair) => pair.slice()) });
}
const WAVE_EXTRAS = {
w1:() => ({}),
w2:(stream) => ({ pillars:stream.pillars.slice(),sorted:false,memory:CANNON_SLOTS }),
w3:() => ({ bank:0,bankAt:null }),
};
function createPincer(stream) {
const spec = specOf(stream);
const base = {
stream,l:0,r:spec.n - 1,floor:spec.floor,skip:0,charges:spec.charges,steps:0,wrong:0,pairs:0,
found:[],score:0,status:'running',fail:'',plankShot:false,last:null,
};
return Object.assign(base,WAVE_EXTRAS[spec.id](stream));
}
function pincerSum(state) {
return sumOf(state);
}
function pincerTotalPairs(stream) {
return allPairs(stream).length;
}
function pincerArea(state) {
return currentArea(state);
}
function pairsLeft(state) {
return allPairs({ pillars:pillarsOf(state),target:state.stream.target }).filter((pair) => pair[0] >= state.l && pair[1] <= state.r && !isFound(state,pair));
}
function bruteChecks(count) {
return Math.max(0,(count * (count - 1)) / 2);
}
function linePar(stream) {
const { pillars,target } = stream;
let low = 0;
let high = pillars.length - 1;
for (let moves = 0; low < high; moves += 1) {
const sum = pillars[low] + pillars[high];
if (sum === target) return moves + 1;
if (sum < target) low += 1;
else high -= 1;
}
return NO_PAR;
}
function sortedPar(stream) {
return linePar({ pillars:stream.pillars.slice().sort((first,second) => first - second),target:stream.target });
}
function pincerPar(stream) {
const spec = specOf(stream);
if (spec.dam) return spec.n - 1;
if (!spec.sort) return linePar(stream);
return stream.goal === 'time' ? LOOKUP_STEPS :SORT_STEPS + sortedPar(stream);
}
function pincerStars(state) {
if (state.status !== 'won') return 0;
if (state.wrong > 0) return 1;
return state.steps <= pincerPar(state.stream) ? MAX_STARS :MAX_STARS - 1;
}
function eaterNext(state) {
if (state.status !== 'running' || state.skip > 0) return NO_EATER;
return specOf(state).floor - state.floor;
}

function canLeft(state) {
return specOf(state).dam ? canStep(state) :state.l + 1 < state.r;
}
function canRight(state) {
return specOf(state).dam ? canStep(state) :state.r - 1 > state.l;
}
function canFire(state) {
return state.charges > 0 && !(specOf(state).dam && canStep(state));
}
function canPlank(state) {
const { plank } = state.stream;
return specOf(state).plank && !state.plankShot && state.l < plank && plank < state.r && state.charges >= PLANK_MIN_CHARGES;
}
function canBankNow(state) {
return specOf(state).dam && canBank(state);
}
const LEGAL = { l:canLeft,r:canRight,fire:canFire,plank:canPlank,sort:canSort,lookup:canLookup,bank:canBankNow };
function pincerMoves(state) {
if (state.status !== 'running') return [];
return MOVE_ORDER.filter((move) => LEGAL[move](state));
}

function relation(sum,target) {
if (sum < target) return { rel:'<',state:'low' };
return sum > target ? { rel:'>',state:'high' } :{ rel:'=',state:'equal' };
}
function baseTurn(state,move) {
return { state,move,sum:pincerSum(state),t:state.stream.target };
}
function noteOf(turn,kind,why) {
return { kind,move:turn.move,sum:turn.sum,t:turn.t,why };
}
function closeIn(state) {
if (state.l + 1 >= state.r - 1) return;
state.l += 1;
state.r -= 1;
}
function failCharges(state) {
state.status = 'failed';
state.fail = 'charges';
state.last = Object.assign({},state.last,{ kind:'charges',why:state.last.why || PINCER_TEXTS.toast.charges });
}

function pointerTurn(state,move) {
const side = SIDES[move];
const pillars = pillarsOf(state);
const turn = Object.assign(baseTurn(state,move),{ side,index:state[side.field] });
const right = state.sorted !== false && side.isRight(turn.sum,turn.t);
return Object.assign(turn,{ a:pillars[state.l],b:pillars[state.r],v:pillars[turn.index],right });
}
function partnerOf(state,index) {
const pair = pairsLeft(state).find((item) => item.includes(index));
return pair ? pair.find((item) => item !== index) :NO_PARTNER;
}
function pointerWords(turn) {
const { sum,t,a,b,v } = turn;
return Object.assign({ sum,t,a,b,v,name:POINTER_NAMES[turn.move] },relation(sum,t));
}
function playSafe(turn) {
const { state,side } = turn;
state.wrong += 1;
const key = state.sorted === false ? 'unsortedSafe' :side.safeToast;
state.last = noteOf(turn,side.safeKind,fillText(PINCER_TEXTS.toast[key],pointerWords(turn)));
eat(state);
}
function playDrop(turn,partner) {
const { state,side } = turn;
const values = Object.assign(pointerWords(turn),{ partner:pillarsOf(state)[partner] });
const key = state.sorted === false ? 'unsortedDrop' :side.dropToast;
state.wrong += 1;
state.status = 'failed';
state.fail = 'drop';
state.last = Object.assign(noteOf(turn,'drop',fillText(PINCER_TEXTS.toast[key],values)),{
index:turn.index,partnerIndex:partner,
});
}
function playSumPointer(state,move) {
const turn = pointerTurn(state,move);
const partner = turn.right ? NO_PARTNER :partnerOf(state,turn.index);
state.steps += 1;
state[turn.side.field] += turn.side.step;
if (partner !== NO_PARTNER) return playDrop(turn,partner);
if (!turn.right) return playSafe(turn);
state.last = noteOf(turn,turn.side.kind,'');
eat(state);
}

function playPointer(state,move) {
return specOf(state).dam ? playDamPointer(state,move) :playSumPointer(state,move);
}
function fireHit(turn) {
const { state } = turn;
const pair = [state.l,state.r];
state.found.push(pair);
state.pairs += 1;
state.last = Object.assign(noteOf(turn,'pair',''),{ pair });
if (state.pairs >= pincerTotalPairs(state.stream)) return win(state);
if (state.charges <= 0) return failCharges(state);
closeIn(state);
eat(state);
}
function fireMiss(turn) {
const { state } = turn;
state.wrong += 1;
state.last = noteOf(turn,'miss',fillText(PINCER_TEXTS.toast.miss,{ sum:turn.sum,t:turn.t }));
if (state.charges <= 0) return failCharges(state);
eat(state);
}
function playSumFire(state) {
const turn = baseTurn(state,'fire');
const fresh = turn.sum === turn.t && !isFound(state,[state.l,state.r]);
state.steps += 1;
state.charges -= 1;
return fresh ? fireHit(turn) :fireMiss(turn);
}
function playPlank(state) {
const turn = baseTurn(state,'plank');
const { plank } = state.stream;
const why = fillText(PINCER_TEXTS.toast.plank,{ v:pillarsOf(state)[plank] });
state.steps += 1;
state.charges -= 1;
state.plankShot = true;
state.score += specOf(state).plankScore;
state.last = Object.assign(noteOf(turn,'plank',why),{ index:plank,points:specOf(state).plankScore });
eat(state);
state.skip += 1;
}
function playFire(state) {
return specOf(state).dam ? playDamFire(state) :playSumFire(state);
}
const PLAYS = { l:playPointer,r:playPointer,fire:playFire,plank:playPlank,sort:playSort,lookup:playLookup,bank:playBank };

function applyPincer(state,moveId) {
if (!Object.hasOwn(PLAYS,moveId) || !pincerMoves(state).includes(moveId)) return state;
const draft = cloneState(state);
PLAYS[moveId](draft,moveId);
return draft;
}

export {
createPincer,applyPincer,pincerMoves,pincerSum,pincerTotalPairs,pincerPar,pincerStars,bruteChecks,eaterNext,
pairsLeft,pincerArea,pillarsOf,pincerWhyNot,
};

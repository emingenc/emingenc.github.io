import { PINCER_W1 } from './data/pincer-w1.js';
import { PINCER_TEXTS,fillText } from './data/pincer-texts.js';


const MAX_STARS = 3;
const PLANK_MIN_CHARGES = 2;
const NO_EATER = -1;
const NO_PARTNER = -1;
const NO_PAR = 0;
const MOVE_ORDER = ['l','r','fire','plank'];
const SIDES = {
l:{ field:'l',step:1,kind:'left',safeKind:'left-wrong',safeToast:'rightSafeLeft',dropToast:'dropLeft',isRight:(sum,target) => sum < target },
r:{ field:'r',step:-1,kind:'right',safeKind:'right-wrong',safeToast:'rightSafeRight',dropToast:'dropRight',isRight:(sum,target) => sum > target },
};

function allPairs(stream) {
const { pillars,target } = stream;
return pillars.flatMap(function (first,index) {
const mates = pillars.map((second,other) => other > index && first + second === target ? [index,other] :null);
return mates.filter(Boolean);
});
}
function isFound(state,pair) {
return state.found.some((item) => item[0] === pair[0] && item[1] === pair[1]);
}
function cloneState(state) {
return Object.assign({},state,{ found:state.found.map((pair) => pair.slice()) });
}
function createPincer(stream) {
return {
stream,l:0,r:PINCER_W1.n - 1,floor:PINCER_W1.floor,skip:0,charges:PINCER_W1.charges,steps:0,wrong:0,pairs:0,
found:[],score:0,status:'running',fail:'',plankShot:false,last:null,
};
}
function pincerSum(state) {
const { pillars } = state.stream;
return pillars[state.l] + pillars[state.r];
}
function pincerTotalPairs(stream) {
return allPairs(stream).length;
}
function pairsLeft(state) {
return allPairs(state.stream).filter((pair) => pair[0] >= state.l && pair[1] <= state.r && !isFound(state,pair));
}
function bruteChecks(count) {
return Math.max(0,(count * (count - 1)) / 2);
}
function pincerPar(stream) {
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
function pincerStars(state) {
if (state.status !== 'won') return 0;
if (state.wrong > 0) return 1;
return state.steps <= pincerPar(state.stream) ? MAX_STARS :MAX_STARS - 1;
}
function eaterNext(state) {
if (state.status !== 'running' || state.skip > 0) return NO_EATER;
return PINCER_W1.floor - state.floor;
}

function canLeft(state) {
return state.l + 1 < state.r;
}
function canRight(state) {
return state.r - 1 > state.l;
}
function canFire(state) {
return state.charges > 0;
}
function canPlank(state) {
const { plank } = state.stream;
return !state.plankShot && state.l < plank && plank < state.r && state.charges >= PLANK_MIN_CHARGES;
}
const LEGAL = { l:canLeft,r:canRight,fire:canFire,plank:canPlank };
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
function eat(state) {
if (state.skip > 0) state.skip -= 1;
else state.floor -= 1;
if (state.floor > 0) return;
state.status = 'failed';
state.fail = 'floor';
state.last = Object.assign({},state.last,{ kind:'floor',why:PINCER_TEXTS.toast.floor });
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
const { pillars } = state.stream;
const turn = Object.assign(baseTurn(state,move),{ side,index:state[side.field] });
return Object.assign(turn,{ a:pillars[state.l],b:pillars[state.r],v:pillars[turn.index],right:side.isRight(turn.sum,turn.t) });
}
function partnerOf(state,index) {
const pair = pairsLeft(state).find((item) => item.includes(index));
return pair ? pair.find((item) => item !== index) :NO_PARTNER;
}
function pointerWords(turn) {
const { sum,t,a,b,v } = turn;
return Object.assign({ sum,t,a,b,v },relation(sum,t));
}
function playSafe(turn) {
const { state,side } = turn;
state.wrong += 1;
state.last = noteOf(turn,side.safeKind,fillText(PINCER_TEXTS.toast[side.safeToast],pointerWords(turn)));
eat(state);
}
function playDrop(turn,partner) {
const { state,side } = turn;
const values = Object.assign(pointerWords(turn),{ partner:state.stream.pillars[partner] });
state.wrong += 1;
state.status = 'failed';
state.fail = 'drop';
state.last = Object.assign(noteOf(turn,'drop',fillText(PINCER_TEXTS.toast[side.dropToast],values)),{
index:turn.index,partnerIndex:partner,
});
}
function playPointer(state,move) {
const turn = pointerTurn(state,move);
const partner = turn.right ? NO_PARTNER :partnerOf(state,turn.index);
state.steps += 1;
state[turn.side.field] += turn.side.step;
if (partner !== NO_PARTNER) return playDrop(turn,partner);
if (!turn.right) return playSafe(turn);
state.last = noteOf(turn,turn.side.kind,'');
eat(state);
}

function win(state) {
state.status = 'won';
state.score += PINCER_W1.base + PINCER_W1.floorBonus * state.floor;
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
function playFire(state) {
const turn = baseTurn(state,'fire');
const fresh = turn.sum === turn.t && !isFound(state,[state.l,state.r]);
state.steps += 1;
state.charges -= 1;
return fresh ? fireHit(turn) :fireMiss(turn);
}
function playPlank(state) {
const turn = baseTurn(state,'plank');
const { plank } = state.stream;
const why = fillText(PINCER_TEXTS.toast.plank,{ v:state.stream.pillars[plank] });
state.steps += 1;
state.charges -= 1;
state.plankShot = true;
state.score += PINCER_W1.plankScore;
state.last = Object.assign(noteOf(turn,'plank',why),{ index:plank,points:PINCER_W1.plankScore });
eat(state);
state.skip += 1;
}
const PLAYS = { l:playPointer,r:playPointer,fire:playFire,plank:playPlank };

function applyPincer(state,moveId) {
if (!Object.hasOwn(PLAYS,moveId) || !pincerMoves(state).includes(moveId)) return state;
const draft = cloneState(state);
PLAYS[moveId](draft,moveId);
return draft;
}

export {
createPincer,applyPincer,pincerMoves,pincerSum,pincerTotalPairs,pincerPar,pincerStars,bruteChecks,eaterNext,
pairsLeft,
};

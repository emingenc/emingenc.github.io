import { applyPincer,createPincer,pincerMoves,pincerSum } from './pincer.js';
import { randomMoveBot } from './pool-util.js';


const DEFAULT_LIMIT = 100;

function wanted(state) {
const sum = pincerSum(state);
const { target } = state.stream;
if (sum === target) return 'fire';
return sum < target ? 'l' :'r';
}
function orFire(state,move) {
return pincerMoves(state).includes(move) ? move :'fire';
}
function playBot(stream,bot,limit = DEFAULT_LIMIT) {
let state = createPincer(stream);
for (let count = 0; count < limit && state.status === 'running'; count += 1) state = applyPincer(state,bot(state));
return state;
}
function lineFrom(start) {
let state = start;
const moves = [];
while (pincerMoves(state).includes(wanted(state))) {
moves.push(wanted(state));
state = applyPincer(state,wanted(state));
}
return moves;
}
function solvePincer(stream) {
return lineFrom(createPincer(stream));
}
function fireSpamBot(state) {
return 'fire';
}
function alwaysRightBot(state) {
return orFire(state,'r');
}
function wrongPointerBot(state) {
const opposite = { l:'r',r:'l' };
return orFire(state,opposite[wanted(state)]);
}
function randomBot(seed) {
return randomMoveBot(seed,pincerMoves);
}

export { solvePincer,lineFrom,wanted,orFire,fireSpamBot,alwaysRightBot,wrongPointerBot,randomBot,playBot };

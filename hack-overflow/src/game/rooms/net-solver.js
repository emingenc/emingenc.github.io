import { applyNet,netLine,netMoves,netPeek,netSum,netWouldTear } from './net.js';
import { prng } from './turret-stream.js';


const DEFAULT_LIMIT = 120;

function canDo(state,move) {
return netMoves(state).includes(move);
}
function orFirst(state,move) {
return canDo(state,move) ? move :netMoves(state)[0];
}
function playBot(start,bot,limit = DEFAULT_LIMIT) {
let state = start;
for (let count = 0; count < limit && state.status === 'running'; count += 1) state = applyNet(state,bot(state));
return state;
}
function solveNet(stream,wave) {
return netLine(stream,wave);
}
function extendSpamBot(state) {
return orFirst(state,'extend');
}
function shrinkSpamBot(state) {
return orFirst(state,'shrink');
}
function jumpTarget(state) {
return state.stream.items.lastIndexOf(netPeek(state),state.r - 1) + 1;
}
function rawJumpBot(state) {
return canDo(state,'jump') && jumpTarget(state) !== state.l ? 'jump' :orFirst(state,'extend');
}
function rebuildBot(state) {
const emptying = state.last !== null && state.last.move === 'shrink';
const breaking = netWouldTear(state) || netSum(state) > state.stream.k;
return state.l < state.r && (emptying || breaking) ? 'shrink' :orFirst(state,'extend');
}
function trimFirstBot(state) {
const overflows = netSum(state) + netPeek(state) > state.stream.k;
return state.l < state.r && overflows ? 'shrink' :orFirst(state,'extend');
}
function randomBot(seed) {
const next = prng(seed);
return function choose(state) {
const moves = netMoves(state);
return moves[Math.floor(next() * moves.length)];
};
}

export {
solveNet,playBot,extendSpamBot,extendSpamBot as neverShrinkBot,shrinkSpamBot,rawJumpBot,rebuildBot,
rebuildBot as restartBot,trimFirstBot,randomBot,
};

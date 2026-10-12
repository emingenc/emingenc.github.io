import { W1_SPEC } from './data/shield-waves.js';
import { answerFor,applyShield,createShield,glyphOf,isOpener,shieldMoves } from './shield.js';
import { randomMoveBot } from './pool-util.js';


const MOVE_LIMIT_FACTOR = 12;

function solveShield(wave,spec = W1_SPEC) {
let state = createShield(wave,{ spec });
const moves = [];
const limit = wave.length * spec.length * MOVE_LIMIT_FACTOR;
while (state.status === 'running' && moves.length < limit) {
const move = answerFor(state);
moves.push(move);
state = applyShield(state,move);
}
return moves;
}
function counterBot(state) {
const glyph = glyphOf(state);
const depth = state.stack.length;
if (isOpener(glyph)) return 'push';
if (glyph === '$') return depth === 0 ? 'clear' :'breach';
return depth > 0 ? 'pop' :'breach';
}
function towerHeight(state,index) {
return Number(state.wave[state.vi][index]);
}
function towerPair(state) {
const top = state.stack[state.stack.length - 1];
return { top:top === undefined ? null :towerHeight(state,top),incoming:towerHeight(state,state.gi) };
}
function nonStrictBot(state) {
const { top,incoming } = towerPair(state);
return top !== null && top <= incoming ? 'pop' :'push';
}
function onePopBot(state) {
const { top,incoming } = towerPair(state);
const popped = state.last !== null && state.last.kind === 'pop';
return top !== null && top < incoming && !popped ? 'pop' :'push';
}
function pushOnlyBot() {
return 'push';
}
function randomBot(seed) {
return randomMoveBot(seed,shieldMoves);
}

export { solveShield,counterBot,nonStrictBot,onePopBot,pushOnlyBot,randomBot };

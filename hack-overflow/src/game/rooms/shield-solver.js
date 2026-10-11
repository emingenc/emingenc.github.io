import { answerFor,applyShield,createShield,glyphOf,isOpener,shieldMoves } from './shield.js';
import { prng } from './turret-stream.js';


const MOVE_LIMIT_FACTOR = 12;

function solveShield(wave) {
let state = createShield(wave);
const moves = [];
const limit = wave.length * MOVE_LIMIT_FACTOR;
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
function pushOnlyBot() {
return 'push';
}
function randomBot(seed) {
const next = prng(seed);
return function pick(state) {
const moves = shieldMoves(state);
return moves[Math.floor(next() * moves.length)];
};
}

export { solveShield,counterBot,pushOnlyBot,randomBot };

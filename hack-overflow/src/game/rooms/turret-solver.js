import { applyTurret,createTurret,keyFor,turretMoves } from './turret.js';
import { prng } from './turret-stream.js';


const FIRST_BAY = 0;
const MOVE_LIMIT_FACTOR = 4;

function solveTurret(stream) {
let state = createTurret(stream);
const moves = [];
const limit = stream.length * MOVE_LIMIT_FACTOR;
while (state.status === 'running' && moves.length < limit) {
const move = 'probe:' + FIRST_BAY + ':' + keyFor(state,FIRST_BAY);
moves.push(move);
state = applyTurret(state,move);
}
return moves;
}
function tagOnlyBot(state) {
return 'tag:' + FIRST_BAY;
}
function randomBot(seed) {
const next = prng(seed);
return function pick(state) {
const moves = turretMoves(state);
return moves[Math.floor(next() * moves.length)];
};
}

export { solveTurret,tagOnlyBot,randomBot };

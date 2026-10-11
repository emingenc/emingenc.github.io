import { applyTurret,createTurret,keyFor,turretMoves } from './turret.js';
import { prng } from './turret-stream.js';


const FIRST_BAY = 0;
const MOVE_LIMIT_FACTOR = 4;
const STALE_TARGET = 10;
const STALE_MAX_SLOT = 9;

function solveTurret(stream,options = {}) {
let state = createTurret(stream,options);
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

function goldFirstBot(state) {
const gold = state.bay.findIndex((drone) => drone.gold && state.bay.some((other) => other.n < drone.n));
const index = gold < 0 ? FIRST_BAY :gold;
return 'probe:' + index + ':' + keyFor(state,index);
}
function staleTargetBot(state) {
const slot = Math.min(STALE_MAX_SLOT,Math.max(1,STALE_TARGET - state.bay[FIRST_BAY].v));
return 'probe:' + FIRST_BAY + ':' + slot;
}

export { solveTurret,tagOnlyBot,randomBot,goldFirstBot,staleTargetBot };

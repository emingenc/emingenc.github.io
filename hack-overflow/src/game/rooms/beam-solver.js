import { applyBeam,beamMoves,createBeam,middleOf } from './beam.js';
import { rotatedCall } from './beam-rotated.js';
import { prng } from './turret-stream.js';


const MOVE_LIMIT_FACTOR = 12;
const MOVE_CAP = 5000;
const SELECT = 'select:';

function selectThenFire(state,cell) {
return state.selected === cell ? 'fire' :SELECT + cell;
}
function keepBot(choose) {
return function bot(state) {
return state.pending ? 'keep:' + choose(state) :selectThenFire(state,middleOf(state));
};
}
const sortedHalfBot = keepBot((state) => rotatedCall(state,state.pending.cell).side);
const alwaysLeftBot = keepBot(() => 'left');
const alwaysRightBot = keepBot(() => 'right');
const naiveSortedBot = keepBot((state) => (state.stream.values[state.pending.cell] < state.stream.target ? 'right' :'left'));
function perfectBot(state) {
if (state.rotated) return sortedHalfBot(state);
if (state.bolt && state.shard) return 'bolt:shard';
if (state.bolt && state.ammo > 0 && state.mites.length > 0) return 'bolt:mite';
return selectThenFire(state,middleOf(state));
}
function solveBeam(wave,options = {}) {
let state = createBeam(wave,options);
const moves = [];
const limit = state.n * MOVE_LIMIT_FACTOR;
while (state.status === 'running' && moves.length < limit) {
const move = perfectBot(state);
moves.push(move);
state = applyBeam(state,move);
}
return moves;
}
function runBot(state,bot,cap = MOVE_CAP) {
let current = state;
for (let count = 0; count < cap && current.status === 'running'; count += 1) current = applyBeam(current,bot(current));
return current;
}
function linearBot(state) {
const cell = Math.max(state.lo,state.probes);
return selectThenFire(state,cell);
}
function loBot(state) {
return selectThenFire(state,state.lo);
}
function upperMiddleBot(state) {
return selectThenFire(state,Math.floor((state.lo + state.hi + 1) / 2));
}
function randomBot(seed) {
const next = prng(seed);
return function pick(state) {
const moves = beamMoves(state);
return moves[Math.floor(next() * moves.length)];
};
}

export { solveBeam,perfectBot,linearBot,loBot,upperMiddleBot,randomBot,alwaysLeftBot,alwaysRightBot,naiveSortedBot,runBot };

import { applyBeam,beamPar,beamStars,createBeam } from './beam.js';
import { alwaysLeftBot,alwaysRightBot,naiveSortedBot,runBot,solveBeam } from './beam-solver.js';
import { collectPool } from './pool-util.js';
import { BEAM_WAVES,HEARTS,W3_POOL } from './data/beam-wave.js';


const WAVE = 'w3';
const MAX_STARS = 3;
const CELLS = BEAM_WAVES.w3.n;
const WRONG_BOTS = [alwaysLeftBot,alwaysRightBot,naiveSortedBot];

function pick(next,count) {
return Math.floor(next() * count);
}
function isValue(value) {
return Number.isInteger(value) && value >= W3_POOL.minValue && value <= W3_POOL.maxValue;
}
function drops(values) {
return values.filter((value,index) => value > values[index + 1]).length;
}
function isShape(stream) {
const { values,target } = stream;
const distinct = Array.isArray(values) && new Set(values).size === CELLS && values.length === CELLS && values.every(isValue);
return stream.wave === WAVE && distinct && drops(values) === 1 && values.includes(target);
}
function playsClean(stream) {
const moves = solveBeam(WAVE,{ stream });
const state = moves.reduce((current,move) => applyBeam(current,move),createBeam(WAVE,{ stream }));
return state.status === 'won' && state.probes <= beamPar(WAVE) && state.hearts === HEARTS && beamStars(state) === MAX_STARS;
}
function w3StreamWhy(stream) {
if (!isShape(stream)) return 'shape';
if (!playsClean(stream)) return 'solver';
const wins = WRONG_BOTS.some((bot) => runBot(createBeam(WAVE,{ stream }),bot).status === 'won');
return wins ? 'trap' :'';
}

function distinctValues(next) {
const values = new Set();
while (values.size < CELLS) values.add(W3_POOL.minValue + pick(next,W3_POOL.maxValue - W3_POOL.minValue + 1));
return [...values].sort((first,second) => first - second);
}
function candidate(next) {
const sorted = distinctValues(next);
const turn = 1 + pick(next,CELLS - 1);
const values = sorted.slice(turn).concat(sorted.slice(0,turn));
return { wave:WAVE,values,target:values[pick(next,CELLS)] };
}
const idOf = (stream) => stream.values.join(',') + ':' + stream.target;
function buildW3Pool(seed = W3_POOL.seed,size = W3_POOL.size) {
return collectPool({ tag:'beam-' + WAVE,seed,size },{ candidate,why:w3StreamWhy,id:idOf });
}

export { buildW3Pool,w3StreamWhy };

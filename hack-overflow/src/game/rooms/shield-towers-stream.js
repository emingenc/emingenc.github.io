import { TOWERS,W3_SPEC } from './data/shield-waves.js';
import { collectPool } from './pool-util.js';
import { towersJudge } from './shield-towers.js';



const MIN_LEFTOVERS = 2;
const ROUND_TRIES = 20000;
const GENERATE_LIMIT = 4000;
const HEIGHTS = new RegExp('^[' + TOWERS.min + '-' + TOWERS.max + ']+$');
const HEIGHT_COUNT = TOWERS.max - TOWERS.min + 1;

function roundProblem(volley) {
if (volley.length !== W3_SPEC.length) return 'length';
if (!HEIGHTS.test(volley)) return 'heights ' + TOWERS.min + '-' + TOWERS.max;
const read = towersJudge(volley);
if (read.ties < 1) return 'no tie to hold';
if (read.multiPops < 1) return 'no double pop';
return read.leftovers >= MIN_LEFTOVERS ? '' :'no leftover pile';
}
function waveW3Why(wave) {
if (wave.length !== W3_SPEC.volleys) return 'round count';
const bad = wave.findIndex((volley) => roundProblem(volley) !== '');
if (bad >= 0) return roundProblem(wave[bad]) + ' at round ' + (bad + 1);
return new Set(wave).size === wave.length ? '' :'a round repeats';
}
function randomRound(next) {
return Array.from({ length:W3_SPEC.length },() => TOWERS.min + Math.floor(next() * HEIGHT_COUNT)).join('');
}
function validRound(next,taken) {
for (let tries = 0; tries < ROUND_TRIES; tries += 1) {
const volley = randomRound(next);
if (roundProblem(volley) === '' && !taken.includes(volley)) return volley;
}
return '';
}
function makeWave(next) {
const wave = [];
while (wave.length < W3_SPEC.volleys) wave.push(validRound(next,wave));
return wave;
}
function buildW3Pool(seed,size) {
const rules = { candidate:makeWave,why:waveW3Why,id:(wave) => wave.join(',') };
return collectPool({ tag:'shield-w3',seed,size,limit:GENERATE_LIMIT },rules);
}

export { buildW3Pool,waveW3Why };

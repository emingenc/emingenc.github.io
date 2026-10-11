import { OVERFLOW_SEED, W2_POOL, WAVES } from './data/turret-waves.js';
import { judgeTFor, lastDrone, prng, simStreamFor, targetAt } from './turret-stream.js';


const MIN_VALUE = 1;
const MAX_VALUE = 9;
const FIRST_DISTINCT = 3;
const MIN_DUPS = 3;
const MIN_PAIRS = 5;
const MIN_VARIETY = 6;
const MIN_EARLY_PAIRS = 2;
const MIN_TAG_WALKS = 3;
const GENERATE_LIMIT = 400000;
const PAIR_BIAS = 0.55;
const LOOKBACK = 4;
const DRONE_SEED_SPREAD = 104729;
const W2 = WAVES.w2;

function candidateTs(spec, drone) {
  if (spec.endless) return spec.cycle;
  if (drone < spec.dualFrom) return [targetAt(spec, drone)];
  const first = drone === spec.dualFrom ? drone + 1 : drone;
  return Array.from({ length: lastDrone(spec) - first + 1 }, (unused, index) => targetAt(spec, first + index));
}
function valueRange(spec, drone) {
  return rangeOver(candidateTs(spec, drone));
}
function rangeOver(targets) {
  return { low: Math.max(MIN_VALUE, Math.max(...targets) - MAX_VALUE), high: Math.min(MAX_VALUE, Math.min(...targets) - MIN_VALUE) };
}
function bayTs(spec, drone) {
  const own = targetAt(spec, drone);
  if (drone < spec.dualFrom) return [own];
  const younger = targetAt(spec, Math.min(drone + 1, lastDrone(spec)));
  return drone === spec.dualFrom ? [younger] : [own, younger];
}
function drawRange(spec, drone) {
  return spec.endless ? valueRange(spec, drone) : rangeOver(bayTs(spec, drone));
}
function rangeProblem(stream) {
  for (let index = 0; index < stream.length; index += 1) {
    const { low, high } = valueRange(W2, index + 1);
    if (stream[index] < low || stream[index] > high) return 'slot out of 1-9 at ' + (index + 1);
  }
  return '';
}
function playProblem(stream) {
  const played = simStreamFor(W2, stream);
  if (new Set(stream).size < MIN_VARIETY) return 'under 6 different values';
  if (played.dups < MIN_DUPS) return 'under 3 stacking duplicates';
  if (played.halves < 1) return 'no T/2 self-pair trap';
  if (!played.goldPaired) return 'the gold drone does not pair';
  if (played.cross < 1) return 'no pair crosses a T change';
  if (played.early < MIN_EARLY_PAIRS) return 'under 2 pairs before the rush';
  if (played.pairs < MIN_PAIRS) return 'under 5 pairs';
  return simStreamFor(W2, stream, true).walks < MIN_TAG_WALKS ? 'TAG spam would survive' : '';
}
function w2Why(stream) {
  if (stream.length !== W2.n) return 'length';
  const bad = rangeProblem(stream);
  if (bad) return bad;
  if (new Set(stream.slice(0, FIRST_DISTINCT)).size !== FIRST_DISTINCT) return 'drones 1-3 not distinct';
  return playProblem(stream);
}
function pickValue(spec, prior, next) {
  const number = prior.length + 1;
  const { low, high } = drawRange(spec, number);
  const target = judgeTFor(spec, number);
  const mates = prior.slice(-LOOKBACK).map((value) => target - value).filter((value) => value >= low && value <= high);
  if (mates.length > 0 && next() < PAIR_BIAS) return mates[Math.floor(next() * mates.length)];
  return low + Math.floor(next() * (high + 1 - low));
}
function candidate(next) {
  const stream = [];
  while (stream.length < W2.n) stream.push(pickValue(W2, stream, next));
  return stream;
}
const poolCache = new Map();
function buildW2Pool(seed = W2_POOL.seed, size = W2_POOL.size) {
  const key = seed + ':' + size;
  if (poolCache.has(key)) return poolCache.get(key);
  const next = prng(seed);
  const seen = new Set();
  const out = [];
  for (let tries = 0; out.length < size && tries < GENERATE_LIMIT; tries += 1) {
    const stream = candidate(next);
    const id = stream.join(',');
    if (!seen.has(id) && !w2Why(stream)) {
      seen.add(id);
      out.push(stream);
    }
  }
  poolCache.set(key, out);
  return out;
}


function overflowValue(spec, prior) {
  const next = prng(OVERFLOW_SEED + (prior.length + 1) * DRONE_SEED_SPREAD);
  return pickValue(spec, prior, next);
}
function overflowDrones(spec, prior, count) {
  const stream = prior.slice();
  for (let added = 0; added < count; added += 1) stream.push(overflowValue(spec, stream));
  return stream.slice(prior.length);
}

export { valueRange, w2Why, buildW2Pool, overflowDrones };

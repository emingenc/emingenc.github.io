import { W3_POOL, WAVES } from './data/turret-waves.js';
import { collectPool } from './pool-util.js';
import { ageTags, clearSlot, judgeEvict, lightSlot, litSlots, needsRoom, newModel, planAt, playOut, takePartner } from './turret-w3.js';


const MIN_VALUE = 1;
const MAX_VALUE = 9;
const MIN_FORCED = 3;
const MAX_FORCED = 4;
const MIN_PAIRS = 3;
const GENERATE_LIMIT = 400000;
const PAIR_BIAS = 0.55;
const LOOKBACK = 4;
const W3 = WAVES.w3;

function oldestPick(model) {
  return litSlots(model).reduce((best, slot) => (model.ttl[slot] < model.ttl[best] ? slot : best));
}
const NO_LINE = null;
function copyOf(model) {
  return { board: model.board.slice(), ttl: model.ttl.slice(), born: model.born.map((list) => list.slice()) };
}
function stateKey(model, index) {
  return index + ':' + model.board.join('') + ':' + model.ttl.join('');
}
function betterLine(first, second) {
  if (!first || !second) return first || second;
  if (first.pairs !== second.pairs) return first.pairs > second.pairs ? first : second;
  return first.evicts <= second.evicts ? first : second;
}
function resolveDrone(run, model, index) {
  const { stream } = run;
  const plan = planAt(stream, W3, index + 1);
  const drone = { n: index + 1, v: stream[index] };
  const need = plan.target - drone.v;
  if (model.board[need] === 0 && needsRoom(model, W3, drone.v)) return NO_LINE;
  const paired = model.board[need] > 0;
  if (paired) takePartner(model, need);
  ageTags(model);
  if (!paired) lightSlot(model, drone, W3.ttl);
  const rest = bestFrom(run, model, index + 1);
  return rest && { pairs: rest.pairs + (paired ? 1 : 0), evicts: rest.evicts };
}
function evictThen(run, model, index) {
  const drone = { n: index + 1, v: run.stream[index] };
  const plan = planAt(run.stream, W3, index + 1);
  const lines = litSlots(model).filter((slot) => !judgeEvict({ ...model, bay: [drone] }, plan, slot).thrown).map(function (slot) {
    const after = copyOf(model);
    clearSlot(after, slot);
    const rest = bestFrom(run, after, index);
    return rest && { pairs: rest.pairs, evicts: rest.evicts + 1 };
  });
  return lines.reduce(betterLine, NO_LINE);
}
function bestFrom(run, model, index) {
  if (index === run.stream.length) return { pairs: 0, evicts: 0 };
  const key = stateKey(model, index);
  if (!run.memo.has(key)) run.memo.set(key, betterLine(resolveDrone(run, copyOf(model), index), evictThen(run, model, index)));
  return run.memo.get(key);
}
function optimalLine(stream) {
  const best = bestFrom({ stream, memo: new Map() }, newModel(W3), 0);
  return { pairs: best.pairs, forced: best.evicts };
}
function problemOf(stream) {
  const perfect = playOut(stream);
  if (perfect.blind > 0) return 'an eviction with no safe tag';
  if (perfect.forced < MIN_FORCED) return 'under 3 forced evictions';
  if (perfect.forced > MAX_FORCED) return 'over 4 forced evictions';
  if (perfect.pairs < MIN_PAIRS) return 'under 3 pairs';
  if (playOut(stream, oldestPick).thrown < 1) return 'evicting the oldest tag never loses a pair';
  const best = optimalLine(stream);
  return perfect.pairs < best.pairs || perfect.forced > best.forced ? 'the perfect line is not optimal' : '';
}
function w3Why(stream) {
  if (stream.length !== W3.n) return 'length';
  if (stream.some((value) => !Number.isInteger(value) || value < MIN_VALUE || value > MAX_VALUE)) return 'slot out of 1-9';
  return problemOf(stream);
}
function pickValue(prior, next) {
  const target = W3.targets[0].t;
  const mates = prior.slice(-LOOKBACK).map((value) => target - value).filter((value) => value >= MIN_VALUE && value <= MAX_VALUE);
  if (mates.length > 0 && next() < PAIR_BIAS) return mates[Math.floor(next() * mates.length)];
  return MIN_VALUE + Math.floor(next() * (MAX_VALUE + 1 - MIN_VALUE));
}
function candidate(next) {
  const stream = [];
  while (stream.length < W3.n) stream.push(pickValue(stream, next));
  return stream;
}
function buildW3Pool(seed = W3_POOL.seed, size = W3_POOL.size) {
  const rules = { candidate, why: w3Why, id: (stream) => stream.join(',') };
  return collectPool({ tag: 'turret-w3', seed, size, limit: GENERATE_LIMIT }, rules);
}

export { oldestPick, optimalLine, w3Why, buildW3Pool };

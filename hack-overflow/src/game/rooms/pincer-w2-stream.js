import { PINCER_W1 } from './data/pincer-w1.js';
import { GOALS, W2_POOL } from './data/pincer-waves.js';
import { collectPool } from './pool-util.js';
import { MAX_PAR, MIN_PAR, meeting, pairsWhy, pick, distinctPillars } from './pincer-stream.js';
import { playBot } from './pincer-solver.js';
import { blindPinchBot } from './pincer-wave-solver.js';


const FIRST = 0;
const LAST = PINCER_W1.n - 1;
const WAVE = 'w2';

function isPillar(value) {
  return Number.isInteger(value) && value >= PINCER_W1.minValue && value <= PINCER_W1.maxValue;
}
function isInOrder(pillars) {
  return pillars.every((value, index) => index === FIRST || value > pillars[index - 1]);
}
function isShape(layout) {
  const { pillars } = layout;
  if (layout.wave !== WAVE || !Array.isArray(pillars) || pillars.length !== PINCER_W1.n) return false;
  return pillars.every(isPillar) && new Set(pillars).size === PINCER_W1.n && !isInOrder(pillars);
}
function lineWhy(layout) {
  const sorted = layout.pillars.slice().sort((first, second) => first - second);
  const { low, high } = meeting({ pillars: sorted, target: layout.target });
  if (low === FIRST || high === LAST) return 'one cannon';
  const par = low + (LAST - high) + 1;
  return par < MIN_PAR || par > MAX_PAR ? 'par' : '';
}
function blindWhy(layout) {
  const end = playBot(layout, blindPinchBot);
  return end.status === 'failed' && end.fail === 'drop' ? '' : 'blind';
}
function w2StreamWhy(layout) {
  if (!isShape(layout)) return 'shape';
  if (!GOALS.includes(layout.goal)) return 'goal';
  return pairsWhy(layout) || lineWhy(layout) || blindWhy(layout);
}

function shuffled(next, values) {
  const out = values.slice();
  for (let at = out.length - 1; at > 0; at -= 1) {
    const other = pick(next, at + 1);
    [out[at], out[other]] = [out[other], out[at]];
  }
  return out;
}
function candidatePillars(next) {
  return shuffled(next, distinctPillars(next));
}
function candidate(next, kept) {
  const pillars = candidatePillars(next);
  const first = pick(next, PINCER_W1.n);
  const second = (first + 1 + pick(next, PINCER_W1.n - 1)) % PINCER_W1.n;
  return { wave: WAVE, pillars, target: pillars[first] + pillars[second], goal: GOALS[kept % GOALS.length] };
}
const idOf = (layout) => layout.pillars.join(',') + '/' + layout.target;
function buildW2Pool(seed = W2_POOL.seed, size = W2_POOL.size) {
  return collectPool({ tag: WAVE, seed, size }, { candidate, why: w2StreamWhy, id: idOf });
}

export { buildW2Pool, w2StreamWhy };

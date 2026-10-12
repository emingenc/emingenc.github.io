import { PINCER_W1 } from './data/pincer-w1.js';
import { W3_POOL, WAVES } from './data/pincer-waves.js';
import { damBest, damPairs } from './pincer-dam.js';
import { collectPool } from './pool-util.js';
import { pick } from './pincer-stream.js';
import { playBot } from './pincer-solver.js';
import { tallerWallBot } from './pincer-wave-solver.js';


const WAVE = 'w3';
const MIN_HEIGHT = 1;
const LAST = PINCER_W1.n - 1;
const EARLIEST_FIND = 2;
const LATEST_FIND = 7;

function isHeight(value) {
  return Number.isInteger(value) && value >= MIN_HEIGHT && value <= WAVES.w3.maxValue;
}
function isShape(layout) {
  const { pillars } = layout;
  return layout.wave === WAVE && Array.isArray(pillars) && pillars.length === PINCER_W1.n && pillars.every(isHeight);
}
function ties(pillars, area) {
  return damPairs(pillars).filter((item) => item.area === area).length;
}
function findAt(best) {
  return best.l + (LAST - best.r);
}
function findWhy(best) {
  if (findAt(best) < EARLIEST_FIND) return 'early';
  return findAt(best) > LATEST_FIND ? 'late' : '';
}
function w3StreamWhy(layout) {
  if (!isShape(layout)) return 'shape';
  const best = damBest(layout.pillars);
  if (ties(layout.pillars, best.area) !== 1) return 'best';
  const find = findWhy(best);
  if (find) return find;
  return playBot(layout, tallerWallBot).status === 'failed' ? '' : 'trap';
}

function candidate(next) {
  const pillars = Array.from({ length: PINCER_W1.n }, () => MIN_HEIGHT + pick(next, WAVES.w3.maxValue));
  return { wave: WAVE, pillars };
}
const idOf = (layout) => layout.pillars.join(',');
function buildW3Pool(seed = W3_POOL.seed, size = W3_POOL.size) {
  return collectPool({ tag: WAVE, seed, size }, { candidate, why: w3StreamWhy, id: idOf });
}

export { buildW3Pool, w3StreamWhy };

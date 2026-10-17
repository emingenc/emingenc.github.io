import { MOST_WATER_ID, THIRD_WAVE } from '../game/quest/third-wave.js';
import { PINCER_TEXTS, fillText } from '../game/rooms/data/pincer-texts.js';
import { HINT_MOVES, SORT_STEPS } from '../game/rooms/data/pincer-waves.js';
import { pincerArea, pincerHint, pincerMoves, pincerPar, pincerSum } from '../game/rooms/pincer.js';
import { pillarsOf, specOf } from '../game/rooms/pincer-base.js';


const LOW_FLOOR_TILES = 3;
const PLANK_HINT_STEPS = 2;
const SAFE_KINDS = new Set(['left-wrong', 'right-wrong']);

const isDam = (state) => specOf(state).dam;
const isUnsorted = (state) => state.sorted === false;
const isEqual = (state) => pincerSum(state) === state.stream.target;
const lastKind = (state) => (state.last ? state.last.kind : '');

function uiPincerShorterSide(state, pillars) {
  const left = pillars[state.l] <= pillars[state.r];
  return { side: left ? 'left' : 'right', mover: left ? 'L' : 'R' };
}
function uiPincerValues(state) {
  const { target, plank } = state.stream;
  const pillars = pillarsOf(state);
  const short = Math.min(pillars[state.l], pillars[state.r]);
  return {
    sum: pincerSum(state), t: target, floor: state.floor, v: pillars[plank], a: pillars[state.l], b: pillars[state.r],
    area: isDam(state) ? pincerArea(state) : 0, bank: state.bank, short, par: pincerPar(state.stream), ...uiPincerShorterSide(state, pillars),
  };
}
const isW2Fading = (state) => specOf(state).sort && state.sorted === true && state.steps - SORT_STEPS >= HINT_MOVES;
const SUM_LINES = [
  { when: (state) => SAFE_KINDS.has(lastKind(state)) && !isUnsorted(state), key: 'dropHint' },
  { when: isEqual, key: 'equal' },
  { when: isUnsorted, key: 'start2' },
  { when: (state) => pincerHint(state) === 'l', key: 'hintLow' },
  { when: (state) => pincerHint(state) === 'r', key: 'hintHigh' },
  { when: (state) => state.steps === 0, key: 'start' },
  { when: (state) => state.floor <= LOW_FLOOR_TILES, key: 'floorLow' },
  { when: isW2Fading, key: 'state2' },
  { when: (state) => state.steps === PLANK_HINT_STEPS && pincerMoves(state).includes('plank'), key: 'plank' },
  { when: (state) => pincerSum(state) < state.stream.target, key: 'low' },
  { when: () => true, key: 'high' },
];
const isHinting = (state) => state.steps < HINT_MOVES;
const DAM_LINES = [
  { when: (state) => state.l === state.r, key: 'fire3' },
  { when: (state, arena) => state.bank === 0 && state.steps <= (arena.counting === true ? 1 : 0), key: 'start3' },
  { when: (state) => !isHinting(state), key: 'state3' },
  { when: (state) => pincerMoves(state).includes('bank'), key: 'bank3' },
  { when: (state) => pillarsOf(state)[state.l] === pillarsOf(state)[state.r], key: 'tie3' },
  { when: () => true, key: 'move3' },
];
function uiPincerCoachText(arena) {
  const state = arena.state;
  if (state.status !== 'running') return '';
  if (arena.ask && state.bank === 0) return THIRD_WAVE[MOST_WATER_ID].ask;
  const line = (isDam(state) ? DAM_LINES : SUM_LINES).find((item) => item.when(state, arena));
  return fillText(PINCER_TEXTS.coach[line.key], uiPincerValues(state));
}
function uiPincerSpoken(arena) {
  const values = uiPincerValues(arena.state);
  if (isDam(arena.state)) return 'Area ' + values.area + ', bank ' + values.bank + '.';
  return 'Sum ' + values.sum + ', target ' + values.t + '.';
}

export { uiPincerCoachText, uiPincerSpoken };

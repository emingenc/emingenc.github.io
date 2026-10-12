import { PINCER_TEXTS } from './data/pincer-texts.js';
import { LOOKUP_STEPS, SORT_STEPS, TABLE_SLOTS } from './data/pincer-waves.js';
import { eat, noteOf, pairsOf, pillarsOf, specOf, win } from './pincer-base.js';


const NO_PAIR = -1;

function canSort(state) {
  return specOf(state).sort && state.sorted === false;
}
function canLookup(state) {
  return specOf(state).lookup && state.sorted === false;
}
const numeric = (first, second) => first - second;
function playSort(state) {
  const spec = specOf(state);
  state.pillars = pillarsOf(state).slice().sort(numeric);
  state.sorted = true;
  state.l = 0;
  state.r = spec.n - 1;
  state.found = [];
  state.steps += SORT_STEPS;
  state.last = noteOf(state, 'sort', { kind: 'sort', why: PINCER_TEXTS.toast.sorted });
  eat(state);
}
function playLookup(state) {
  const [first, second] = pairsOf(pillarsOf(state), state.stream.target)[0] || [NO_PAIR, NO_PAIR];
  const heavy = state.stream.goal === 'memory';
  Object.assign(state, { l: first, r: second, memory: TABLE_SLOTS, found: [[first, second]], pairs: 1 });
  state.steps += LOOKUP_STEPS;
  state.wrong += heavy ? 1 : 0;
  const why = heavy ? PINCER_TEXTS.toast.lookupHeavy : '';
  state.last = Object.assign(noteOf(state, 'lookup', { kind: heavy ? 'lookup-heavy' : 'lookup', why }), { pair: [first, second] });
  win(state);
}

export { canSort, canLookup, playSort, playLookup };

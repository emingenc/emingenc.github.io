import { PINCER_TEXTS } from './data/pincer-texts.js';
import { SORT_STEPS } from './data/pincer-waves.js';
import { eat, noteOf, pillarsOf, specOf } from './pincer-base.js';


function canSort(state) {
  return specOf(state).sort && state.sorted === false;
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

export { canSort, playSort };

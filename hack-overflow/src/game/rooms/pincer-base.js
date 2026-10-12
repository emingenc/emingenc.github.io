import { PINCER_TEXTS } from './data/pincer-texts.js';
import { WAVES } from './data/pincer-waves.js';


const FIRST_WAVE = 'w1';

function specOf(source) {
  const layout = source.stream || source;
  return Object.hasOwn(WAVES, layout.wave) ? WAVES[layout.wave] : WAVES[FIRST_WAVE];
}
function pillarsOf(state) {
  return state.pillars || state.stream.pillars;
}
function sumOf(state) {
  const pillars = pillarsOf(state);
  return pillars[state.l] + pillars[state.r];
}
function pairsOf(pillars, target) {
  return pillars.flatMap(function (first, index) {
    const mates = pillars.map((second, other) => (other > index && first + second === target ? [index, other] : null));
    return mates.filter(Boolean);
  });
}
function noteOf(state, move, outcome) {
  return { kind: outcome.kind, move, sum: sumOf(state), t: state.stream.target, why: outcome.why };
}
function eat(state) {
  if (state.skip > 0) state.skip -= 1;
  else state.floor -= 1;
  if (state.floor > 0) return;
  state.status = 'failed';
  state.fail = 'floor';
  state.last = Object.assign({}, state.last, { kind: 'floor', why: PINCER_TEXTS.toast.floor });
}
function win(state) {
  const spec = specOf(state);
  state.status = 'won';
  state.score += spec.base + spec.floorBonus * state.floor;
}
function lose(state, fail) {
  state.status = 'failed';
  state.fail = fail;
}

export { specOf, pillarsOf, sumOf, pairsOf, noteOf, eat, win, lose };

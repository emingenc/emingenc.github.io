import { PINCER_TEXTS, fillText } from './data/pincer-texts.js';
import { specOf } from './pincer-base.js';
import { canStep, currentArea } from './pincer-dam.js';


function bankWhy(state) {
  if (!specOf(state).dam) return '';
  return fillText(PINCER_TEXTS.refuse.bank, { area: currentArea(state), bank: state.bank });
}
function sortedWhy(state, move) {
  if (!specOf(state).sort || state.sorted !== true) return '';
  return fillText(PINCER_TEXTS.refuse.sorted, { verb: move.toUpperCase() });
}
function fireWhy(state) {
  if (!specOf(state).dam || !canStep(state)) return '';
  return fillText(PINCER_TEXTS.refuse.fire, { left: state.r - state.l });
}
const REASONS = { bank: bankWhy, sort: sortedWhy, lookup: sortedWhy, fire: fireWhy };

function pincerWhyNot(state, move) {
  if (state.status !== 'running' || !Object.hasOwn(REASONS, move)) return '';
  return REASONS[move](state, move);
}

export { pincerWhyNot };

import { PINCER_TEXTS, fillText } from './data/pincer-texts.js';
import { eat, lose, noteOf, pillarsOf, win } from './pincer-base.js';


const FIRST_PLACE = 1;
const NO_AREA = 0;
const SIDES = {
  l: { field: 'l', other: 'r', step: 1, kind: 'left', safeKind: 'left-wrong' },
  r: { field: 'r', other: 'l', step: -1, kind: 'right', safeKind: 'right-wrong' },
};

function damArea(pillars, left, right) {
  return Math.min(pillars[left], pillars[right]) * (right - left);
}
function areas(pillars, left, right) {
  const found = [];
  for (let first = left; first <= right; first += 1) {
    for (let second = first + 1; second <= right; second += 1) found.push({ area: damArea(pillars, first, second), l: first, r: second });
  }
  return found;
}
function damPairs(pillars) {
  return areas(pillars, 0, pillars.length - 1);
}
function damBest(pillars, left = 0, right = pillars.length - 1) {
  const none = { area: NO_AREA, l: left, r: left };
  return areas(pillars, left, right).reduce((best, item) => (item.area > best.area ? item : best), none);
}
function currentArea(state) {
  return damArea(pillarsOf(state), state.l, state.r);
}
function potential(state) {
  return Math.max(state.bank, damBest(pillarsOf(state), state.l, state.r).area);
}
function canBank(state) {
  return currentArea(state) > state.bank;
}
function canStep(state) {
  return state.l < state.r;
}

function wallWords(state, side) {
  const pillars = pillarsOf(state);
  const moved = pillars[state[side.field]];
  const kept = pillars[state[side.other]];
  return { tall: Math.max(moved, kept), short: Math.min(moved, kept), moved, kept };
}
function lostWords(state, best) {
  return { area: currentArea(state), a: state.l + FIRST_PLACE, b: state.r + FIRST_PLACE, best };
}
function failMove(state, why) {
  state.wrong += 1;
  lose(state, 'drop');
  state.last = Object.assign(state.last, { kind: 'drop', why });
}
function playDamPointer(state, move) {
  const side = SIDES[move];
  const before = potential(state);
  const words = Object.assign(wallWords(state, side), lostWords(state, before));
  const right = words.moved <= words.kept;
  state.steps += 1;
  state[side.field] += side.step;
  const lost = potential(state) < before;
  state.last = noteOf(state, move, { kind: right ? side.kind : side.safeKind, why: '' });
  if (right && !lost) return eat(state);
  if (right) return failMove(state, fillText(PINCER_TEXTS.toast.damUnbanked, words));
  const taller = fillText(PINCER_TEXTS.toast.damTaller, words);
  if (lost) return failMove(state, taller + fillText(PINCER_TEXTS.toast.damDrop, words));
  state.wrong += 1;
  state.last.why = taller + PINCER_TEXTS.toast.damSafe;
  return eat(state);
}
function playBank(state) {
  state.bank = currentArea(state);
  state.bankAt = [state.l, state.r];
  state.last = noteOf(state, 'bank', { kind: 'bank', why: '' });
}
function playDamFire(state) {
  const best = damBest(pillarsOf(state));
  state.charges -= 1;
  if (state.bank >= best.area) {
    state.found = [state.bankAt.slice()];
    state.pairs = 1;
    state.last = Object.assign(noteOf(state, 'fire', { kind: 'pair', why: '' }), { pair: state.bankAt.slice() });
    return win(state);
  }
  const words = { bank: state.bank, best: best.area, a: best.l + FIRST_PLACE, b: best.r + FIRST_PLACE };
  lose(state, 'best');
  state.wrong += 1;
  state.last = noteOf(state, 'fire', { kind: 'best', why: fillText(PINCER_TEXTS.toast.damMiss, words) });
}

export { damArea, damBest, damPairs, currentArea, canBank, canStep, playDamPointer, playBank, playDamFire };

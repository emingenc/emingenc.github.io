import { PINCER_TEXTS, fillText } from '../game/rooms/data/pincer-texts.js';
import { bruteChecks, pincerPar } from '../game/rooms/pincer.js';
import { specOf } from '../game/rooms/pincer-base.js';
import { uiArenaCard, uiArenaPaidLine } from './arena-shell.js';
import { uiEl } from './dom.js';
import { uiPincerCardTitle, uiPincerOtherModes } from './pincer-modes.js';


const MAX_STARS = 3;
const STAR_ON = '★';
const STAR_OFF = '☆';
const SWITCH_ACTIONS = { w1: 'pincer-wave1', w2: 'pincer-wave2', w3: 'pincer-wave3' };
const MODE_LABELS = { w1: PINCER_TEXTS.card.wave1, w2: PINCER_TEXTS.card.wave2, w3: PINCER_TEXTS.card.wave3 };
const WAVE_WORDS = {
  w1: { used: 'used', stars: 'stars', why: 'why' },
  w2: { used: 'used2', stars: 'stars', why: 'why2' },
  w3: { used: 'used3', stars: 'stars3', why: 'why3' },
};
const FAIL_RULES = { drop: PINCER_TEXTS.card.failDrop, floor: PINCER_TEXTS.card.failFloor, charges: PINCER_TEXTS.card.failCharges, best: PINCER_TEXTS.card.failBest };
const FAILS_WITH_WHY = new Set(['drop', 'floor', 'best']);

function uiPincerActions(app, mode) {
  const others = uiPincerOtherModes(app, mode).map((id) => ({ action: SWITCH_ACTIONS[id], label: MODE_LABELS[id] }));
  return [{ action: 'pincer-replay', label: 'REPLAY' }, ...others, { action: 'rig-back', label: 'LEAVE' }];
}
function uiPincerStar(index, stars) {
  const on = index < stars;
  return uiEl('span', { className: 'pincer-star' + (on ? ' is-on' : ''), text: on ? STAR_ON : STAR_OFF });
}
function uiPincerStars(stars) {
  const cells = Array.from({ length: MAX_STARS }, (unused, index) => uiPincerStar(index, stars));
  return uiEl('p', { className: 'pincer-stars', children: cells, attrs: { role: 'img', 'aria-label': stars + ' of ' + MAX_STARS + ' stars' } });
}
function uiPincerScore(state) {
  return uiEl('p', { className: 'pincer-final-score', text: 'SCORE ' + state.score });
}
function uiPincerLine(className, text) {
  return uiEl('p', { className: 'arena-card-line ' + className, text });
}
function uiPincerValues(state) {
  return { steps: state.steps, checks: bruteChecks(state.stream.pillars.length), par: pincerPar(state.stream) };
}
function uiPincerBestLine(result) {
  const text = result.scoreImproved ? PINCER_TEXTS.card.newBest : PINCER_TEXTS.card.best;
  return result.best && result.best.score > 0 ? [uiPincerLine('pincer-best', fillText(text, { score: result.best.score }))] : [];
}
function uiPincerHow(state, words) {
  const values = uiPincerValues(state);
  const summary = uiEl('summary', { className: 'pincer-how-summary', text: PINCER_TEXTS.card.how });
  const lines = [
    uiPincerLine('pincer-rule', fillText(PINCER_TEXTS.card[words.stars], values)),
    uiPincerLine('pincer-why', fillText(PINCER_TEXTS.card[words.why], values)),
  ];
  return uiEl('details', { className: 'pincer-how', children: [summary, ...lines] });
}
function uiPincerWinBody(state, result) {
  const words = WAVE_WORDS[result.mode];
  const used = fillText(PINCER_TEXTS.card[words.used], uiPincerValues(state));
  const head = [uiPincerStars(result.stars), uiPincerScore(state), ...uiPincerBestLine(result), uiPincerLine('pincer-used', used)];
  return [...head, uiArenaPaidLine(result.rank, 'pincer-paid'), uiPincerHow(state, words)].filter(Boolean);
}
function uiPincerFailRule(state, result) {
  if (result.fail === 'drop' && specOf(state).dam) return PINCER_TEXTS.card.failDamDrop;
  return FAIL_RULES[result.fail] || '';
}
function uiPincerFailLines(state, result) {
  const why = FAILS_WITH_WHY.has(result.fail) ? result.why : '';
  return [why, uiPincerFailRule(state, result)].filter(Boolean);
}
function uiPincerWinLines(state, result) {
  if (state.last.kind === 'lookup-heavy') return [state.last.why];
  if (result.mode === 'w2') return result.firstWin ? [PINCER_TEXTS.card.unlock3] : [];
  return result.mode === 'w1' ? [PINCER_TEXTS.card.next] : [];
}
function uiPincerCard(app, result) {
  const state = app.rig.arena.state;
  const actions = uiPincerActions(app, result.mode);
  if (!result.won) {
    return uiArenaCard(app, { title: PINCER_TEXTS.card.failTitle, tone: 'fail', lines: uiPincerFailLines(state, result), body: [uiPincerScore(state)], actions });
  }
  return uiArenaCard(app, { title: uiPincerCardTitle(result.mode), lines: uiPincerWinLines(state, result), body: uiPincerWinBody(state, result), actions });
}

export { uiPincerCard };

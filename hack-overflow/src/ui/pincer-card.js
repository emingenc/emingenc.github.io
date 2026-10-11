import { PINCER_TEXTS, fillText } from '../game/rooms/data/pincer-texts.js';
import { bruteChecks } from '../game/rooms/pincer.js';
import { uiArenaCard } from './arena-shell.js';
import { uiEl } from './dom.js';


const MAX_STARS = 3;
const STAR_ON = '★';
const STAR_OFF = '☆';
const CARD_ACTIONS = [{ action: 'pincer-replay', label: 'REPLAY' }, { action: 'rig-back', label: 'LEAVE' }];
const FAIL_RULES = { drop: PINCER_TEXTS.card.failDrop, floor: PINCER_TEXTS.card.failFloor, charges: PINCER_TEXTS.card.failCharges };
const FAILS_WITH_WHY = new Set(['drop', 'floor']);

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
function uiPincerUsed(state) {
  return fillText(PINCER_TEXTS.card.used, { steps: state.steps, checks: bruteChecks(state.stream.pillars.length) });
}
function uiPincerHow() {
  const summary = uiEl('summary', { className: 'pincer-how-summary', text: PINCER_TEXTS.card.how });
  const lines = [uiPincerLine('pincer-rule', PINCER_TEXTS.card.stars), uiPincerLine('pincer-why', PINCER_TEXTS.card.why)];
  return uiEl('details', { className: 'pincer-how', children: [summary, ...lines] });
}
function uiPincerWinBody(state, result) {
  return [uiPincerStars(result.stars), uiPincerScore(state), uiPincerLine('pincer-used', uiPincerUsed(state)), uiPincerHow()];
}
function uiPincerFailLines(result) {
  const why = FAILS_WITH_WHY.has(result.fail) ? result.why : '';
  return [why, FAIL_RULES[result.fail] || ''].filter(Boolean);
}
function uiPincerCard(app, result) {
  const state = app.rig.arena.state;
  if (!result.won) {
    return uiArenaCard(app, { title: PINCER_TEXTS.card.failTitle, tone: 'fail', lines: uiPincerFailLines(result), body: [uiPincerScore(state)], actions: CARD_ACTIONS });
  }
  return uiArenaCard(app, { title: PINCER_TEXTS.card.title, lines: [PINCER_TEXTS.card.next], body: uiPincerWinBody(state, result), actions: CARD_ACTIONS });
}

export { uiPincerCard };

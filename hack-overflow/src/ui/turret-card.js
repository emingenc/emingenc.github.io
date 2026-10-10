import { TURRET_TEXTS, fillText } from '../game/rooms/data/turret-texts.js';
import { bruteCompares } from '../game/rooms/turret.js';
import { uiArenaCard } from './arena-shell.js';
import { uiEl } from './dom.js';


const MAX_STARS = 3;
const STAR_ON = '★';
const STAR_OFF = '☆';
const PERCENT = 100;
const MIN_BAR_PERCENT = 6;
const FIELD_DOWN = 'The SENTRY FIELD is down. The hash sector is open.';
const CARD_ACTIONS = [{ action: 'turret-replay', label: 'REPLAY' }, { action: 'rig-back', label: 'LEAVE' }];

function uiTurretStar(index, stars) {
  const on = index < stars;
  return uiEl('span', { className: 'turret-star' + (on ? ' is-on' : ''), text: on ? STAR_ON : STAR_OFF });
}
function uiTurretStars(stars) {
  const cells = Array.from({ length: MAX_STARS }, (unused, index) => uiTurretStar(index, stars));
  return uiEl('p', { className: 'turret-stars', children: cells, attrs: { role: 'img', 'aria-label': stars + ' of ' + MAX_STARS + ' stars' } });
}
function uiTurretBarRow(kind, label, share) {
  const fill = uiEl('div', { className: 'turret-vs-fill turret-vs-' + kind });
  if (fill.style && typeof fill.style.setProperty === 'function') fill.style.setProperty('--vs', share + '%');
  const track = uiEl('div', { className: 'turret-vs-track', children: [fill] });
  return uiEl('div', { className: 'turret-vs-row', children: [uiEl('span', { className: 'turret-vs-label', text: label }), track] });
}
function uiTurretVersus(state) {
  const brute = bruteCompares(state.stream.length);
  const ratio = brute > 0 ? state.steps / brute : 1;
  const you = Math.min(PERCENT, Math.max(MIN_BAR_PERCENT, Math.round(ratio * PERCENT)));
  const rows = [uiTurretBarRow('you', 'YOU ' + state.steps, you), uiTurretBarRow('brute', 'BRUTE ' + brute, PERCENT)];
  return uiEl('div', { className: 'turret-vs', children: rows, attrs: { 'aria-hidden': 'true' } });
}
function uiTurretScore(state) {
  return uiEl('p', { className: 'turret-final-score', text: 'SCORE ' + state.score });
}
function uiTurretLine(className, text) {
  return uiEl('p', { className: 'arena-card-line ' + className, text });
}
function uiTurretLessons(state) {
  const count = state.stream.length;
  const compares = bruteCompares(count);
  const values = { steps: state.steps, n: count, last: count - 1, compares };
  return [fillText(TURRET_TEXTS.card.used, values), TURRET_TEXTS.card.stars, fillText(TURRET_TEXTS.card.why, values)];
}
function uiTurretRewards(result) {
  const rank = uiEl('p', { className: 'turret-rank', text: 'RANK +' + result.rankGain });
  const reason = result.rankGain === 0 ? [uiTurretLine('turret-no-rank', TURRET_TEXTS.card.noRank)] : [];
  const lookup = result.lookupNew ? [uiEl('p', { className: 'turret-lookup', text: TURRET_TEXTS.card.lookup })] : [];
  return [rank, ...reason, ...lookup];
}
function uiTurretHow(rule, why) {
  const summary = uiEl('summary', { className: 'turret-how-summary', text: TURRET_TEXTS.card.how });
  return uiEl('details', { className: 'turret-how', children: [summary, uiTurretLine('turret-rule', rule), uiTurretLine('turret-why', why)] });
}
function uiTurretWinBody(state, result) {
  const [used, rule, why] = uiTurretLessons(state);
  const head = [uiTurretStars(result.stars), uiTurretScore(state), uiTurretLine('turret-used', used), uiTurretVersus(state)];
  return [...head, ...uiTurretRewards(result), uiTurretHow(rule, why)];
}
function uiTurretCard(app, result) {
  const state = app.rig.arena.state;
  if (!result.won) {
    const lines = [result.why || '', 'Every drone needs one look-up: slot T - v.'].filter(Boolean);
    return uiArenaCard(app, { title: TURRET_TEXTS.card.failTitle, tone: 'fail', lines, body: [uiTurretScore(state)], actions: CARD_ACTIONS });
  }
  const lines = result.lookupNew ? [FIELD_DOWN, TURRET_TEXTS.card.next] : [TURRET_TEXTS.card.next];
  return uiArenaCard(app, { title: TURRET_TEXTS.card.title, lines, body: uiTurretWinBody(state, result), actions: CARD_ACTIONS });
}

export { uiTurretCard };

import { TURRET_TEXTS, fillText } from '../game/rooms/data/turret-texts.js';
import { bruteCompares } from '../game/rooms/turret.js';
import { uiArenaCard, uiArenaPaidLine } from './arena-shell.js';
import { uiEl } from './dom.js';
import { uiTurretOtherModes } from './turret-modes.js';


const MAX_STARS = 3;
const STAR_ON = '★';
const STAR_OFF = '☆';
const PERCENT = 100;
const MIN_BAR_PERCENT = 6;
const FIELD_DOWN = 'The SENTRY FIELD is down. The hash sector is open.';
const SWITCH_ACTIONS = { w1: 'turret-wave1', w2: 'turret-wave2', overflow: 'turret-overflow' };
const MODE_LABELS = { w1: TURRET_TEXTS.card.wave1, w2: TURRET_TEXTS.card.wave2, overflow: TURRET_TEXTS.card.overflow };

function uiTurretActions(app, mode) {
  const others = uiTurretOtherModes(app, mode).map((id) => ({ action: SWITCH_ACTIONS[id], label: MODE_LABELS[id] }));
  return [{ action: 'turret-replay', label: 'REPLAY' }, ...others, { action: 'rig-back', label: 'LEAVE' }];
}

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
function uiTurretDrones(state) {
  return state.spec.endless ? state.resolved : state.stream.length;
}
function uiTurretVersus(state) {
  const brute = bruteCompares(uiTurretDrones(state));
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
  const count = uiTurretDrones(state);
  const compares = bruteCompares(count);
  const values = { steps: state.steps, n: count, last: count - 1, compares, drones: count };
  const used = state.spec.endless ? TURRET_TEXTS.card.overflowUsed : TURRET_TEXTS.card.used;
  return [fillText(used, values), TURRET_TEXTS.card.stars, fillText(TURRET_TEXTS.card.why, values)];
}
function uiTurretBestLine(result) {
  const text = result.scoreImproved ? TURRET_TEXTS.card.newBest : TURRET_TEXTS.card.best;
  return result.best && result.best.score > 0 ? [uiTurretLine('turret-best', fillText(text, { score: result.best.score }))] : [];
}
function uiTurretBilledLine(state) {
  return state.billed ? [uiTurretLine('turret-billed', fillText(TURRET_TEXTS.card.billed, state.billed))] : [];
}
function uiTurretHow(rule, why) {
  const summary = uiEl('summary', { className: 'turret-how-summary', text: TURRET_TEXTS.card.how });
  return uiEl('details', { className: 'turret-how', children: [summary, uiTurretLine('turret-rule', rule), uiTurretLine('turret-why', why)] });
}
function uiTurretWinBody(state, result) {
  const [used, rule, why] = uiTurretLessons(state);
  const head = [uiTurretStars(result.stars), uiTurretScore(state), ...uiTurretBestLine(result), uiTurretLine('turret-used', used), uiTurretVersus(state)];
  return [...head, ...uiTurretBilledLine(state), uiArenaPaidLine(result.rank, 'turret-paid'), uiTurretHow(rule, why)].filter(Boolean);
}
function uiTurretOverflowBody(state, result) {
  const [used, rule, why] = uiTurretLessons(state);
  const head = [uiTurretScore(state), ...uiTurretBestLine(result), uiTurretLine('turret-used', used), uiTurretVersus(state)];
  return [...head, ...uiTurretBilledLine(state), uiTurretHow(rule, why)];
}
function uiTurretLossCard(app, result) {
  const state = app.rig.arena.state;
  const lines = [result.why || '', 'Every drone needs one look-up: slot T - v.'].filter(Boolean);
  const actions = uiTurretActions(app, result.mode);
  return uiArenaCard(app, { title: TURRET_TEXTS.card.failTitle, tone: 'fail', lines, body: [uiTurretScore(state)], actions });
}
function uiTurretCard(app, result) {
  const state = app.rig.arena.state;
  const actions = uiTurretActions(app, result.mode);
  if (result.mode === 'overflow') {
    return uiArenaCard(app, { title: TURRET_TEXTS.card.overflowTitle, lines: [], body: uiTurretOverflowBody(state, result), actions });
  }
  if (!result.won) return uiTurretLossCard(app, result);
  const lines = result.firstClear ? [FIELD_DOWN, TURRET_TEXTS.card.next] : [TURRET_TEXTS.card.next];
  const title = result.mode === 'w2' ? TURRET_TEXTS.card.title2 : TURRET_TEXTS.card.title;
  return uiArenaCard(app, { title, lines: result.mode === 'w2' ? [] : lines, body: uiTurretWinBody(state, result), actions });
}

export { uiTurretCard };

import { TURRET_TEXTS, fillText } from '../game/rooms/data/turret-texts.js';
import { bruteCompares, parOf } from '../game/rooms/turret.js';
import { uiArenaCard, uiArenaPaidLine } from './arena-shell.js';
import { uiEl } from './dom.js';
import { uiRoomBars, uiRoomLine, uiRoomStars } from './room-card.js';
import { uiTurretOtherModes } from './turret-modes.js';
import { AGAIN, uiRaceCardLines, uiRaceStamp } from './turret-race.js';


const FIELD_DOWN = 'The SENTRY FIELD is down. The hash sector is open.';
const SWITCH_ACTIONS = { w1: 'turret-wave1', w2: 'turret-wave2', w3: 'turret-wave3', overflow: 'turret-overflow' };
const MODE_LABELS = {
  w1: TURRET_TEXTS.card.wave1, w2: TURRET_TEXTS.card.wave2, w3: TURRET_TEXTS.card.wave3, overflow: TURRET_TEXTS.card.overflow,
};
const WIN_TITLES = { w1: TURRET_TEXTS.card.title, w2: TURRET_TEXTS.card.title2, w3: TURRET_TEXTS.card.title3 };

function uiTurretActions(app, mode) {
  const race = app.rig.arena.race;
  const others = uiTurretOtherModes(app, mode).map((id) => ({ action: SWITCH_ACTIONS[id], label: MODE_LABELS[id] }));
  return [{ action: 'turret-replay', label: race ? AGAIN : 'REPLAY' }, ...others, { action: 'rig-back', label: 'LEAVE' }];
}

function uiTurretDrones(state) {
  return state.spec.endless ? state.resolved : state.stream.length;
}
function uiTurretVersus(state) {
  return uiRoomBars({ steps: state.steps, brute: bruteCompares(uiTurretDrones(state)) });
}
function uiTurretScore(state) {
  return uiEl('p', { className: 'turret-final-score', text: 'SCORE ' + state.score });
}
function uiTurretBoundedLessons(state) {
  const values = { steps: state.steps, n: state.stream.length, evicts: state.evictions, par: parOf(state) };
  return [fillText(TURRET_TEXTS.card.used3, values), TURRET_TEXTS.card.stars3, TURRET_TEXTS.card.why3];
}
function uiTurretLessons(state) {
  if (state.spec.cap > 0) return uiTurretBoundedLessons(state);
  const count = uiTurretDrones(state);
  const compares = bruteCompares(count);
  const values = { steps: state.steps, n: count, last: count - 1, compares, drones: count };
  const used = state.spec.endless ? TURRET_TEXTS.card.overflowUsed : TURRET_TEXTS.card.used;
  return [fillText(used, values), TURRET_TEXTS.card.stars, fillText(TURRET_TEXTS.card.why, values)];
}
function uiTurretBestLine(result) {
  const text = result.scoreImproved ? TURRET_TEXTS.card.newBest : TURRET_TEXTS.card.best;
  return result.best && result.best.score > 0 ? [uiRoomLine('turret-best', fillText(text, { score: result.best.score }))] : [];
}
function uiTurretBilledLine(state) {
  return state.billed ? [uiRoomLine('turret-billed', fillText(TURRET_TEXTS.card.billed, state.billed))] : [];
}
function uiTurretHow(rule, why) {
  const summary = uiEl('summary', { className: 'turret-how-summary', text: TURRET_TEXTS.card.how });
  return uiEl('details', { className: 'turret-how', children: [summary, uiRoomLine('turret-rule', rule), uiRoomLine('turret-why', why)] });
}
function uiTurretWinBody(state, result) {
  const [used, rule, why] = uiTurretLessons(state);
  const head = [uiRoomStars(result.stars, 'turret-stars'), ...uiRaceCardLines(result), uiTurretScore(state), ...uiTurretBestLine(result), uiRoomLine('turret-used', used), uiTurretVersus(state)];
  return [...head, ...uiTurretBilledLine(state), uiArenaPaidLine(result.rank, 'turret-paid'), uiTurretHow(rule, why)].filter(Boolean);
}
function uiTurretOverflowBody(state, result) {
  const [used, rule, why] = uiTurretLessons(state);
  const head = [uiTurretScore(state), ...uiTurretBestLine(result), uiRoomLine('turret-used', used), uiTurretVersus(state)];
  return [...head, ...uiTurretBilledLine(state), uiTurretHow(rule, why)];
}
function uiTurretLossCard(app, result) {
  const state = app.rig.arena.state;
  const lines = [result.why || '', 'Every drone needs one look-up: slot T - v.'].filter(Boolean);
  const actions = uiTurretActions(app, result.mode);
  return uiArenaCard(app, { title: TURRET_TEXTS.card.failTitle, tone: 'fail', lead: uiRaceStamp(result), lines, body: [uiTurretScore(state), ...uiRaceCardLines(result)], actions });
}
function uiTurretCard(app, result) {
  const state = app.rig.arena.state;
  const actions = uiTurretActions(app, result.mode);
  if (result.mode === 'overflow') {
    return uiArenaCard(app, { title: TURRET_TEXTS.card.overflowTitle, lines: [], body: uiTurretOverflowBody(state, result), actions });
  }
  if (!result.won) return uiTurretLossCard(app, result);
  const lines = result.firstClear ? [FIELD_DOWN, TURRET_TEXTS.card.next] : [TURRET_TEXTS.card.next];
  const title = WIN_TITLES[result.mode];
  return uiArenaCard(app, { title, lead: uiRaceStamp(result), lines: result.mode === 'w1' ? lines : [], body: uiTurretWinBody(state, result), actions });
}

export { uiTurretCard };

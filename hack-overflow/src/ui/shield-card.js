import { SHIELD_TEXTS } from '../game/rooms/data/shield-texts.js';
import { fillText } from '../game/rooms/data/turret-texts.js';
import { bruteReads, shieldPar } from '../game/rooms/shield.js';
import { uiArenaCard, uiArenaPaidLine } from './arena-shell.js';
import { uiEl } from './dom.js';
import { uiRoomBars, uiRoomLine, uiRoomStars } from './room-card.js';
import { uiShieldOtherModes } from './shield-modes.js';


const FIRST_CLEAR = 'First DISH RUSH cleared. The stack hall remembers it.';
const SWITCH_ACTIONS = { w1: 'shield-wave1', w2: 'shield-wave2', w3: 'shield-wave3' };
const MODE_LABELS = { w1: SHIELD_TEXTS.card.wave1, w2: SHIELD_TEXTS.card.wave2, w3: SHIELD_TEXTS.card.wave3 };
const TITLES = { w1: SHIELD_TEXTS.card.title, w2: SHIELD_TEXTS.card.title2, w3: SHIELD_TEXTS.card.title3 };

function uiShieldActions(app, mode) {
  const others = uiShieldOtherModes(app, mode).map((id) => ({ action: SWITCH_ACTIONS[id], label: MODE_LABELS[id] }));
  return [{ action: 'shield-replay', label: 'REPLAY' }, ...others, { action: 'rig-back', label: 'LEAVE' }];
}

function uiShieldVersus(state) {
  return uiRoomBars({ steps: state.steps, brute: bruteReads(state.wave) });
}
function uiShieldScore(state) {
  return uiEl('p', { className: 'turret-final-score shield-final-score', text: 'SCORE ' + state.score });
}
function uiShieldHow(rule, why) {
  const summary = uiEl('summary', { className: 'turret-how-summary', text: SHIELD_TEXTS.card.how });
  return uiEl('details', { className: 'turret-how', children: [summary, uiRoomLine('turret-rule', rule), uiRoomLine('turret-why', why)] });
}
function uiShieldLessons(state) {
  const values = { steps: state.steps, par: shieldPar(state.wave, state.spec), reads: bruteReads(state.wave), n: state.spec.length };
  if (state.spec.towers) return [fillText(SHIELD_TEXTS.card.usedTowers, values), SHIELD_TEXTS.card.starsTowers, fillText(SHIELD_TEXTS.card.whyTowers, values)];
  return [fillText(SHIELD_TEXTS.card.used, values), SHIELD_TEXTS.card.stars, fillText(SHIELD_TEXTS.card.why, values)];
}
function uiShieldBestLine(result) {
  const text = result.scoreImproved ? SHIELD_TEXTS.card.newBest : SHIELD_TEXTS.card.best;
  return result.best && result.best.score > 0 ? [uiRoomLine('turret-best shield-best', fillText(text, { score: result.best.score }))] : [];
}
function uiShieldAnswerLine(state) {
  const rows = state.answers;
  if (!state.spec.towers || rows.length === 0) return [];
  return [uiRoomLine('shield-answers', fillText(SHIELD_TEXTS.card.answers, { ans: rows[rows.length - 1].join(' ') }))];
}
function uiShieldWinBody(state, result) {
  const [used, rule, why] = uiShieldLessons(state);
  const head = [uiRoomStars(result.stars, 'shield-stars'), uiShieldScore(state), ...uiShieldBestLine(result), uiRoomLine('turret-used', used), uiShieldVersus(state)];
  return [...head, ...uiShieldAnswerLine(state), uiArenaPaidLine(result.rank, 'shield-paid'), uiShieldHow(rule, why)].filter(Boolean);
}
function uiShieldCardLines(result) {
  if (result.mode === 'w1') return result.firstClear ? [FIRST_CLEAR, SHIELD_TEXTS.card.open2, SHIELD_TEXTS.card.next] : [SHIELD_TEXTS.card.next];
  return result.mode === 'w2' && result.firstInMode ? [SHIELD_TEXTS.card.open3] : [];
}
function uiShieldLossLines(result, state) {
  const rule = state.spec.towers ? SHIELD_TEXTS.card.failRule3 : 'Every glyph needs one action: PUSH, POP, or hold BREACH.';
  return [result.why || '', rule].filter(Boolean);
}
function uiShieldCard(app, result) {
  const state = app.rig.arena.state;
  const actions = uiShieldActions(app, result.mode);
  if (!result.won) {
    return uiArenaCard(app, { title: SHIELD_TEXTS.card.failTitle, tone: 'fail', lines: uiShieldLossLines(result, state), body: [uiShieldScore(state)], actions });
  }
  return uiArenaCard(app, { title: TITLES[result.mode], lines: uiShieldCardLines(result), body: uiShieldWinBody(state, result), actions });
}

export { uiShieldCard };

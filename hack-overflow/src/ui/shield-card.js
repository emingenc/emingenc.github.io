import { SHIELD_W1 } from '../game/rooms/data/shield-wave1.js';
import { SHIELD_TEXTS } from '../game/rooms/data/shield-texts.js';
import { fillText } from '../game/rooms/data/turret-texts.js';
import { bruteReads, shieldPar } from '../game/rooms/shield.js';
import { uiArenaCard } from './arena-shell.js';
import { uiEl } from './dom.js';


const MAX_STARS = 3;
const STAR_ON = '★';
const STAR_OFF = '☆';
const PERCENT = 100;
const MIN_BAR_PERCENT = 6;
const FIRST_CLEAR = 'First DISH RUSH cleared. The stack hall remembers it.';
const CARD_ACTIONS = [{ action: 'shield-replay', label: 'REPLAY' }, { action: 'rig-back', label: 'LEAVE' }];

function uiShieldStar(index, stars) {
  const on = index < stars;
  return uiEl('span', { className: 'turret-star' + (on ? ' is-on' : ''), text: on ? STAR_ON : STAR_OFF });
}
function uiShieldStars(stars) {
  const cells = Array.from({ length: MAX_STARS }, (unused, index) => uiShieldStar(index, stars));
  return uiEl('p', { className: 'shield-stars', children: cells, attrs: { role: 'img', 'aria-label': stars + ' of ' + MAX_STARS + ' stars' } });
}
function uiShieldBarRow(kind, label, share) {
  const fill = uiEl('div', { className: 'turret-vs-fill turret-vs-' + kind });
  if (fill.style && typeof fill.style.setProperty === 'function') fill.style.setProperty('--vs', share + '%');
  const track = uiEl('div', { className: 'turret-vs-track', children: [fill] });
  return uiEl('div', { className: 'turret-vs-row', children: [uiEl('span', { className: 'turret-vs-label', text: label }), track] });
}
function uiShieldVersus(state) {
  const brute = bruteReads(state.wave);
  const ratio = brute > 0 ? state.steps / brute : 1;
  const you = Math.min(PERCENT, Math.max(MIN_BAR_PERCENT, Math.round(ratio * PERCENT)));
  const rows = [uiShieldBarRow('you', 'YOU ' + state.steps, you), uiShieldBarRow('brute', 'BRUTE ' + brute, PERCENT)];
  return uiEl('div', { className: 'turret-vs', children: rows, attrs: { 'aria-hidden': 'true' } });
}
function uiShieldScore(state) {
  return uiEl('p', { className: 'turret-final-score shield-final-score', text: 'SCORE ' + state.score });
}
function uiShieldLine(className, text) {
  return uiEl('p', { className: 'arena-card-line ' + className, text });
}
function uiShieldHow(rule, why) {
  const summary = uiEl('summary', { className: 'turret-how-summary', text: SHIELD_TEXTS.card.how });
  return uiEl('details', { className: 'turret-how', children: [summary, uiShieldLine('turret-rule', rule), uiShieldLine('turret-why', why)] });
}
function uiShieldWinBody(state, result) {
  const values = { steps: state.steps, par: shieldPar(state.wave), reads: bruteReads(state.wave), n: SHIELD_W1.length };
  const head = [uiShieldStars(result.stars), uiShieldScore(state), uiShieldLine('turret-used', fillText(SHIELD_TEXTS.card.used, values)), uiShieldVersus(state)];
  return [...head, uiShieldHow(SHIELD_TEXTS.card.stars, fillText(SHIELD_TEXTS.card.why, values))];
}
function uiShieldCard(app, result) {
  const state = app.rig.arena.state;
  if (!result.won) {
    const lines = [result.why || '', 'Every glyph needs one action: PUSH, POP, or hold BREACH.'].filter(Boolean);
    return uiArenaCard(app, { title: SHIELD_TEXTS.card.failTitle, tone: 'fail', lines, body: [uiShieldScore(state)], actions: CARD_ACTIONS });
  }
  const lines = result.firstClear ? [FIRST_CLEAR, SHIELD_TEXTS.card.next] : [SHIELD_TEXTS.card.next];
  return uiArenaCard(app, { title: SHIELD_TEXTS.card.title, lines, body: uiShieldWinBody(state, result), actions: CARD_ACTIONS });
}

export { uiShieldCard };

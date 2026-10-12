import { END_GLYPH } from '../game/rooms/data/shield-wave1.js';
import { SHIELD_TEXTS } from '../game/rooms/data/shield-texts.js';
import { fillText } from '../game/rooms/data/turret-texts.js';
import { glyphOf } from '../game/rooms/shield.js';
import { uiEl } from './dom.js';
import { uiShieldNoping } from './shield-flow.js';
import { uiShieldHeightPlate, uiShieldTowersLane } from './shield-towers-view.js';


const PUSH_ACTION = 'shield-push';
const POP_ACTION = 'shield-pop';
const BREACH_ACTION = 'shield-breach';
const KIND_CLASS = { '(': 'is-round', ')': 'is-round', '[': 'is-square', ']': 'is-square', '{': 'is-curly', '}': 'is-curly' };
const TOWER_CLASS = 'is-tower';
const FOG_GLYPH = '·';
const HINTS = { push: 'plate on', pop: 'top off', clear: 'tower empty', breach: 'hold', answer: 'answers top' };

function uiShieldKind(state,glyph) {
  return state.spec.towers ? TOWER_CLASS : KIND_CLASS[glyph] ?? 'is-end';
}

function uiShieldPlate(glyph, top) {
  return uiEl('span', {
    className: 'shield-plate ' + KIND_CLASS[glyph] + (top ? ' is-top' : ''), text: glyph, attrs: { role: 'listitem', 'aria-label': 'Plate ' + glyph + (top ? ', top' : '') },
  });
}
function uiShieldPlateOf(state, entry, top) {
  if (!state.spec.towers) return uiShieldPlate(entry, top);
  return uiShieldHeightPlate({ height: state.wave[state.vi][entry], index: entry, top });
}
function uiShieldTower(state) {
  const last = state.stack.length - 1;
  const plates = state.stack.map((entry, index) => uiShieldPlateOf(state, entry, index === last));
  const floor = uiEl('span', { className: 'shield-floor', text: state.stack.length === 0 ? 'EMPTY' : '', attrs: { 'aria-hidden': 'true' } });
  return uiEl('div', {
    className: 'shield-tower', attrs: { role: 'list', 'aria-label': 'Tower, ' + state.stack.length + (state.stack.length === 1 ? ' plate' : ' plates') },
    children: [floor, ...plates],
  });
}
function uiShieldCell(glyph, index, state) {
  const mode = index < state.gi ? ' is-done' : index === state.gi ? ' is-now' : '';
  if (state.spec.fog && index !== state.gi) {
    return uiEl('span', { className: 'shield-glyph is-fog' + mode, text: FOG_GLYPH, attrs: { role: 'listitem', 'aria-label': 'fog' } });
  }
  return uiEl('span', { className: 'shield-glyph ' + uiShieldKind(state, glyph) + mode, text: glyph, attrs: { role: 'listitem' } });
}
function uiShieldLane(state) {
  if (state.spec.towers) return uiShieldTowersLane(state);
  const volley = state.wave[state.vi] ?? '';
  const cells = [...volley, END_GLYPH].map((glyph, index) => uiShieldCell(glyph, index, state));
  const label = state.spec.fog ? 'Volley, in fog: only the next glyph shows' : 'Volley';
  return uiEl('div', { className: 'shield-lane', attrs: { role: 'list', 'aria-label': label }, children: cells });
}
function uiShieldBigGlyph(state) {
  const glyph = glyphOf(state);
  return uiEl('p', { className: 'shield-now ' + uiShieldKind(state, glyph), text: glyph, attrs: { 'aria-hidden': 'true' } });
}
function uiShieldRace(state) {
  const chip = state.spec.towers ? SHIELD_TEXTS.coach.chipTower : SHIELD_TEXTS.coach.chip;
  const order = uiEl('span', { className: 'shield-order', text: fillText(chip, { o: Math.min(state.vi + 1, state.wave.length), n: state.wave.length }) });
  const streak = uiEl('span', { className: 'shield-streak', text: state.combo > 1 ? 'STREAK x' + state.combo : '' });
  const held = state.spec.towers ? 'WAITING ' : 'TOWER ';
  const plates = uiEl('span', { className: 'shield-depth', text: held + state.stack.length });
  return uiEl('p', { className: 'shield-race', children: [order, streak, plates] });
}
function uiShieldField(app, now) {
  const arena = app.rig.arena;
  const state = arena.state;
  const volley = uiEl('div', { className: 'shield-volley', children: [uiShieldBigGlyph(state), uiShieldLane(state)] });
  const stage = uiEl('div', { className: 'shield-stage', children: [uiShieldTower(state), volley] });
  return uiEl('div', {
    className: 'shield-field' + (uiShieldNoping(arena, now) ? ' shield-nope' : ''), attrs: { 'data-shield-field': 'field' },
    children: [uiShieldRace(state), stage],
  });
}
function uiShieldVerb(spec) {
  const { action, word, hint, extra } = spec;
  return uiEl('button', {
    className: 'btn arena-btn arena-verb shield-verb ' + (extra ?? ''),
    attrs: { type: 'button', 'data-action': action, 'data-focus-key': action, 'aria-label': spec.label },
    children: [uiEl('span', { className: 'shield-verb-word', text: word }), uiEl('span', { className: 'shield-verb-hint', text: hint })],
  });
}
function uiShieldTowersDock() {
  const push = uiShieldVerb({ action: PUSH_ACTION, word: 'PUSH', hint: HINTS.push, label: 'Push the tower on' });
  const pop = uiShieldVerb({ action: POP_ACTION, word: 'POP', hint: HINTS.answer, label: 'Pop the top plate: it is answered by this tower' });
  return uiEl('div', { className: 'shield-dock is-towers', attrs: { role: 'group', 'aria-label': 'Shield controls' }, children: [push, pop] });
}
function uiShieldDock(app) {
  const state = app.rig.arena.state;
  if (state.spec.towers) return uiShieldTowersDock();
  const end = glyphOf(state) === END_GLYPH;
  const breach = uiShieldVerb({
    action: BREACH_ACTION, word: 'BREACH', hint: HINTS.breach, extra: 'shield-breach',
    label: 'Breach: hold to deflect the volley',
  });
  breach.setAttribute('data-shield-breach', 'hold');
  const push = uiShieldVerb({ action: PUSH_ACTION, word: end ? 'CLEAR' : 'PUSH', hint: end ? HINTS.clear : HINTS.push, label: end ? 'Clear: the tower is empty' : 'Push a plate' });
  const pop = uiShieldVerb({ action: POP_ACTION, word: end ? 'CLEAR' : 'POP', hint: end ? HINTS.clear : HINTS.pop, label: end ? 'Clear: the tower is empty' : 'Pop the top plate' });
  return uiEl('div', { className: 'shield-dock', attrs: { role: 'group', 'aria-label': 'Shield controls' }, children: [breach, push, pop] });
}

export { PUSH_ACTION, POP_ACTION, BREACH_ACTION, uiShieldField, uiShieldDock, uiShieldTower, uiShieldLane };

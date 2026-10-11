import { PINCER_W1 } from '../game/rooms/data/pincer-w1.js';
import { eaterNext, pincerMoves, pincerPar, pincerSum } from '../game/rooms/pincer.js';
import { uiEl } from './dom.js';
import { uiPincerNoping, uiPincerNow } from './pincer-flow.js';


const PLANK_ACTION = 'pincer-plank';
const FIRST_PLACE = 1;
const PIP_FULL = '●';
const PIP_EMPTY = '○';
const SEPARATOR = ' · ';
const METER_GAP = '  /  ';
const ONE_CHARGE = 1;
const HANDLES = { l: { letter: 'L', cell: 'is-l', role: 'left cannon' }, r: { letter: 'R', cell: 'is-r', role: 'right cannon' } };
const TONE_HINT = {
  low: 'The sum is below the target. Move L>.',
  high: 'The sum is above the target. Move <R.',
  equal: 'The sum equals the target. FIRE.',
};
const DOCK = [
  { move: 'l', action: 'pincer-l', side: 'pincer-btn-l', text: 'L▶', aria: 'L: move the left cannon up one pillar' },
  { move: 'fire', action: 'pincer-fire', side: 'pincer-btn-fire', text: 'FIRE', aria: '' },
  { move: 'r', action: 'pincer-r', side: 'pincer-btn-r', text: '◀R', aria: 'R: move the right cannon down one pillar' },
];

function uiPincerArena(app) {
  return app.rig.arena;
}
function uiPincerTone(state) {
  const sum = pincerSum(state);
  const { target } = state.stream;
  if (sum === target) return 'equal';
  return sum < target ? 'low' : 'high';
}


function uiPincerMeter(state) {
  const { pillars, target } = state.stream;
  const left = pillars[state.l];
  const right = pillars[state.r];
  const sum = pincerSum(state);
  const tone = uiPincerTone(state);
  const words = 'Left cannon ' + left + ' plus right cannon ' + right + ' equals ' + sum + '. Target ' + target + '. ' + TONE_HINT[tone];
  return uiEl('p', {
    className: 'pincer-meter is-' + tone,
    text: 'L ' + left + ' + R ' + right + ' = ' + sum + METER_GAP + 'T ' + target,
    attrs: { 'aria-label': words },
  });
}


function uiPincerIsHit(state, index) {
  return state.found.some((pair) => pair.includes(index));
}
function uiPincerPlankLegal(state) {
  return pincerMoves(state).includes('plank');
}
function uiPincerHandleAt(state, index) {
  if (index === state.l) return 'l';
  return index === state.r ? 'r' : null;
}
function uiPincerCellClasses(state, index) {
  const handle = uiPincerHandleAt(state, index);
  const names = ['pincer-pillar'];
  if (handle) names.push(HANDLES[handle].cell);
  if (index < state.l || index > state.r) names.push('is-out');
  if (index === state.stream.plank && !state.plankShot) names.push('is-plank');
  if (uiPincerIsHit(state, index)) names.push('is-hit');
  return names.join(' ');
}
function uiPincerCellWords(state, index) {
  const handle = uiPincerHandleAt(state, index);
  const tapPlank = index === state.stream.plank && uiPincerPlankLegal(state);
  const parts = ['Pillar ' + (index + FIRST_PLACE), 'value ' + state.stream.pillars[index]];
  if (handle) parts.push(HANDLES[handle].role);
  if (index < state.l || index > state.r) parts.push('dropped');
  if (uiPincerIsHit(state, index)) parts.push('part of the found pair');
  if (tapPlank) parts.push('plank, tap for a spare FIRE');
  return parts.join(', ');
}
function uiPincerCannon(handle) {
  const { letter } = HANDLES[handle];
  return uiEl('span', { className: 'pincer-cannon pincer-cannon-' + handle, text: letter, attrs: { 'data-pincer-handle': handle } });
}
function uiPincerCellAttrs(state, index) {
  const attrs = { 'aria-label': uiPincerCellWords(state, index) };
  const tappable = index === state.stream.plank && uiPincerPlankLegal(state);
  if (!tappable) return Object.assign(attrs, { role: 'img' });
  return Object.assign(attrs, { type: 'button', 'data-action': PLANK_ACTION, 'data-focus-key': PLANK_ACTION });
}
function uiPincerPillar(state, index) {
  const handle = uiPincerHandleAt(state, index);
  const val = uiEl('span', { className: 'pincer-val', text: String(state.stream.pillars[index]) });
  const tappable = index === state.stream.plank && uiPincerPlankLegal(state);
  return uiEl(tappable ? 'button' : 'div', {
    className: uiPincerCellClasses(state, index),
    attrs: uiPincerCellAttrs(state, index),
    children: [handle ? uiPincerCannon(handle) : null, val],
  });
}
function uiPincerRail(state) {
  const cells = state.stream.pillars.map((value, index) => uiPincerPillar(state, index));
  return uiEl('div', { className: 'pincer-rail', attrs: { role: 'group', 'aria-label': 'Ten sorted pillars' }, children: cells });
}


function uiPincerTile(state, index) {
  const names = ['pincer-tile'];
  if (index < PINCER_W1.floor - state.floor) names.push('is-eaten');
  if (index === eaterNext(state)) names.push('is-next');
  return uiEl('span', { className: names.join(' ') });
}
function uiPincerFloor(state) {
  const tiles = Array.from({ length: PINCER_W1.floor }, (unused, index) => uiPincerTile(state, index));
  const words = 'Bridge: ' + state.floor + ' of ' + PINCER_W1.floor + ' tiles left';
  return uiEl('div', { className: 'pincer-floor', attrs: { role: 'img', 'aria-label': words }, children: tiles });
}
function uiPincerEaterText(state) {
  if (state.status === 'won') return 'ROOT is stopped.';
  if (state.status !== 'running') return 'ROOT has the bridge.';
  if (state.skip > 0) return 'ROOT skips a tile next';
  return 'ROOT eats tile ' + (eaterNext(state) + FIRST_PLACE) + ' next';
}
function uiPincerStats(state) {
  return uiEl('p', { className: 'pincer-stats', text: 'STEPS ' + state.steps + SEPARATOR + 'PAR ' + pincerPar(state.stream) });
}

function uiPincerScene(app) {
  const arena = uiPincerArena(app);
  const { state } = arena;
  const armed = Boolean(arena.slide);
  const ghost = armed ? uiEl('span', { className: 'pincer-ghost', text: '+1 step', attrs: { 'aria-hidden': 'true' } }) : null;
  const eater = uiEl('p', { className: 'pincer-eater', text: uiPincerEaterText(state) });
  const noping = uiPincerNoping(arena, uiPincerNow());
  return uiEl('div', {
    className: 'pincer-scene' + (armed ? ' is-armed' : '') + (noping ? ' is-nope' : ''),
    children: [uiPincerMeter(state), uiPincerRail(state), uiPincerFloor(state), eater, uiPincerStats(state), ghost],
  });
}


function uiPincerPips(charges) {
  return PIP_FULL.repeat(charges) + PIP_EMPTY.repeat(PINCER_W1.charges - charges);
}
function uiPincerFireWords(charges) {
  const left = charges + (charges === ONE_CHARGE ? ' charge' : ' charges');
  return 'Fire: shoot the pair. ' + left + ' left. Only when the sum equals the target.';
}
function uiPincerDockAttrs(state, spec) {
  const aria = spec.move === 'fire' ? uiPincerFireWords(state.charges) : spec.aria;
  const attrs = { type: 'button', 'data-action': spec.action, 'data-focus-key': spec.action, 'aria-label': aria };
  if (!pincerMoves(state).includes(spec.move)) attrs['aria-disabled'] = 'true';
  return attrs;
}
function uiPincerDockButton(state, spec) {
  const className = 'btn arena-btn arena-verb pincer-btn ' + spec.side;
  const attrs = uiPincerDockAttrs(state, spec);
  if (spec.move !== 'fire') return uiEl('button', { className, text: spec.text, attrs });
  const pips = uiEl('span', { className: 'pincer-pips', text: uiPincerPips(state.charges) });
  return uiEl('button', { className, attrs, children: [uiEl('span', { className: 'pincer-fire-word', text: spec.text }), pips] });
}

function uiPincerDock(app) {
  const { state } = uiPincerArena(app);
  return uiEl('div', { className: 'pincer-dock', children: DOCK.map((spec) => uiPincerDockButton(state, spec)) });
}

export { uiPincerScene, uiPincerDock };

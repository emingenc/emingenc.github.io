import { PINCER_TEXTS, fillText } from '../game/rooms/data/pincer-texts.js';
import { PINCER_W1 } from '../game/rooms/data/pincer-w1.js';
import { eaterNext, pincerArea, pincerMoves, pincerPar, pincerSum } from '../game/rooms/pincer.js';
import { pillarsOf, specOf } from '../game/rooms/pincer-base.js';
import { uiEl } from './dom.js';
import { uiPincerDock } from './pincer-dock.js';
import { uiPincerNoping, uiPincerNow, uiPincerSettling } from './pincer-flow.js';


const PLANK_ACTION = 'pincer-plank';
const FIRST_PLACE = 1;
const SEPARATOR = ' · ';
const METER_GAP = '  /  ';
const DAM_GAP = '  ';
const HANDLES = { l: { letter: 'L', cell: 'is-l', role: 'left cannon' }, r: { letter: 'R', cell: 'is-r', role: 'right cannon' } };
const TONE_HINT = {
  low: 'The sum is below the target. Move L>.',
  high: 'The sum is above the target. Move <R.',
  equal: 'The sum equals the target. FIRE.',
};
const RAIL_WORDS = { sorted: 'Ten sorted pillars', unsorted: 'Ten unsorted pillars', dam: 'Ten walls of different heights' };

function uiPincerArena(app) {
  return app.rig.arena;
}
function uiPincerTone(state) {
  const sum = pincerSum(state);
  const { target } = state.stream;
  if (sum === target) return 'equal';
  return sum < target ? 'low' : 'high';
}


function uiPincerSumMeter(state) {
  const { target } = state.stream;
  const pillars = pillarsOf(state);
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
function uiPincerDamMeter(state) {
  const pillars = pillarsOf(state);
  const short = Math.min(pillars[state.l], pillars[state.r]);
  const area = pincerArea(state);
  const tone = area > state.bank ? 'equal' : 'low';
  const words = 'Shorter wall ' + short + ' times width ' + (state.r - state.l) + ' equals area ' + area + '. Bank ' + state.bank + '.';
  return uiEl('p', {
    className: 'pincer-meter is-dam is-' + tone,
    text: 'MIN ' + short + ' x ' + (state.r - state.l) + ' = ' + area + DAM_GAP + 'BANK ' + state.bank,
    attrs: { 'aria-label': words },
  });
}
function uiPincerMeter(state) {
  return specOf(state).dam ? uiPincerDamMeter(state) : uiPincerSumMeter(state);
}
function uiPincerBanner(state) {
  if (!specOf(state).sort) return null;
  return uiEl('p', { className: 'pincer-banner', text: fillText(PINCER_TEXTS.banner, { par: pincerPar(state.stream) }) });
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
  if (specOf(state).dam) names.push('is-dam');
  return names.join(' ');
}
function uiPincerCellWords(state, index) {
  const handle = uiPincerHandleAt(state, index);
  const tapPlank = index === state.stream.plank && uiPincerPlankLegal(state);
  const noun = specOf(state).dam ? 'height ' : 'value ';
  const parts = ['Pillar ' + (index + FIRST_PLACE), noun + pillarsOf(state)[index]];
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
  const val = uiEl('span', { className: 'pincer-val', text: String(pillarsOf(state)[index]) });
  const tappable = index === state.stream.plank && uiPincerPlankLegal(state);
  return uiEl(tappable ? 'button' : 'div', {
    className: uiPincerCellClasses(state, index),
    attrs: uiPincerCellAttrs(state, index),
    children: [handle ? uiPincerCannon(handle) : null, ...uiPincerBars(state, index), val],
  });
}
function uiPincerBars(state, index) {
  if (!specOf(state).dam) return [];
  const pillars = pillarsOf(state);
  const level = Math.min(pillars[state.l], pillars[state.r]);
  const inside = index >= state.l && index <= state.r;
  const bar = uiEl('span', { className: 'pincer-bar pincer-h-' + pillars[index], attrs: { 'aria-hidden': 'true' } });
  const water = inside ? uiEl('span', { className: 'pincer-water pincer-h-' + level, attrs: { 'aria-hidden': 'true' } }) : null;
  return [bar, water];
}
function uiPincerRailWords(state) {
  if (specOf(state).dam) return RAIL_WORDS.dam;
  return state.sorted === false ? RAIL_WORDS.unsorted : RAIL_WORDS.sorted;
}
function uiPincerRail(state, settling) {
  const cells = pillarsOf(state).map((value, index) => uiPincerPillar(state, index));
  const classes = 'pincer-rail' + (specOf(state).dam ? ' is-dam' : '') + (settling ? ' is-settle' : '');
  return uiEl('div', { className: classes, attrs: { role: 'group', 'aria-label': uiPincerRailWords(state) }, children: cells });
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
  const parts = ['STEPS ' + state.steps, 'PAR ' + pincerPar(state.stream)];
  if (specOf(state).sort) parts.push('MEMORY ' + state.memory + (state.memory === 1 ? ' slot' : ' slots'));
  return uiEl('p', { className: 'pincer-stats', text: parts.join(SEPARATOR) });
}

function uiPincerScene(app) {
  const arena = uiPincerArena(app);
  const { state } = arena;
  const armed = Boolean(arena.slide);
  const ghost = armed ? uiEl('span', { className: 'pincer-ghost', text: '+1 step', attrs: { 'aria-hidden': 'true' } }) : null;
  const eater = uiEl('p', { className: 'pincer-eater', text: uiPincerEaterText(state) });
  const noping = uiPincerNoping(arena, uiPincerNow());
  const settling = uiPincerSettling(arena, uiPincerNow());
  return uiEl('div', {
    className: 'pincer-scene' + (armed ? ' is-armed' : '') + (noping ? ' is-nope' : ''),
    children: [uiPincerBanner(state), uiPincerMeter(state), uiPincerRail(state, settling), uiPincerFloor(state), eater, uiPincerStats(state), ghost],
  });
}

export { uiPincerScene, uiPincerDock };

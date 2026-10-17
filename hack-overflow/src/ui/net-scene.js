import { MAX_RUN, NET_SCORE } from '../game/rooms/data/net-waves.js';
import { netMoves, netPar, netPeek, netWouldTear } from '../game/rooms/net.js';
import { uiEl } from './dom.js';


const FLICK_ACTION = 'net-flick';
const LANE_TILES = MAX_RUN + 1;
const FIRST_PLACE = 1;
const FIRST_LETTER = 'a'.charCodeAt(0);
const TONE_COUNT = 6;
const HIDDEN_CELL = '·';
const SEPARATOR = ' · ';
const METER_GAP = '  /  ';
const SNAG_MARK = '✕';
const WAVE_1_ONLY = 'wave 1 only';
const JUMP_MAX_SUB = 'l = max()';
const MAX_JUMP = 'max';
const JUMP_MAX_ARIA = 'JUMP: l = max(l, last copy + 1), the tail never moves back, so a copy already outside the net wastes the move';
const DOCK = [
  { move: 'shrink', action: 'net-shrink', text: 'SHRINK', aria: 'SHRINK: let the oldest item go, the tail moves right' },
  { move: 'extend', action: 'net-extend', text: 'EXTEND', aria: 'EXTEND: take the peeked item in, the head moves right' },
  { move: 'jump', action: 'net-jump', text: 'JUMP', aria: 'JUMP: move the tail past the peeked item\'s last copy in one move' },
];

function uiNetArena(app) {
  return app.rig.arena;
}
function uiNetLength(state) {
  return state.r - state.l;
}
function uiNetIsSum(state) {
  return state.rules.judge === 'sum';
}
function uiNetItemWord(state, item) {
  return uiNetIsSum(state) ? 'weight ' + item : 'letter ' + item;
}
function uiNetToneClass(item) {
  if (typeof item !== 'string') return null;
  return 'net-tone-' + ((item.charCodeAt(0) - FIRST_LETTER) % TONE_COUNT);
}
function uiNetItems(state) {
  return state.stream.items;
}
function uiNetNetText(state) {
  const held = uiNetItems(state).slice(state.l, state.r);
  return held.length > 0 ? held.join(' ') : 'empty';
}


function uiNetMeterText(state) {
  const best = 'BEST ' + state.best;
  if (!uiNetIsSum(state)) return 'NET ' + uiNetLength(state) + METER_GAP + best;
  return 'SUM ' + state.sum + ' / K ' + state.stream.k + METER_GAP + best;
}
function uiNetMeterWords(state) {
  const held = 'The net holds ' + uiNetLength(state) + (uiNetLength(state) === FIRST_PLACE ? ' item' : ' items');
  const best = ' Best ' + state.best + '.';
  if (!uiNetIsSum(state)) return held + '.' + best;
  const side = state.sum > state.stream.k ? 'over K' : 'within K';
  return held + ', sum ' + state.sum + ' ' + side + ' ' + state.stream.k + '.' + best;
}
function uiNetStrained(state) {
  return uiNetIsSum(state) && state.sum > state.stream.k;
}
function uiNetMeter(state) {
  return uiEl('p', {
    className: 'net-meter ' + (uiNetStrained(state) ? 'is-strained' : 'is-ok'),
    text: uiNetMeterText(state),
    attrs: { 'aria-label': uiNetMeterWords(state) },
  });
}


function uiNetFlickable(state) {
  return netMoves(state).includes('flick');
}
function uiNetTileWords(state, index, snag) {
  const parts = ['Item ' + (index + FIRST_PLACE), uiNetItemWord(state, uiNetItems(state)[index])];
  if (index === state.r) parts.push('peek');
  if (uiNetIsHeld(state, index)) parts.push('in the net');
  if (snag) parts.push('SNAG, EXTEND would tear');
  if (index === state.stream.gold) {
    const tail = state.flicked ? 'flicked out' : (uiNetFlickable(state) ? 'tap to flick it out for +' + NET_SCORE.gold + '. Free' : '');
    parts.push(('gold item ' + tail).trim());
  }
  return parts.join(', ');
}
function uiNetIsHeld(state, index) {
  return index >= state.l && index < state.r;
}
function uiNetFrameClasses(state, index) {
  const names = [];
  if (uiNetIsHeld(state, index)) names.push('is-net');
  if (uiNetIsHeld(state, index) && index === state.l) names.push('is-first');
  if (uiNetIsHeld(state, index) && index === state.r - FIRST_PLACE) names.push('is-last');
  if (index === state.r) names.push('is-peek');
  return names;
}
function uiNetGoldClasses(state, index) {
  if (index !== state.stream.gold) return [];
  return state.flicked ? ['is-gold', 'is-flicked'] : ['is-gold'];
}
function uiNetTileClasses(state, index, snag) {
  const names = ['net-tile', ...uiNetFrameClasses(state, index), ...uiNetGoldClasses(state, index)];
  if (snag) names.push('is-snag');
  names.push(uiNetToneClass(uiNetItems(state)[index]));
  return names.filter(Boolean).join(' ');
}
function uiNetTile(state, index) {
  const snag = index === state.r && state.rules.snags && netWouldTear(state);
  const tappable = index === state.stream.gold && uiNetFlickable(state);
  const attrs = { 'aria-label': uiNetTileWords(state, index, snag) };
  if (tappable) Object.assign(attrs, { type: 'button', 'data-action': FLICK_ACTION, 'data-focus-key': FLICK_ACTION });
  else attrs.role = 'img';
  const glyph = uiEl('span', { className: 'net-glyph', text: String(uiNetItems(state)[index]) });
  const mark = snag ? uiEl('span', { className: 'net-snag', text: SNAG_MARK, attrs: { 'aria-hidden': 'true' } }) : null;
  return uiEl(tappable ? 'button' : 'div', { className: uiNetTileClasses(state, index, snag), attrs, children: [glyph, mark] });
}
function uiNetLaneRange(state) {
  const first = Math.max(state.l, state.r + FIRST_PLACE - LANE_TILES);
  const last = Math.min(state.r, uiNetItems(state).length - FIRST_PLACE);
  return Array.from({ length: Math.max(0, last - first + FIRST_PLACE) }, (unused, at) => first + at);
}
function uiNetLane(state) {
  return uiEl('div', {
    className: 'net-lane' + (state.l === state.r ? ' is-empty-net' : ''),
    attrs: { role: 'group', 'aria-label': 'The net over the stream', 'data-net-handle': 'body' },
    children: uiNetLaneRange(state).map((index) => uiNetTile(state, index)),
  });
}
function uiNetStats(state) {
  return uiEl('p', { className: 'net-stats', text: 'STEPS ' + state.steps + SEPARATOR + 'PAR ' + netPar(state.stream, state.rules) });
}

function uiNetScene(app) {
  const arena = uiNetArena(app);
  const { state } = arena;
  const ghost = arena.drag ? uiEl('span', { className: 'net-ghost', text: '+1 step', attrs: { 'aria-hidden': 'true' } }) : null;
  return uiEl('div', {
    className: 'net-scene' + (arena.drag ? ' is-armed' : '') + (arena.nope ? ' is-nope' : ''),
    children: [uiNetMeter(state), uiNetLane(state), uiNetStats(state), arena.autoNode, ghost],
  });
}


function uiNetCellState(state, index) {
  if (index < state.l) return 'is-done';
  if (index < state.r) return 'is-net';
  return index === state.r ? 'is-peek' : '';
}
function uiNetCellShown(state, index) {
  return !state.rules.hidden || (index >= state.l && index <= state.r);
}
function uiNetCell(state, index) {
  const shown = uiNetCellShown(state, index);
  const names = ['net-cell', uiNetCellState(state, index), shown ? '' : 'is-hidden'];
  const text = shown ? String(uiNetItems(state)[index]) : HIDDEN_CELL;
  return uiEl('span', { className: names.filter(Boolean).join(' '), text });
}

function uiNetStrip(app) {
  const { state } = uiNetArena(app);
  const cells = uiNetItems(state).map((item, index) => uiNetCell(state, index));
  const words = 'The whole stream, ' + cells.length + ' items. The net is items ' + (state.l + FIRST_PLACE) + ' to ' + state.r + '.';
  return uiEl('div', { className: 'net-strip', attrs: { role: 'img', 'aria-label': words }, children: cells });
}


function uiNetPeekText(state) {
  const peek = netPeek(state);
  return '| ' + (peek === undefined ? 'end' : peek);
}

function uiNetMagnifier(app) {
  const { state } = uiNetArena(app);
  const grip = uiEl('span', {
    className: 'net-grip',
    text: 'TAIL▶',
    attrs: { role: 'img', 'aria-label': 'Tail grip: drag right to shrink the net by one', 'data-net-handle': 'tail' },
  });
  const held = uiEl('span', { className: 'net-span', text: uiNetNetText(state) });
  const head = uiEl('span', { className: 'net-head', text: uiNetPeekText(state) });
  return uiEl('div', { className: 'net-magnifier', children: [grip, held, head] });
}


function uiNetJumpMax(state, spec) {
  return spec.move === 'jump' && state.rules.jump === MAX_JUMP;
}
function uiNetDockLabel(state, spec) {
  if (spec.move === 'jump' && !state.rules.jump) return 'JUMP: ' + WAVE_1_ONLY;
  return uiNetJumpMax(state, spec) ? JUMP_MAX_ARIA : spec.aria;
}
function uiNetDockAttrs(state, spec) {
  const attrs = {
    type: 'button',
    'data-action': spec.action,
    'data-focus-key': spec.action,
    'aria-label': uiNetDockLabel(state, spec),
  };
  if (!netMoves(state).includes(spec.move)) attrs['aria-disabled'] = 'true';
  return attrs;
}
function uiNetDockButton(state, spec) {
  const word = uiEl('span', { className: 'net-verb', text: spec.text });
  const waveOff = spec.move === 'jump' && !state.rules.jump;
  const subText = waveOff ? WAVE_1_ONLY : (uiNetJumpMax(state, spec) ? JUMP_MAX_SUB : '');
  const sub = subText ? uiEl('span', { className: 'net-sub', text: subText }) : null;
  return uiEl('button', { className: 'btn arena-btn arena-verb net-btn', attrs: uiNetDockAttrs(state, spec), children: [word, sub] });
}

function uiNetDock(app) {
  const { state } = uiNetArena(app);
  return uiEl('div', { className: 'net-dock', children: DOCK.map((spec) => uiNetDockButton(state, spec)) });
}

export { uiNetScene, uiNetStrip, uiNetMagnifier, uiNetDock };

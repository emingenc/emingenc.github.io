import { SORT_STEPS, LOOKUP_STEPS } from '../game/rooms/data/pincer-waves.js';
import { pincerMoves } from '../game/rooms/pincer.js';
import { specOf } from '../game/rooms/pincer-base.js';
import { uiEl } from './dom.js';


const PIP_FULL = '●';
const PIP_EMPTY = '○';
const ONE_CHARGE = 1;
const DOCK = [
  { move: 'l', action: 'pincer-l', side: 'pincer-btn-l', text: 'L▶', aria: 'L: move the left cannon up one pillar' },
  { move: 'fire', action: 'pincer-fire', side: 'pincer-btn-fire', text: 'FIRE', aria: '' },
  { move: 'r', action: 'pincer-r', side: 'pincer-btn-r', text: '◀R', aria: 'R: move the right cannon down one pillar' },
];
const SORT_BUTTON = {
  move: 'sort', action: 'pincer-sort', side: 'pincer-btn-sort', text: 'SORT', cost: SORT_STEPS + ' steps',
  aria: 'S: sort the pillars. Costs ' + SORT_STEPS + ' steps and 2 memory slots. It forgets where each pillar stood.',
};
const LOOKUP_BUTTON = {
  move: 'lookup', action: 'pincer-lookup', side: 'pincer-btn-lookup', text: 'LOOKUP', cost: LOOKUP_STEPS + ' steps',
  aria: 'K: lookup table. Finds the pair in ' + LOOKUP_STEPS + ' steps and ' + LOOKUP_STEPS + ' memory slots.',
};
const BANK_BUTTON = {
  move: 'bank', action: 'pincer-bank', side: 'pincer-btn-bank', text: 'BANK', cost: 'free',
  aria: 'B: bank the current area as the best dam so far. Free.',
};

function uiPincerPips(state) {
  const total = specOf(state).charges;
  return PIP_FULL.repeat(state.charges) + PIP_EMPTY.repeat(total - state.charges);
}
function uiPincerFireWords(charges) {
  const left = charges + (charges === ONE_CHARGE ? ' charge' : ' charges');
  return 'Fire: shoot the pair. ' + left + ' left. Only when the sum equals the target.';
}
function uiPincerDamFireWords() {
  return 'Fire: lock the banked dam in. One shot. It opens once the cannons meet.';
}
function uiPincerFireAria(state) {
  return specOf(state).dam ? uiPincerDamFireWords() : uiPincerFireWords(state.charges);
}
function uiPincerDockAttrs(state, spec) {
  const aria = spec.move === 'fire' ? uiPincerFireAria(state) : spec.aria;
  const attrs = { type: 'button', 'data-action': spec.action, 'data-focus-key': spec.action, 'aria-label': aria };
  if (!pincerMoves(state).includes(spec.move)) attrs['aria-disabled'] = 'true';
  return attrs;
}
function uiPincerDockButton(state, spec) {
  const className = 'btn arena-btn arena-verb pincer-btn ' + spec.side;
  const attrs = uiPincerDockAttrs(state, spec);
  if (spec.move !== 'fire') return uiEl('button', { className, text: spec.text, attrs });
  const pips = uiEl('span', { className: 'pincer-pips', text: uiPincerPips(state) });
  return uiEl('button', { className, attrs, children: [uiEl('span', { className: 'pincer-fire-word', text: spec.text }), pips] });
}
function uiPincerExtraButton(state, spec) {
  const className = 'btn arena-btn arena-verb pincer-btn pincer-btn-extra ' + spec.side;
  const word = uiEl('span', { className: 'pincer-extra-word', text: spec.text });
  const cost = uiEl('span', { className: 'pincer-extra-cost', text: spec.cost });
  return uiEl('button', { className, attrs: uiPincerDockAttrs(state, spec), children: [word, cost] });
}
function uiPincerExtras(state) {
  const spec = specOf(state);
  const list = [];
  if (spec.sort) list.push(SORT_BUTTON);
  if (spec.lookup) list.push(LOOKUP_BUTTON);
  if (spec.dam) list.push(BANK_BUTTON);
  return list;
}

function uiPincerDock(app) {
  const { state } = app.rig.arena;
  const buttons = DOCK.map((spec) => uiPincerDockButton(state, spec));
  const extras = uiPincerExtras(state).map((spec) => uiPincerExtraButton(state, spec));
  if (extras.length === 0) return uiEl('div', { className: 'pincer-dock', children: buttons });
  const row = uiEl('div', { className: 'pincer-dock-extra', children: extras });
  return uiEl('div', { className: 'pincer-dock has-extra', children: [...buttons, row] });
}

export { uiPincerDock };

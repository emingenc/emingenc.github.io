import { TURRET_W1 } from '../game/rooms/data/turret-wave1.js';
import { TURRET_TEXTS, fillText } from '../game/rooms/data/turret-texts.js';
import { keyFor, turretTarget } from '../game/rooms/turret.js';
import { uiEl } from './dom.js';


const SLOT_ACTION = 'turret-slot-';
const TAG_ACTION = 'turret-tag';
const PICK_ACTION = 'turret-pick-';
const HINT_LAST_DRONE = 2;
const FIRST_SLOT = 1;

function uiTurretSlotLabel(slot, count) {
  if (count === 0) return 'Slot ' + slot + ', empty';
  return 'Slot ' + slot + ', lit, holds ' + count;
}
function uiTurretHintSlot(state) {
  const lead = state.bay[0];
  return lead && lead.n <= HINT_LAST_DRONE ? keyFor(state, lead) : 0;
}
function uiTurretSlotClass(count, hinted) {
  return 'turret-slot' + (count > 0 ? ' is-lit' : '') + (hinted ? ' is-hint' : '');
}
function uiTurretSlot(state, slot, hint) {
  const count = state.board[slot];
  const action = SLOT_ACTION + slot;
  const pip = count > 1 ? uiEl('span', { className: 'turret-pip', text: 'x' + count }) : null;
  return uiEl('button', {
    className: uiTurretSlotClass(count, slot === hint),
    attrs: { type: 'button', 'data-action': action, 'data-focus-key': action, 'data-turret-slot': String(slot), 'aria-label': uiTurretSlotLabel(slot, count) },
    children: [uiEl('span', { className: 'turret-slot-num', text: String(slot) }), pip],
  });
}
function uiTurretBoardClass(arena, noping) {
  return 'turret-board' + (noping ? ' turret-nope' : '') + (arena.pointerDriven ? ' is-pointer' : '');
}
function uiTurretBoard(app) {
  const arena = app.rig.arena;
  const state = arena.state;
  const hint = uiTurretHintSlot(state);
  const slots = Array.from({ length: TURRET_W1.slots }, (_, index) => uiTurretSlot(state, index + FIRST_SLOT, hint));
  return uiEl('div', { className: uiTurretBoardClass(arena, false), attrs: { role: 'group', 'aria-label': 'Slots 1 to 9' }, children: slots });
}
function uiTurretTag(app) {
  const drone = app.rig.arena.state.bay[app.rig.arena.picked];
  const keep = drone ? String(drone.v) : 'it';
  return uiEl('button', {
    className: 'btn arena-btn arena-verb turret-tag',
    attrs: { type: 'button', 'data-action': TAG_ACTION, 'data-focus-key': TAG_ACTION, 'aria-label': 'Store it: keep ' + keep + ' without checking a slot' },
    children: [uiEl('span', { className: 'turret-tag-word', text: 'STORE IT' }), uiEl('span', { className: 'turret-tag-hint', text: 'slot empty? keep ' + keep })],
  });
}
function uiTurretChip(state, drone, view) {
  const text = fillText(TURRET_TEXTS.coach.chip, { n: drone.v, t: turretTarget(state) });
  const action = PICK_ACTION + view.index;
  const picked = view.dual && view.index === view.picked;
  return uiEl('button', {
    className: 'turret-chip' + (picked ? ' is-picked' : ''),
    text,
    attrs: {
      type: 'button', 'data-action': action, 'data-focus-key': action, 'data-turret-bay': String(view.index),
      'aria-pressed': String(picked), 'aria-label': 'Bay drone ' + drone.v + ', target ' + turretTarget(state) + (picked ? ', picked' : ''),
    },
  });
}
function uiTurretBayBand(app) {
  const arena = app.rig.arena;
  const bay = arena.state.bay;
  const dual = bay.length > 1;
  const chips = bay.map((drone, index) => uiTurretChip(arena.state, drone, { index, dual, picked: arena.picked }));
  return uiEl('div', { className: 'turret-bay', attrs: { role: 'group', 'aria-label': 'Bay' }, children: chips });
}

export { SLOT_ACTION, TAG_ACTION, PICK_ACTION, uiTurretBoard, uiTurretBoardClass, uiTurretTag, uiTurretBayBand };

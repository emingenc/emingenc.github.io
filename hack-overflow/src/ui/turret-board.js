import { TURRET_W1 } from '../game/rooms/data/turret-wave1.js';
import { TURRET_TEXTS, fillText } from '../game/rooms/data/turret-texts.js';
import { hintOffer, keyFor, turretTarget } from '../game/rooms/turret.js';
import { uiEl } from './dom.js';


const SLOT_ACTION = 'turret-slot-';
const TAG_ACTION = 'turret-tag';
const PICK_ACTION = 'turret-pick-';
const TRUST_ACTION = 'turret-trust';
const VERIFY_ACTION = 'turret-verify';
const HINT_LAST_DRONE = 2;
const FIRST_SLOT = 1;

function uiTurretSlotLabel(slot, count, shown) {
  if (!shown) return 'Slot ' + slot;
  if (count === 0) return 'Slot ' + slot + ', empty';
  return 'Slot ' + slot + ', lit, holds ' + count;
}
function uiTurretHintSlot(state) {
  const offer = hintOffer(state);
  if (offer) return offer.slot;
  const lead = state.bay[0];
  return lead && lead.n <= HINT_LAST_DRONE ? keyFor(state, lead) : 0;
}
function uiTurretSlotShown(arena, slot) {
  return !arena.state.spec.dark || Object.hasOwn(arena.reveal, slot);
}
function uiTurretSlotView(arena, slot) {
  const state = arena.state;
  const count = state.board[slot];
  const shown = uiTurretSlotShown(arena, slot);
  const lit = count > 0 && shown;
  const className = 'turret-slot' + (state.spec.dark ? ' is-dark' : '') + (lit ? ' is-lit' : '') + (slot === uiTurretHintSlot(state) ? ' is-hint' : '');
  return { className, label: uiTurretSlotLabel(slot, count, shown) };
}
function uiTurretSlot(arena, slot) {
  const count = arena.state.board[slot];
  const action = SLOT_ACTION + slot;
  const view = uiTurretSlotView(arena, slot);
  const pip = count > 1 ? uiEl('span', { className: 'turret-pip', text: 'x' + count }) : null;
  return uiEl('button', {
    className: view.className,
    attrs: { type: 'button', 'data-action': action, 'data-focus-key': action, 'data-turret-slot': String(slot), 'aria-label': view.label },
    children: [uiEl('span', { className: 'turret-slot-num', text: String(slot) }), pip],
  });
}
function uiTurretBoardClass(arena, noping) {
  return 'turret-board' + (noping ? ' turret-nope' : '') + (arena.pointerDriven ? ' is-pointer' : '');
}
function uiTurretBoard(app) {
  const arena = app.rig.arena;
  const slots = Array.from({ length: TURRET_W1.slots }, (_, index) => uiTurretSlot(arena, index + FIRST_SLOT));
  return uiEl('div', { className: uiTurretBoardClass(arena, false), attrs: { role: 'group', 'aria-label': 'Slots 1 to 9' }, children: slots });
}
function uiTurretVerb(spec, hint) {
  const word = uiEl('span', { className: spec.wordClass, text: spec.word });
  const sub = hint ? uiEl('span', { className: 'turret-tag-hint', text: hint }) : null;
  return uiEl('button', {
    className: 'btn arena-btn arena-verb ' + spec.className,
    attrs: { type: 'button', 'data-action': spec.action, 'data-focus-key': spec.action, 'aria-label': spec.label },
    children: [word, sub],
  });
}
function uiTurretStoreVerb(drone, compact) {
  const keep = drone ? String(drone.v) : 'it';
  return uiTurretVerb({
    className: 'turret-tag', action: TAG_ACTION, wordClass: 'turret-tag-word', word: 'STORE IT',
    label: 'Store it: keep ' + keep + ' without checking a slot',
  }, compact ? '' : 'slot empty? keep ' + keep);
}
function uiTurretOfferVerbs(offer, drone) {
  const trust = uiTurretVerb({
    className: 'turret-trust', action: TRUST_ACTION, wordClass: 'turret-tag-word turret-trust-word', word: 'TRUST',
    label: 'Trust GHOSTWRITER: look up slot ' + offer.slot + ' for you',
  }, 'slot ' + offer.slot);
  const verify = uiTurretVerb({
    className: 'turret-verify', action: VERIFY_ACTION, wordClass: 'turret-tag-word turret-verify-word', word: 'VERIFY',
    label: 'Verify: work out the slot yourself',
  }, 'check it');
  return uiEl('div', { className: 'turret-verbs', children: [uiTurretStoreVerb(drone, true), trust, verify] });
}
function uiTurretTag(app) {
  const arena = app.rig.arena;
  const drone = arena.state.bay[arena.picked];
  const offer = hintOffer(arena.state);
  return offer ? uiTurretOfferVerbs(offer, drone) : uiTurretStoreVerb(drone, false);
}
function uiTurretChipText(state, drone) {
  const values = { n: drone.v, t: turretTarget(state) };
  return fillText(drone.gold ? TURRET_TEXTS.coach.chipGold : TURRET_TEXTS.coach.chip, values);
}
function uiTurretChip(state, drone, view) {
  const action = PICK_ACTION + view.index;
  const picked = view.dual && view.index === view.picked;
  return uiEl('button', {
    className: 'turret-chip' + (picked ? ' is-picked' : '') + (drone.gold ? ' is-gold' : ''),
    text: uiTurretChipText(state, drone),
    attrs: {
      type: 'button', 'data-action': action, 'data-focus-key': action, 'data-turret-bay': String(view.index),
      'aria-pressed': String(picked),
      'aria-label': (drone.gold ? 'Gold bay drone ' : 'Bay drone ') + drone.v + ', target ' + turretTarget(state) + (picked ? ', picked' : ''),
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

export {
  SLOT_ACTION, TAG_ACTION, PICK_ACTION, TRUST_ACTION, VERIFY_ACTION, uiTurretBoard, uiTurretBoardClass, uiTurretSlotView, uiTurretTag, uiTurretBayBand,
};

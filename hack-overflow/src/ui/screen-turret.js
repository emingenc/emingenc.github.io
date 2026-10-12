import { TURRET_TEXTS, fillText } from '../game/rooms/data/turret-texts.js';
import { hintOffer } from '../game/rooms/turret.js';
import { uiRenderApp } from './app.js';
import { ARENA_FOCUS_KEY } from './arena-shell.js';
import { uiRoomEmpty, uiRoomHead, uiRoomLeave, uiRoomOpen, uiRoomReady, uiRoomShell } from './room-screen.js';
import { EVICT_ACTION, PICK_ACTION, SLOT_ACTION, TAG_ACTION, TRUST_ACTION, VERIFY_ACTION, uiTurretBoard, uiTurretTag } from './turret-board.js';
import { uiTurretCard } from './turret-card.js';
import { uiTurretDragAttach, uiTurretDragCancel, uiTurretDragDetach, uiTurretDragDown, uiTurretDragKeep, uiTurretDragUp } from './turret-drag.js';
import { TURRET_RIG_ID, uiTurretArmEvict, uiTurretCommit, uiTurretCreate, uiTurretSetAssist, uiTurretSpoken, uiTurretVerify } from './turret-flow.js';
import { uiTurretNow, uiTurretStart, uiTurretStop } from './turret-loop.js';
import { uiRaceRule, uiRaceSpoken, uiRaceTake } from './turret-race.js';
import { uiTurretScene, uiTurretSceneNodes } from './turret-scene.js';
import { uiStoryLabFinish } from './story-dialogue.js';


const BACK_ACTION = 'rig-back';
const REPLAY_ACTION = 'turret-replay';
const MODE_ACTIONS = { 'turret-wave1': 'w1', 'turret-wave2': 'w2', 'turret-wave3': 'w3', 'turret-overflow': 'overflow' };
const RULES = { w1: TURRET_TEXTS.rule, w2: TURRET_TEXTS.rule2, w3: TURRET_TEXTS.rule3, overflow: TURRET_TEXTS.ruleOverflow };
const MODE_TITLES = { w1: 'LOOKUP TURRET', w2: 'TURRET · W2', w3: 'TURRET · W3', overflow: 'TURRET · OVERFLOW' };
const MODE_FULL_TITLES = { w1: '', w2: ' · WAVE 2', w3: ' · WAVE 3', overflow: ' · OVERFLOW' };
const MODE_SPOKEN = { w1: '', w2: ', wave 2', w3: ', wave 3', overflow: ', overflow' };
const CLEAR_ANNOUNCE = { w1: 'Wave clear. The way is open.', w2: 'Wave 2 clear.', w3: 'Wave 3 clear.' };
const SLOT_PATTERN = /^turret-slot-([1-9])$/;
const PICK_PATTERN = /^turret-pick-(\d)$/;
const SLOT_KEY = /^[1-9]$/;
const KEY_OFFER = { g: TRUST_ACTION, v: VERIFY_ACTION };
const CLICK_SWALLOW_MS = 600;
const STYLESHEETS = ['styles/rooms/rig-shell.css', 'styles/rooms/arena.css', 'styles/rooms/turret.css'];

function uiTurretArena(app) {
  return app.rig && app.rig.rigId === TURRET_RIG_ID && app.rig.arena ? app.rig.arena : null;
}


function uiTurretPlayView(app) {
  const arena = app.rig.arena;
  const rule = arena.race ? uiRaceRule(arena) : fillText(RULES[arena.mode], { n: arena.state.stream.length });
  return [...uiRoomHead(rule, arena.coach), uiTurretScene(app), uiTurretBoard(app), uiTurretTag(app)];
}
function uiTurretRender(app) {
  const arena = uiTurretArena(app);
  if (!arena) return uiRoomEmpty();
  const body = arena.view === 'card' ? [uiTurretCard(app, arena.result)] : uiTurretPlayView(app);
  const fullTitle = arena.rig.title + MODE_FULL_TITLES[arena.mode];
  return uiRoomShell(app, arena, { rigId: TURRET_RIG_ID, title: MODE_TITLES[arena.mode], fullTitle, body });
}
function uiTurretCardAnnounce(arena) {
  if (arena.mode === 'overflow') return TURRET_TEXTS.card.overflowTitle + '.';
  const race = uiRaceSpoken(arena.result);
  if (!arena.result.won) return race + 'Overrun.';
  return race + CLEAR_ANNOUNCE[arena.mode];
}
function uiTurretAnnounce(app) {
  const arena = uiTurretArena(app);
  if (!arena) return 'LOOKUP TURRET.';
  if (arena.view === 'card') return uiTurretCardAnnounce(arena);
  return arena.rig.title + MODE_SPOKEN[arena.mode] + '. ' + uiTurretSpoken(arena) + ' ' + arena.coach;
}
function uiTurretFocusKey(app) {
  const arena = uiTurretArena(app);
  if (!arena) return BACK_ACTION;
  if (arena.view === 'card') return REPLAY_ACTION;
  return ARENA_FOCUS_KEY;
}


function uiTurretPlay(app, moveId, focusKey) {
  uiTurretCommit(app, moveId, uiTurretNow());
  if (app.rig.arena.view === 'play') app.lastFocusKey = focusKey;
}
function uiTurretSwallowed(arena, actionId) {
  const swallow = arena.swallow;
  arena.swallow = null;
  return Boolean(swallow && swallow.action === actionId && uiTurretNow() < swallow.until);
}
function uiTurretSlotAction(app, actionId) {
  const match = SLOT_PATTERN.exec(actionId);
  if (!match) return false;
  const arena = app.rig.arena;
  if (!uiTurretSwallowed(arena, actionId)) uiTurretPlay(app, (arena.evict ? 'evict:' : 'probe:') + arena.picked + ':' + match[1], actionId);
  return true;
}
function uiTurretPickAction(app, actionId) {
  const match = PICK_PATTERN.exec(actionId);
  if (!match) return false;
  const arena = app.rig.arena;
  const index = Number(match[1]);
  if (arena.view === 'play' && arena.state.bay[index]) arena.picked = index;
  app.lastFocusKey = actionId;
  return true;
}
function uiTurretLetGo() {
  uiTurretStop();
  uiTurretDragDetach();
}
function uiTurretLeave(app) {
  const { rig } = app;
  if (!uiRoomLeave(app, uiTurretLetGo)) return;
  if (rig.outroDue) uiStoryLabFinish(app, rig.arena.rig.labId);
}
function uiTurretBegin(app, mode) {
  const arena = app.rig.arena;
  if (arena.view !== 'card') return;
  const lastIndex = mode === arena.mode ? arena.poolIndex : null;
  app.rig.arena = uiTurretCreate(app, arena.rig, { now: uiTurretNow(), lastIndex, mode, race: arena.race });
  app.lastFocusKey = TAG_ACTION;
  app.pendingAnnounce = uiTurretSpoken(app.rig.arena) + ' ' + app.rig.arena.coach;
}
function uiTurretReplay(app) {
  uiTurretBegin(app, app.rig.arena.mode);
}
function uiTurretTrust(app) {
  const offer = hintOffer(app.rig.arena.state);
  if (offer) uiTurretPlay(app, 'trust:' + offer.bay, TAG_ACTION);
}
function uiTurretVerifyAction(app) {
  if (uiTurretVerify(app)) app.lastFocusKey = TAG_ACTION;
}
function uiTurretEvictAction(app) {
  uiTurretArmEvict(app);
  app.lastFocusKey = EVICT_ACTION;
}
const UI_TURRET_ACTIONS = {
  [BACK_ACTION]: uiTurretLeave,
  'arena-assist': (app) => uiTurretSetAssist(app, app.game.ext.assist !== true),
  [TAG_ACTION]: (app) => uiTurretPlay(app, 'tag:' + app.rig.arena.picked, TAG_ACTION),
  [REPLAY_ACTION]: uiTurretReplay,
  [EVICT_ACTION]: uiTurretEvictAction,
  [TRUST_ACTION]: uiTurretTrust,
  [VERIFY_ACTION]: uiTurretVerifyAction,
};
function uiTurretApplyAction(app, actionId) {
  if (!uiTurretArena(app)) return false;
  if (Object.hasOwn(UI_TURRET_ACTIONS, actionId)) {
    UI_TURRET_ACTIONS[actionId](app);
    return true;
  }
  if (Object.hasOwn(MODE_ACTIONS, actionId)) {
    uiTurretBegin(app, MODE_ACTIONS[actionId]);
    return true;
  }
  return uiTurretSlotAction(app, actionId) || uiTurretPickAction(app, actionId) || actionId.startsWith('turret-');
}


function uiTurretPointerDown(event, app) {
  if (uiTurretArena(app)) uiTurretDragDown(app, event);
  return false;
}
function uiTurretPointerUp(event, app) {
  if (!uiTurretArena(app)) return false;
  const dropped = uiTurretDragUp(app, event);
  if (!dropped) return false;
  const moveId = app.rig.arena.evict ? dropped.replace('probe:', 'evict:') : dropped;
  const slotAction = SLOT_ACTION + moveId.split(':')[2];
  app.rig.arena.swallow = { action: slotAction, until: uiTurretNow() + CLICK_SWALLOW_MS };
  uiTurretPlay(app, moveId, slotAction);
  uiRenderApp(app);
  return true;
}
function uiTurretPointerCancel() {
  uiTurretDragCancel();
  return false;
}


function uiTurretVerbKey(arena, lower) {
  if (lower === 'e' && arena.state.spec.cap > 0) return EVICT_ACTION;
  return lower === 'p' && arena.state.bay.length > 1 ? PICK_ACTION + (1 - arena.picked) : null;
}
function uiTurretKeyId(event, app) {
  const arena = app.rig.arena;
  if (event.key === 'Escape') return BACK_ACTION;
  if (arena.view !== 'play') return null;
  if (SLOT_KEY.test(event.key)) return SLOT_ACTION + event.key;
  const lower = String(event.key).toLowerCase();
  if (lower === 't') return TAG_ACTION;
  if (hintOffer(arena.state) && KEY_OFFER[lower]) return KEY_OFFER[lower];
  return uiTurretVerbKey(arena, lower);
}
function uiTurretKeyAction(event, app) {
  if (!uiTurretArena(app)) return null;
  const id = uiTurretKeyId(event, app);
  if (!id) return null;
  event.preventDefault();
  return event.repeat ? { type: 'handled' } : { type: 'action', id };
}


function uiTurretSync(app, active, root) {
  const arena = active ? uiTurretArena(app) : null;
  if (!arena) {
    uiTurretStop();
    uiTurretDragDetach();
    return;
  }
  uiTurretSceneNodes(arena, root);
  uiTurretDragAttach(app);
  uiTurretDragKeep(app);
  if (arena.view === 'play' && !app.menuOpen) uiTurretStart(app);
  else uiTurretStop();
}
function uiTurretRelease() {
  uiTurretDragCancel();
}

function uiRigScreen() {
  return {
    id: 'rig', render: uiTurretRender, focusKey: uiTurretFocusKey, announce: uiTurretAnnounce, keyAction: uiTurretKeyAction,
    applyAction: uiTurretApplyAction, pointerDown: uiTurretPointerDown, pointerUp: uiTurretPointerUp, pointerCancel: uiTurretPointerCancel,
    sync: uiTurretSync, release: uiTurretRelease,
  };
}
function uiRigOpen(app, rigId) {
  const start = (opened, rig) => uiTurretCreate(opened, rig, { now: uiTurretNow(), lastIndex: null, race: uiRaceTake(opened) });
  uiRoomOpen(app, rigId, start);
}
function uiRigReady() {
  return uiRoomReady(STYLESHEETS);
}

export { uiRigScreen, uiRigOpen, uiRigReady };

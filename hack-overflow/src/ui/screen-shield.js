import { SHIELD_TEXTS } from '../game/rooms/data/shield-texts.js';
import { fillText } from '../game/rooms/data/turret-texts.js';
import { uiRenderApp } from './app.js';
import { ARENA_FOCUS_KEY } from './arena-shell.js';
import { uiEl } from './dom.js';
import { uiRoomBody, uiRoomEmpty, uiRoomHead, uiRoomLeave, uiRoomOpen, uiRoomReady, uiRoomShell } from './room-screen.js';
import { uiShieldCard } from './shield-card.js';
import { BREACH_ACTION, POP_ACTION, PUSH_ACTION, uiShieldDock, uiShieldField } from './shield-board.js';
import { SHIELD_RIG_ID, uiShieldCommit, uiShieldCreate, uiShieldSetAssist, uiShieldSpoken, uiShieldTime } from './shield-flow.js';
import { uiShieldAutoKey, uiShieldAutoKick, uiShieldAutoOf, uiShieldAutoPause, uiShieldAutoStop } from './shield-auto.js';
import { uiShieldPressCancel, uiShieldPressDown, uiShieldPressUp } from './shield-input.js';


const BACK_ACTION = 'rig-back';
const REPLAY_ACTION = 'shield-replay';
const STYLESHEETS = ['styles/rooms/rig-shell.css', 'styles/rooms/arena.css', 'styles/lazy/auto-run.css', 'styles/rooms/shield.css'];
const BREACH_NOW = 'shield-breach-now';
const KEY_VERBS = { arrowleft: PUSH_ACTION, p: PUSH_ACTION, arrowright: POP_ACTION, o: POP_ACTION, b: BREACH_NOW };
const MODE_ACTIONS = { 'shield-wave1': 'w1', 'shield-wave2': 'w2', 'shield-wave3': 'w3' };
const RULES = { w1: SHIELD_TEXTS.rule, w2: SHIELD_TEXTS.rule2, w3: SHIELD_TEXTS.rule3 };
const AUTO_RULES = { w1: SHIELD_TEXTS.ruleAuto, w2: SHIELD_TEXTS.rule2Auto, w3: SHIELD_TEXTS.rule3Auto };
const MODE_TITLES = { w1: null, w2: 'SHIELD · W2', w3: 'SHIELD · W3' };

function uiShieldArena(app) {
  return app.rig && app.rig.rigId === SHIELD_RIG_ID && app.rig.arena ? app.rig.arena : null;
}


function uiShieldPlayView(app) {
  const arena = app.rig.arena;
  const rule = fillText((arena.manual ? RULES : AUTO_RULES)[arena.mode], { n: arena.state.wave.length });
  const strip = uiEl('div', { className: 'shield-auto', children: [uiShieldAutoOf(app).controls.node] });
  return [...uiRoomHead(rule, arena.coach), uiShieldField(app, uiShieldTime()), strip, uiShieldDock(app)];
}
function uiShieldRender(app) {
  const arena = uiShieldArena(app);
  if (!arena) return uiRoomEmpty();
  const title = MODE_TITLES[arena.mode] ?? arena.rig.title;
  const body = uiRoomBody(app, arena, { play: () => uiShieldPlayView(app), card: () => uiShieldCard(app, arena.result) });
  return uiRoomShell(app, arena, { rigId: SHIELD_RIG_ID, title, body });
}
function uiShieldAnnounce(app) {
  const arena = uiShieldArena(app);
  if (!arena) return 'PLATE SHIELD.';
  if (arena.view === 'card') return arena.result.won ? 'Wave clear. The shield holds.' : 'Shield down.';
  return arena.rig.title + '. ' + uiShieldSpoken(arena) + ' ' + arena.coach;
}
function uiShieldFocusKey(app) {
  const arena = uiShieldArena(app);
  if (!arena) return BACK_ACTION;
  return arena.view === 'card' ? REPLAY_ACTION : ARENA_FOCUS_KEY;
}


function uiShieldPlay(app, verb, focusKey) {
  uiShieldCommit(app, verb, uiShieldTime());
  if (app.rig.arena.view === 'play') app.lastFocusKey = focusKey;
}
function uiShieldBreachClick(app) {
  if (app.clickByPointer) {
    app.lastFocusKey = BREACH_ACTION;
    return;
  }
  uiShieldPlay(app, 'breach', BREACH_ACTION);
}
function uiShieldLeave(app) {
  uiRoomLeave(app, () => {
    uiShieldPressCancel();
    uiShieldAutoStop(app);
  });
}
function uiShieldBegin(app, mode) {
  const arena = app.rig.arena;
  if (arena.view !== 'card') return;
  const lastIndex = mode === arena.mode ? arena.poolIndex : null;
  uiShieldAutoStop(app);
  app.rig.arena = uiShieldCreate(app, arena.rig, { now: uiShieldTime(), lastIndex, mode });
  uiShieldAutoKick(app);
  app.lastFocusKey = app.rig.arena.state.spec.towers ? PUSH_ACTION : BREACH_ACTION;
  app.pendingAnnounce = uiShieldSpoken(app.rig.arena) + ' ' + app.rig.arena.coach;
}
function uiShieldReplay(app) {
  uiShieldBegin(app, app.rig.arena.mode);
}
const UI_SHIELD_ACTIONS = {
  [BACK_ACTION]: uiShieldLeave,
  'arena-assist': (app) => uiShieldSetAssist(app, app.game.ext.assist !== true),
  [PUSH_ACTION]: (app) => uiShieldPlay(app, 'push', PUSH_ACTION),
  [POP_ACTION]: (app) => uiShieldPlay(app, 'pop', POP_ACTION),
  [BREACH_ACTION]: uiShieldBreachClick,
  [BREACH_NOW]: (app) => uiShieldPlay(app, 'breach', BREACH_ACTION),
  [REPLAY_ACTION]: uiShieldReplay,
};
function uiShieldApplyAction(app, actionId) {
  if (!uiShieldArena(app)) return false;
  if (Object.hasOwn(UI_SHIELD_ACTIONS, actionId)) {
    UI_SHIELD_ACTIONS[actionId](app);
    return true;
  }
  if (Object.hasOwn(MODE_ACTIONS, actionId)) {
    uiShieldBegin(app, MODE_ACTIONS[actionId]);
    return true;
  }
  return actionId.startsWith('shield-');
}


function uiShieldPointerDown(event, app) {
  if (uiShieldArena(app)) uiShieldPressDown(app, event);
  return false;
}
function uiShieldPointerUp(event, app) {
  if (!uiShieldArena(app)) return false;
  if (!uiShieldPressUp(app, event)) return false;
  uiRenderApp(app);
  return true;
}
function uiShieldPointerCancel() {
  uiShieldPressCancel();
  return false;
}


function uiShieldKeyId(event, app) {
  const key = String(event.key).toLowerCase();
  if (event.key === 'Escape') return BACK_ACTION;
  const arena = app.rig.arena;
  if (arena.view !== 'play') return null;
  if (arena.state.spec.towers && key === 'b') return null;
  return KEY_VERBS[key] ?? null;
}
function uiShieldKeyAction(event, app) {
  if (!uiShieldArena(app)) return null;
  if (uiShieldAutoKey(app, event)) return { type: 'handled' };
  const id = uiShieldKeyId(event, app);
  if (!id) return null;
  event.preventDefault();
  if (event.repeat) return { type: 'handled' };
  return { type: 'action', id };
}


function uiShieldSync(app, active) {
  if (active && uiShieldArena(app)) return uiShieldAutoKick(app);
  uiShieldPressCancel();
  return uiShieldAutoStop(app);
}
function uiShieldRelease(app) {
  uiShieldPressCancel();
  uiShieldAutoPause(app);
}

function uiRigScreen() {
  return {
    id: 'rig', render: uiShieldRender, focusKey: uiShieldFocusKey, announce: uiShieldAnnounce, keyAction: uiShieldKeyAction,
    applyAction: uiShieldApplyAction, pointerDown: uiShieldPointerDown, pointerUp: uiShieldPointerUp, pointerCancel: uiShieldPointerCancel,
    sync: uiShieldSync, release: uiShieldRelease,
  };
}
function uiRigOpen(app, rigId) {
  uiRoomOpen(app, rigId, (opened, rig) => uiShieldCreate(opened, rig, { now: uiShieldTime(), lastIndex: null }));
  uiShieldAutoKick(app);
}
function uiRigReady() {
  return uiRoomReady(STYLESHEETS);
}

export { uiRigScreen, uiRigOpen, uiRigReady };

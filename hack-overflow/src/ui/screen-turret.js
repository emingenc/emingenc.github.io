import { rigOf } from '../game/rig-catalog.js';
import { TURRET_TEXTS, fillText } from '../game/rooms/data/turret-texts.js';
import { uiRenderApp } from './app.js';
import { ARENA_FOCUS_KEY, uiArenaCoach, uiArenaHeader, uiArenaLeave, uiArenaLeaveTooSoon, uiArenaOpen, uiArenaRule, uiArenaToastNode } from './arena-shell.js';
import { uiEl } from './dom.js';
import { uiLinkStyle } from './lazy-style.js';
import { PICK_ACTION, SLOT_ACTION, TAG_ACTION, uiTurretBoard, uiTurretTag } from './turret-board.js';
import { uiTurretCard } from './turret-card.js';
import { uiTurretDragAttach, uiTurretDragCancel, uiTurretDragDetach, uiTurretDragDown, uiTurretDragKeep, uiTurretDragUp } from './turret-drag.js';
import { TURRET_RIG_ID, uiTurretCommit, uiTurretCreate, uiTurretSetAssist, uiTurretSpoken } from './turret-flow.js';
import { ASSIST_ACTION, KEEP_ACTION, uiTurretBannerFocus, uiTurretFuseBanner } from './turret-fuse-banner.js';
import { uiTurretNow, uiTurretStart, uiTurretStop } from './turret-loop.js';
import { uiTurretScene, uiTurretSceneNodes } from './turret-scene.js';
import { uiStoryLabFinish } from './story-dialogue.js';


const BACK_ACTION = 'rig-back';
const REPLAY_ACTION = 'turret-replay';
const SLOT_PATTERN = /^turret-slot-([1-9])$/;
const PICK_PATTERN = /^turret-pick-(\d)$/;
const SLOT_KEY = /^[1-9]$/;
const CLICK_SWALLOW_MS = 600;
const STYLESHEETS = ['styles/rooms/arena.css', 'styles/rooms/turret.css'];

function uiTurretArena(app) {
  return app.rig && app.rig.rigId === TURRET_RIG_ID && app.rig.arena ? app.rig.arena : null;
}


function uiTurretPlayView(app) {
  const arena = app.rig.arena;
  return [uiArenaRule(fillText(TURRET_TEXTS.rule, { n: arena.state.stream.length })), uiArenaCoach(arena.coach), uiTurretScene(app), uiTurretBoard(app), uiTurretTag(app), uiTurretFuseBanner(app)];
}
function uiTurretRender(app) {
  const arena = uiTurretArena(app);
  if (!arena) return uiEl('section', { className: 'screen rig-screen', attrs: { 'data-screen': 'rig' } });
  const view = { hearts: arena.state.integrity, score: arena.state.score, title: arena.rig.title, assist: app.game.ext.assist };
  const body = arena.view === 'card' ? [uiTurretCard(app, arena.result)] : uiTurretPlayView(app);
  return uiEl('section', {
    className: 'screen rig-screen arena-screen turret-screen' + (arena.view === 'card' ? ' is-card' : ''),
    attrs: { 'data-screen': 'rig', 'data-rig': TURRET_RIG_ID, tabindex: '-1', 'data-focus-key': ARENA_FOCUS_KEY },
    children: [uiArenaHeader(app, view), uiArenaToastNode(app), ...body],
  });
}
function uiTurretAnnounce(app) {
  const arena = uiTurretArena(app);
  if (!arena) return 'LOOKUP TURRET.';
  if (arena.view === 'card') return arena.result.won ? 'Wave clear. The way is open.' : 'Overrun.';
  return arena.rig.title + '. ' + uiTurretSpoken(arena) + ' ' + arena.coach;
}
function uiTurretFocusKey(app) {
  const arena = uiTurretArena(app);
  if (!arena) return BACK_ACTION;
  if (arena.view === 'card') return REPLAY_ACTION;
  return arena.banner ? uiTurretBannerFocus(arena.reduced) : ARENA_FOCUS_KEY;
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
  if (!uiTurretSwallowed(app.rig.arena, actionId)) uiTurretPlay(app, 'probe:' + app.rig.arena.picked + ':' + match[1], actionId);
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
function uiTurretLeave(app) {
  if (uiArenaLeaveTooSoon(app)) return;
  const { rig } = app;
  uiTurretStop();
  uiTurretDragDetach();
  uiArenaLeave(app, null);
  if (rig.outroDue) uiStoryLabFinish(app, rig.arena.rig.labId);
}
function uiTurretReplay(app) {
  const arena = app.rig.arena;
  if (arena.view !== 'card') return;
  app.rig.arena = uiTurretCreate(app, arena.rig, { now: uiTurretNow(), lastIndex: arena.poolIndex });
  app.lastFocusKey = TAG_ACTION;
  app.pendingAnnounce = uiTurretSpoken(app.rig.arena) + ' ' + app.rig.arena.coach;
}
function uiTurretChoose(app, on) {
  if (!app.rig.arena.banner) return;
  uiTurretSetAssist(app, on);
  app.lastFocusKey = TAG_ACTION;
}
const UI_TURRET_ACTIONS = {
  [BACK_ACTION]: uiTurretLeave,
  'arena-assist': (app) => uiTurretSetAssist(app, app.game.ext.assist !== true),
  [TAG_ACTION]: (app) => uiTurretPlay(app, 'tag:' + app.rig.arena.picked, TAG_ACTION),
  [REPLAY_ACTION]: uiTurretReplay,
  [KEEP_ACTION]: (app) => uiTurretChoose(app, false),
  [ASSIST_ACTION]: (app) => uiTurretChoose(app, true),
};
function uiTurretApplyAction(app, actionId) {
  if (!uiTurretArena(app)) return false;
  if (Object.hasOwn(UI_TURRET_ACTIONS, actionId)) {
    UI_TURRET_ACTIONS[actionId](app);
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
  const moveId = uiTurretDragUp(app, event);
  if (!moveId) return false;
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


function uiTurretKeyId(event, app) {
  const arena = app.rig.arena;
  if (event.key === 'Escape') return BACK_ACTION;
  if (arena.view !== 'play' || arena.banner) return null;
  if (SLOT_KEY.test(event.key)) return SLOT_ACTION + event.key;
  const lower = String(event.key).toLowerCase();
  if (lower === 't') return TAG_ACTION;
  return lower === 'p' && arena.state.bay.length > 1 ? PICK_ACTION + (1 - arena.picked) : null;
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
  const rig = rigOf(rigId);
  if (!rig) throw new Error('unknown rig: ' + rigId);
  uiArenaOpen(app, { rigId, create: (opened) => uiTurretCreate(opened, rig, { now: uiTurretNow(), lastIndex: null }) });
}
function uiRigReady() {
  return Promise.all(STYLESHEETS.map((href) => uiLinkStyle(href))).then(() => undefined);
}

export { uiRigScreen, uiRigOpen, uiRigReady };

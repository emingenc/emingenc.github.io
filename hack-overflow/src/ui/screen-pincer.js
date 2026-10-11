import { rigOf } from '../game/rig-catalog.js';
import { PINCER_TEXTS } from '../game/rooms/data/pincer-texts.js';
import { uiRenderApp, uiRenderKeepingFocus } from './app.js';
import { ARENA_FOCUS_KEY, uiArenaCoach, uiArenaHeader, uiArenaLeave, uiArenaLeaveTooSoon, uiArenaOpen, uiArenaRule, uiArenaToastNode } from './arena-shell.js';
import { uiEl } from './dom.js';
import { uiLinkStyles } from './lazy-style.js';
import { uiPincerCard } from './pincer-card.js';
import { PINCER_RIG_ID, uiPincerCommit, uiPincerCreate, uiPincerNow, uiPincerSpoken } from './pincer-flow.js';
import { uiPincerDock, uiPincerScene } from './pincer-scene.js';
import { uiPincerSlideCancel, uiPincerSlideDown, uiPincerSlideUp } from './pincer-slide.js';


const BACK_ACTION = 'rig-back';
const REPLAY_ACTION = 'pincer-replay';
const ASSIST_ACTION = 'arena-assist';
const PLANK_ACTION = 'pincer-plank';
const ACTION_PREFIX = 'pincer-';
const MOVE_OF_ACTION = { 'pincer-l': 'l', 'pincer-r': 'r', 'pincer-fire': 'fire', [PLANK_ACTION]: 'plank' };
const ACTION_OF_KEY = { l: 'pincer-l', r: 'pincer-r', f: 'pincer-fire', p: PLANK_ACTION };
const STYLESHEETS = ['styles/rooms/rig-shell.css', 'styles/rooms/arena.css', 'styles/rooms/pincer.css'];

function uiPincerArena(app) {
  return app.rig && app.rig.rigId === PINCER_RIG_ID && app.rig.arena ? app.rig.arena : null;
}


function uiPincerPlayView(app) {
  const arena = app.rig.arena;
  return [uiArenaRule(PINCER_TEXTS.rule), uiArenaCoach(arena.coach), uiPincerScene(app), uiPincerDock(app)];
}
function uiPincerRender(app) {
  const arena = uiPincerArena(app);
  if (!arena) return uiEl('section', { className: 'screen rig-screen', attrs: { 'data-screen': 'rig' } });
  const view = { hearts: arena.state.charges, score: arena.state.score, title: arena.rig.title, assist: false };
  const body = arena.view === 'card' ? [uiPincerCard(app, arena.result)] : uiPincerPlayView(app);
  return uiEl('section', {
    className: 'screen rig-screen arena-screen pincer-screen' + (arena.view === 'card' ? ' is-card' : ''),
    attrs: { 'data-screen': 'rig', 'data-rig': PINCER_RIG_ID, tabindex: '-1', 'data-focus-key': ARENA_FOCUS_KEY },
    children: [uiArenaHeader(app, view), uiArenaToastNode(app), ...body],
  });
}
function uiPincerAnnounce(app) {
  const arena = uiPincerArena(app);
  if (!arena) return 'PINCER CANNONS.';
  if (arena.view === 'card') return arena.result.won ? PINCER_TEXTS.card.title + '.' : PINCER_TEXTS.card.failTitle + '.';
  return arena.rig.title + '. ' + uiPincerSpoken(arena) + ' ' + arena.coach;
}
function uiPincerFocusKey(app) {
  const arena = uiPincerArena(app);
  if (!arena) return BACK_ACTION;
  return arena.view === 'card' ? REPLAY_ACTION : ARENA_FOCUS_KEY;
}


function uiPincerPlay(app, actionId) {
  uiPincerCommit(app, MOVE_OF_ACTION[actionId], uiPincerNow());
  if (app.rig.arena.view === 'play') app.lastFocusKey = actionId === PLANK_ACTION ? ARENA_FOCUS_KEY : actionId;
}
function uiPincerLeave(app) {
  if (uiArenaLeaveTooSoon(app)) return;
  uiPincerSlideCancel();
  uiArenaLeave(app, null);
}
function uiPincerReplay(app) {
  const arena = app.rig.arena;
  if (arena.view !== 'card') return;
  app.rig.arena = uiPincerCreate(app, arena.rig, { now: uiPincerNow(), lastIndex: arena.poolIndex });
  app.lastFocusKey = ARENA_FOCUS_KEY;
  app.pendingAnnounce = uiPincerSpoken(app.rig.arena) + ' ' + app.rig.arena.coach;
}
function uiPincerNoAssist() {
  return null;
}
const UI_PINCER_ACTIONS = { [BACK_ACTION]: uiPincerLeave, [ASSIST_ACTION]: uiPincerNoAssist, [REPLAY_ACTION]: uiPincerReplay };
function uiPincerApplyAction(app, actionId) {
  if (!uiPincerArena(app)) return false;
  if (Object.hasOwn(UI_PINCER_ACTIONS, actionId)) UI_PINCER_ACTIONS[actionId](app);
  else if (Object.hasOwn(MOVE_OF_ACTION, actionId)) uiPincerPlay(app, actionId);
  return Object.hasOwn(UI_PINCER_ACTIONS, actionId) || actionId.startsWith(ACTION_PREFIX);
}


function uiPincerRepaint(app) {
  if (app.rig.arena.view === 'play') uiRenderKeepingFocus(app);
  else uiRenderApp(app);
}
function uiPincerPointerDown(event, app) {
  if (!uiPincerArena(app)) return false;
  if (uiPincerSlideDown(app, event)) uiPincerRepaint(app);
  return false;
}
function uiPincerPointerUp(event, app) {
  const arena = uiPincerArena(app);
  if (!arena) return false;
  const before = arena.state;
  const armed = Boolean(arena.slide);
  uiPincerSlideUp(app, event);
  const moved = arena.state !== before;
  if (moved || armed) uiPincerRepaint(app);
  return moved;
}
function uiPincerPointerCancel(event, app) {
  const arena = uiPincerArena(app);
  const armed = Boolean(arena && arena.slide);
  uiPincerSlideCancel();
  if (!armed) return false;
  arena.slide = null;
  uiPincerRepaint(app);
  return false;
}


function uiPincerKeyId(event, app) {
  if (event.key === 'Escape') return BACK_ACTION;
  if (app.rig.arena.view !== 'play') return null;
  return ACTION_OF_KEY[String(event.key).toLowerCase()] || null;
}
function uiPincerKeyAction(event, app) {
  if (!uiPincerArena(app)) return null;
  const id = uiPincerKeyId(event, app);
  if (!id) return null;
  event.preventDefault();
  return event.repeat ? { type: 'handled' } : { type: 'action', id };
}


function uiPincerSync(app, active) {
  if (!active || !uiPincerArena(app)) uiPincerSlideCancel();
}
function uiPincerRelease() {
  uiPincerSlideCancel();
}

function uiRigScreen() {
  return {
    id: 'rig', render: uiPincerRender, focusKey: uiPincerFocusKey, announce: uiPincerAnnounce, keyAction: uiPincerKeyAction,
    applyAction: uiPincerApplyAction, pointerDown: uiPincerPointerDown, pointerUp: uiPincerPointerUp, pointerCancel: uiPincerPointerCancel,
    sync: uiPincerSync, release: uiPincerRelease,
  };
}
function uiRigOpen(app, rigId) {
  const rig = rigOf(rigId);
  if (!rig) throw new Error('unknown rig: ' + rigId);
  uiArenaOpen(app, { rigId, create: (opened) => uiPincerCreate(opened, rig, { now: uiPincerNow(), lastIndex: null }) });
}
function uiRigReady() {
  return uiLinkStyles(STYLESHEETS);
}

export { uiRigScreen, uiRigOpen, uiRigReady };

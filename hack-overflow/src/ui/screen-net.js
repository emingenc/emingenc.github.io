import { rigOf } from '../game/rig-catalog.js';
import { NET_INTEGRITY } from '../game/rooms/data/net-waves.js';
import { NET_TEXTS } from '../game/rooms/data/net-texts.js';
import { uiRenderApp, uiRenderKeepingFocus } from './app.js';
import { ARENA_FOCUS_KEY, uiArenaCoach, uiArenaHeader, uiArenaLeave, uiArenaLeaveTooSoon, uiArenaOpen, uiArenaRule, uiArenaToastNode } from './arena-shell.js';
import { uiEl } from './dom.js';
import { uiLinkStyles } from './lazy-style.js';
import { uiNetCard } from './net-card.js';
import { uiNetDrag } from './net-drag.js';
import { NET_RIG_ID, uiNetClearNope, uiNetCommit, uiNetCreate, uiNetNoping, uiNetNow, uiNetPlayable, uiNetSpoken } from './net-flow.js';
import { uiNetDock, uiNetMagnifier, uiNetScene, uiNetStrip } from './net-scene.js';


const BACK_ACTION = 'rig-back';
const REPLAY_ACTION = 'net-replay';
const WAVE_ACTION = 'net-wave2';
const ASSIST_ACTION = 'arena-assist';
const FLICK_ACTION = 'net-flick';
const ACTION_PREFIX = 'net-';
const MOVE_OF_ACTION = { 'net-extend': 'extend', 'net-shrink': 'shrink', 'net-jump': 'jump', [FLICK_ACTION]: 'flick' };
const ACTION_OF_KEY = {
  e: 'net-extend', arrowright: 'net-extend', s: 'net-shrink', arrowleft: 'net-shrink', j: 'net-jump', g: FLICK_ACTION,
};
const STYLESHEETS = ['styles/rooms/rig-shell.css', 'styles/rooms/arena.css', 'styles/rooms/net.css'];
const SUM_JUDGE = 'sum';
const NOPE_CLEAR_MS = 260;

function uiNetArena(app) {
  return app.rig && app.rig.rigId === NET_RIG_ID && app.rig.arena ? app.rig.arena : null;
}
const uiGesture = uiNetDrag({ playable: uiNetPlayable, commit: uiNetCommit, now: uiNetNow });


function uiNetRuleText(arena) {
  return arena.state.rules.judge === SUM_JUDGE ? NET_TEXTS.ruleSum : NET_TEXTS.rule;
}
function uiNetPlayView(app) {
  const arena = app.rig.arena;
  return [uiArenaRule(uiNetRuleText(arena)), uiArenaCoach(arena.coach), uiNetScene(app), uiNetStrip(app), uiNetMagnifier(app), uiNetDock(app)];
}
function uiNetRender(app) {
  const arena = uiNetArena(app);
  if (!arena) return uiEl('section', { className: 'screen rig-screen', attrs: { 'data-screen': 'rig' } });
  const view = { hearts: arena.state.integrity, heartsMax: NET_INTEGRITY, score: arena.state.score, title: arena.rig.title, assist: false };
  const body = arena.view === 'card' ? [uiNetCard(app, arena.result)] : uiNetPlayView(app);
  return uiEl('section', {
    className: 'screen rig-screen arena-screen net-screen' + (arena.view === 'card' ? ' is-card' : ''),
    attrs: { 'data-screen': 'rig', 'data-rig': NET_RIG_ID, tabindex: '-1', 'data-focus-key': ARENA_FOCUS_KEY },
    children: [uiArenaHeader(app, view), uiArenaToastNode(app), ...body],
  });
}
function uiNetAnnounce(app) {
  const arena = uiNetArena(app);
  if (!arena) return 'SLIDING NET.';
  if (arena.view === 'card') return (arena.result.won ? NET_TEXTS.card.title : NET_TEXTS.card.failTitle) + '.';
  return arena.rig.title + '. ' + uiNetSpoken(arena) + ' ' + arena.coach;
}
function uiNetFocusKey(app) {
  const arena = uiNetArena(app);
  if (!arena) return BACK_ACTION;
  return arena.view === 'card' ? REPLAY_ACTION : ARENA_FOCUS_KEY;
}


function uiNetScheduleNopeClear(app, arena) {
  window.setTimeout(() => {
    const open = uiNetArena(app) === arena && app.screen === 'rig';
    if (!open || !arena.nope || uiNetNoping(arena, uiNetNow())) return;
    uiNetClearNope(arena);
    if (arena.view === 'play') uiRenderKeepingFocus(app);
  }, NOPE_CLEAR_MS);
}
function uiNetWatchNope(app, played) {
  const arena = app.rig.arena;
  if (!played && arena.nope) uiNetScheduleNopeClear(app, arena);
}


function uiNetPlay(app, actionId) {
  const played = uiNetCommit(app, MOVE_OF_ACTION[actionId], uiNetNow());
  uiNetWatchNope(app, played);
  if (app.rig.arena.view !== 'play') return;
  app.lastFocusKey = actionId === FLICK_ACTION && played ? ARENA_FOCUS_KEY : actionId;
}
function uiNetLeave(app) {
  if (uiArenaLeaveTooSoon(app)) return;
  uiGesture.cancel();
  uiArenaLeave(app, null);
}
function uiNetRestart(app, start) {
  const arena = app.rig.arena;
  app.rig.arena = uiNetCreate(app, arena.rig, { now: uiNetNow(), ...start });
  app.lastFocusKey = ARENA_FOCUS_KEY;
  app.pendingAnnounce = uiNetSpoken(app.rig.arena) + ' ' + app.rig.arena.coach;
}
function uiNetReplay(app) {
  const arena = app.rig.arena;
  if (arena.view === 'card') uiNetRestart(app, { lastIndex: arena.poolIndex, mode: arena.mode });
}
function uiNetNextWave(app) {
  const arena = app.rig.arena;
  if (arena.view === 'card' && arena.result.nextMode) uiNetRestart(app, { lastIndex: null, mode: arena.result.nextMode });
}
function uiNetNoAssist() {
  return null;
}
const UI_NET_ACTIONS = {
  [BACK_ACTION]: uiNetLeave, [ASSIST_ACTION]: uiNetNoAssist, [REPLAY_ACTION]: uiNetReplay, [WAVE_ACTION]: uiNetNextWave,
};
function uiNetApplyAction(app, actionId) {
  if (!uiNetArena(app)) return false;
  if (Object.hasOwn(UI_NET_ACTIONS, actionId)) UI_NET_ACTIONS[actionId](app);
  else if (Object.hasOwn(MOVE_OF_ACTION, actionId)) uiNetPlay(app, actionId);
  return Object.hasOwn(UI_NET_ACTIONS, actionId) || actionId.startsWith(ACTION_PREFIX);
}


function uiNetRepaint(app) {
  if (app.rig.arena.view === 'play') uiRenderKeepingFocus(app);
  else uiRenderApp(app);
}
function uiNetPointerDown(event, app) {
  if (!uiNetArena(app)) return false;
  if (uiGesture.down(app, event)) uiNetRepaint(app);
  return false;
}
function uiNetPointerUp(event, app) {
  const arena = uiNetArena(app);
  if (!arena) return false;
  const before = arena.state;
  const armed = Boolean(arena.drag);
  uiGesture.up(app, event);
  const moved = arena.state !== before;
  uiNetWatchNope(app, moved);
  if (moved || armed) uiNetRepaint(app);
  return moved;
}
function uiNetPointerCancel(event, app) {
  const arena = uiNetArena(app);
  const armed = Boolean(arena && arena.drag);
  uiGesture.cancel();
  if (armed) uiNetRepaint(app);
  return false;
}


function uiNetKeyId(event, app) {
  if (event.key === 'Escape') return BACK_ACTION;
  if (app.rig.arena.view !== 'play') return null;
  return ACTION_OF_KEY[String(event.key).toLowerCase()] || null;
}
function uiNetKeyAction(event, app) {
  if (!uiNetArena(app)) return null;
  const id = uiNetKeyId(event, app);
  if (!id) return null;
  event.preventDefault();
  return event.repeat ? { type: 'handled' } : { type: 'action', id };
}


function uiNetSync(app, active) {
  if (!active || !uiNetArena(app)) uiGesture.cancel();
}
function uiNetRelease() {
  uiGesture.cancel();
}

function uiRigScreen() {
  return {
    id: 'rig', render: uiNetRender, focusKey: uiNetFocusKey, announce: uiNetAnnounce, keyAction: uiNetKeyAction,
    applyAction: uiNetApplyAction, pointerDown: uiNetPointerDown, pointerUp: uiNetPointerUp, pointerCancel: uiNetPointerCancel,
    sync: uiNetSync, release: uiNetRelease,
  };
}
function uiRigOpen(app, rigId) {
  const rig = rigOf(rigId);
  if (!rig) throw new Error('unknown rig: ' + rigId);
  uiArenaOpen(app, { rigId, create: (opened) => uiNetCreate(opened, rig, { now: uiNetNow(), lastIndex: null }) });
}
function uiRigReady() {
  return uiLinkStyles(STYLESHEETS);
}

export { uiRigScreen, uiRigOpen, uiRigReady };

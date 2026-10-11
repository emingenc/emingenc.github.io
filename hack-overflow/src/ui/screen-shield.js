import { rigOf } from '../game/rig-catalog.js';
import { SHIELD_TEXTS } from '../game/rooms/data/shield-texts.js';
import { fillText } from '../game/rooms/data/turret-texts.js';
import { uiRenderApp } from './app.js';
import { ARENA_FOCUS_KEY, uiArenaCoach, uiArenaHeader, uiArenaLeave, uiArenaLeaveTooSoon, uiArenaOpen, uiArenaRule, uiArenaToastNode } from './arena-shell.js';
import { uiEl } from './dom.js';
import { uiLinkStyles } from './lazy-style.js';
import { uiShieldCard } from './shield-card.js';
import { BREACH_ACTION, POP_ACTION, PUSH_ACTION, uiShieldDock, uiShieldField } from './shield-board.js';
import { SHIELD_RIG_ID, uiShieldCommit, uiShieldCreate, uiShieldSetAssist, uiShieldSpoken, uiShieldTime } from './shield-flow.js';
import { uiShieldPressCancel, uiShieldPressDown, uiShieldPressUp } from './shield-input.js';


const BACK_ACTION = 'rig-back';
const REPLAY_ACTION = 'shield-replay';
const STYLESHEETS = ['styles/rooms/rig-shell.css', 'styles/rooms/arena.css', 'styles/rooms/shield.css'];
const BREACH_NOW = 'shield-breach-now';
const KEY_VERBS = { arrowleft: PUSH_ACTION, p: PUSH_ACTION, arrowright: POP_ACTION, o: POP_ACTION, b: BREACH_NOW };

function uiShieldArena(app) {
  return app.rig && app.rig.rigId === SHIELD_RIG_ID && app.rig.arena ? app.rig.arena : null;
}


function uiShieldPlayView(app) {
  const arena = app.rig.arena;
  const rule = fillText(SHIELD_TEXTS.rule, { n: arena.state.wave.length });
  return [uiArenaRule(rule), uiArenaCoach(arena.coach), uiShieldField(app, uiShieldTime()), uiShieldDock(app)];
}
function uiShieldRender(app) {
  const arena = uiShieldArena(app);
  if (!arena) return uiEl('section', { className: 'screen rig-screen', attrs: { 'data-screen': 'rig' } });
  const view = { hearts: arena.state.integrity, score: arena.state.score, title: arena.rig.title, assist: app.game.ext.assist };
  const body = arena.view === 'card' ? [uiShieldCard(app, arena.result)] : uiShieldPlayView(app);
  return uiEl('section', {
    className: 'screen rig-screen arena-screen shield-screen' + (arena.view === 'card' ? ' is-card' : ''),
    attrs: { 'data-screen': 'rig', 'data-rig': SHIELD_RIG_ID, tabindex: '-1', 'data-focus-key': ARENA_FOCUS_KEY },
    children: [uiArenaHeader(app, view), uiArenaToastNode(app), ...body],
  });
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
  if (uiArenaLeaveTooSoon(app)) return;
  uiShieldPressCancel();
  uiArenaLeave(app, null);
}
function uiShieldReplay(app) {
  const arena = app.rig.arena;
  if (arena.view !== 'card') return;
  app.rig.arena = uiShieldCreate(app, arena.rig, { now: uiShieldTime(), lastIndex: arena.poolIndex });
  app.lastFocusKey = BREACH_ACTION;
  app.pendingAnnounce = uiShieldSpoken(app.rig.arena) + ' ' + app.rig.arena.coach;
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
  if (event.key === 'Escape') return BACK_ACTION;
  if (app.rig.arena.view !== 'play') return null;
  return KEY_VERBS[String(event.key).toLowerCase()] ?? null;
}
function uiShieldKeyAction(event, app) {
  if (!uiShieldArena(app)) return null;
  const id = uiShieldKeyId(event, app);
  if (!id) return null;
  event.preventDefault();
  if (event.repeat) return { type: 'handled' };
  return { type: 'action', id };
}


function uiShieldSync(app, active) {
  if (!active || !uiShieldArena(app)) uiShieldPressCancel();
}

function uiRigScreen() {
  return {
    id: 'rig', render: uiShieldRender, focusKey: uiShieldFocusKey, announce: uiShieldAnnounce, keyAction: uiShieldKeyAction,
    applyAction: uiShieldApplyAction, pointerDown: uiShieldPointerDown, pointerUp: uiShieldPointerUp, pointerCancel: uiShieldPointerCancel,
    sync: uiShieldSync, release: uiShieldPressCancel,
  };
}
function uiRigOpen(app, rigId) {
  const rig = rigOf(rigId);
  if (!rig) throw new Error('unknown rig: ' + rigId);
  uiArenaOpen(app, { rigId, create: (opened) => uiShieldCreate(opened, rig, { now: uiShieldTime(), lastIndex: null }) });
}
function uiRigReady() {
  return uiLinkStyles(STYLESHEETS);
}

export { uiRigScreen, uiRigOpen, uiRigReady };

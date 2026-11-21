import { lockName } from '../game/messages.js';
import { roomLock } from '../game/rooms/room-lock.js';
import { uiEl } from './dom.js';
import { uiRouteTo, uiTravelTo } from './grid-travel.js';


const GO_LOCK_ACTION = 'room-go-lock';
const GO_PREFIX = 'GO TO ';

function uiRoomWon(arena) {
  return Boolean(arena) && arena.view === 'card' && Boolean(arena.result) && arena.result.won === true;
}
function uiRoomLockPlan(app) {
  const arena = app.rig && app.rig.arena;
  if (!uiRoomWon(arena)) return null;
  const pair = roomLock(app.rig.rigId, arena.mode);
  const game = app.game;
  const terminal = pair && game.world.terminals[pair.key];
  if (!terminal || game.progress.breached.has(pair.key)) return null;
  const route = uiRouteTo(app, terminal.id);
  return { key: pair.key, name: lockName(pair.key), idea: pair.idea, steps: route ? route.length : null, thingId: terminal.id };
}
function uiStepsText(steps) {
  return steps + (steps === 1 ? ' step' : ' steps');
}
function uiRoomLockActions(plan, actions) {
  if (!plan || plan.steps === null) return actions.map((item) => ({ ...item, kind: 'arena-verb' }));
  const go = { action: GO_LOCK_ACTION, label: GO_PREFIX + plan.name + ' · ' + uiStepsText(plan.steps), kind: 'arena-verb arena-go btn-primary' };
  return [go, ...actions.map((item) => ({ ...item, kind: 'arena-verb arena-minor btn-ghost' }))];
}
function uiRoomLockLine(plan) {
  if (!plan) return null;
  const tail = plan.steps === null ? plan.name + ' is the lock that asks for it. It is not open yet.' : plan.name + ' asks for the same idea.';
  return uiEl('p', { className: 'arena-card-line arena-card-lock', text: plan.idea + ' ' + tail });
}
function uiRoomLockFocus(app) {
  const plan = uiRoomLockPlan(app);
  return plan && plan.steps !== null ? GO_LOCK_ACTION : null;
}
function uiRoomGoLock(app, leave) {
  const plan = uiRoomLockPlan(app);
  if (!plan || plan.steps === null) return;
  leave(app);
  if (app.rig || app.screen !== 'grid') return;
  uiTravelTo(app, 'travel-' + plan.thingId);
}
export { GO_LOCK_ACTION, uiRoomLockPlan, uiRoomLockActions, uiRoomLockLine, uiRoomLockFocus, uiRoomGoLock };

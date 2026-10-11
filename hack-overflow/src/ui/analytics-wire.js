import { analytics } from '../analytics.js';
import * as client from '../analytics-client.js';
import { GAME_EVENT } from '../game/game-events.js';
import { MAP_REV } from '../game/map-rev.js';
import { uiGameBus } from './bus.js';

const RESULT_BY_VERDICT = { ACCEPTED: 'pass', 'WRONG ANSWER': 'fail' };

function uiLockFamily(app, key) {
  const problem = app.game.world.problems[key];
  return problem ? problem.family : '';
}
function uiBreachResult(verdict) {
  return RESULT_BY_VERDICT[verdict] || 'error';
}
function uiAttemptCounter() {
  const counts = new Map();
  return {
    next: (key) => { counts.set(key, (counts.get(key) || 0) + 1); return counts.get(key); },
    of: (key) => counts.get(key) || 0,
  };
}
function uiBreachHandlers(app) {
  const attempts = uiAttemptCounter();
  return {
    [GAME_EVENT.JACK_IN]: (event) => analytics.track('lock_open', { lock: event.key, hall: uiLockFamily(app, event.key) }),
    [GAME_EVENT.BREACH]: (event) => {
      const key = app.game.breach ? app.game.breach.key : '';
      analytics.track('breach_attempt', { lock: key, result: uiBreachResult(event.verdict), attempt_no: attempts.next(key) });
    },
    [GAME_EVENT.ACCEPTED]: (event) => analytics.track('lock_cleared', { lock: event.key, attempts: attempts.of(event.key) }),
  };
}
function uiProgressHandlers() {
  return {
    [GAME_EVENT.LEVEL_UP]: (event) => analytics.track('level_up', { level: event.after }),
    [GAME_EVENT.RIG_ENTER]: (event) => analytics.track('room_enter', { room: event.rigId }),
  };
}
function uiSubscribe(app) {
  const handlers = { ...uiBreachHandlers(app), ...uiProgressHandlers() };
  for (const [type, handler] of Object.entries(handlers)) uiGameBus().on(type, handler);
}
function uiBootInfo(app, returning) {
  return { returning, locks_cleared: app.game.progress.breached.size, map_rev: MAP_REV };
}
function uiStartAnalytics(app, returning) {
  if (analytics.start(uiBootInfo(app, returning), client)) uiSubscribe(app);
}

export { uiStartAnalytics };

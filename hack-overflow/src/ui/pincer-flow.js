import { GAME_EVENT } from '../game/game-events.js';
import { PINCER_BUSY_MS } from '../game/rooms/data/pincer-w1.js';
import { PINCER_TEXTS, fillText } from '../game/rooms/data/pincer-texts.js';
import { applyPincer, createPincer, pincerMoves, pincerStars, pincerSum } from '../game/rooms/pincer.js';
import { buildPool, pickStream } from '../game/rooms/pincer-stream.js';
import { uiArenaRecordWin } from './arena-reward.js';
import { uiArenaClearToast, uiArenaToast } from './arena-shell.js';
import { uiEmit } from './bus.js';


const PINCER_RIG_ID = 'pincer';
const NOPE_MS = 240;
const MAX_STARS = 3;
const NO_TIME = -Infinity;
const LOW_FLOOR_TILES = 3;
const PLANK_HINT_STEPS = 2;
const PLACE_KINDS = new Set(['left', 'right', 'plank']);
const SAFE_KINDS = new Set(['left-wrong', 'right-wrong']);
const BAD_KINDS = new Set(['left-wrong', 'right-wrong', 'drop', 'miss', 'floor', 'charges']);

function uiPincerDefaultNow() {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}
let uiPincerClock = uiPincerDefaultNow;
function uiPincerSetClock(now) {
  uiPincerClock = now || uiPincerDefaultNow;
}
function uiPincerNow() {
  return uiPincerClock();
}

function uiPincerCreate(app, rig, start) {
  const picked = pickStream(buildPool(), start.lastIndex, Math.random);
  const arena = {
    rig, levelId: rig.levels[0], poolIndex: picked.index, state: createPincer(picked.stream), view: 'play', result: null, coach: '',
    busyUntil: NO_TIME, nopeAt: NO_TIME, slide: null,
  };
  arena.coach = uiPincerCoachText(arena);
  app.pendingAnnounce = null;
  return arena;
}


function uiPincerValues(state) {
  const { pillars, target, plank } = state.stream;
  return { sum: pincerSum(state), t: target, floor: state.floor, v: pillars[plank], a: pillars[state.l], b: pillars[state.r] };
}
const COACH_LINES = [
  { when: (state) => state.last !== null && SAFE_KINDS.has(state.last.kind), key: 'dropHint' },
  { when: (state) => pincerSum(state) === state.stream.target, key: 'equal' },
  { when: (state) => state.steps === 0, key: 'start' },
  { when: (state) => state.floor <= LOW_FLOOR_TILES, key: 'floorLow' },
  { when: (state) => state.steps === PLANK_HINT_STEPS && pincerMoves(state).includes('plank'), key: 'plank' },
  { when: (state) => pincerSum(state) < state.stream.target, key: 'low' },
  { when: () => true, key: 'high' },
];
function uiPincerCoachText(arena) {
  const state = arena.state;
  if (state.status !== 'running') return '';
  const line = COACH_LINES.find((item) => item.when(state));
  return fillText(PINCER_TEXTS.coach[line.key], uiPincerValues(state));
}
function uiPincerSpoken(arena) {
  const values = uiPincerValues(arena.state);
  return 'Sum ' + values.sum + ', target ' + values.t + '.';
}


function uiPincerPlayable(app) {
  const arena = app.rig && app.rig.arena;
  if (!arena || arena.view !== 'play') return false;
  return arena.state.status === 'running' && !app.story && !app.menuOpen;
}
function uiPincerCommit(app, moveId, now) {
  if (!uiPincerPlayable(app)) return false;
  const arena = app.rig.arena;
  if (now < arena.busyUntil) {
    arena.nopeAt = now;
    return false;
  }
  const next = applyPincer(arena.state, moveId);
  if (next === arena.state) return false;
  arena.state = next;
  arena.busyUntil = now + PINCER_BUSY_MS;
  uiPincerAfterMove(app);
  return true;
}
function uiPincerNoping(arena, now) {
  return now - arena.nopeAt < NOPE_MS;
}


function uiPincerCue(state) {
  const last = state.last;
  if (last.kind === 'pair') return uiEmit(GAME_EVENT.RIG_GOOD, { rigId: PINCER_RIG_ID, chain: state.pairs });
  if (PLACE_KINDS.has(last.kind)) return uiEmit(GAME_EVENT.RIG_PLACE, { rigId: PINCER_RIG_ID, verb: last.kind });
  return uiEmit(GAME_EVENT.RIG_BAD, { rigId: PINCER_RIG_ID, reason: last.kind });
}
function uiPincerToast(app, last) {
  if (BAD_KINDS.has(last.kind)) uiArenaToast(app, last.why, 'bad');
  else if (last.kind === 'plank') uiArenaToast(app, last.why, 'good');
}
function uiPincerAfterMove(app) {
  const arena = app.rig.arena;
  const last = arena.state.last;
  uiPincerCue(arena.state);
  uiPincerToast(app, last);
  if (arena.state.status !== 'running') return uiPincerFinish(app);
  arena.coach = uiPincerCoachText(arena);
  app.pendingAnnounce = last.why ? null : uiPincerSpoken(arena);
  return null;
}


function uiPincerWin(app, arena) {
  const stars = pincerStars(arena.state);
  const reward = uiArenaRecordWin(app, { rig: arena.rig, levelId: arena.levelId, stars });
  uiEmit(GAME_EVENT.RIG_CLEAR, { rigId: PINCER_RIG_ID, levelId: arena.levelId, stars });
  arena.result = { won: true, stars, firstClear: reward.bestBefore === 0 };
}
function uiPincerLose(arena) {
  const { state } = arena;
  uiEmit(GAME_EVENT.RIG_FAIL, { rigId: PINCER_RIG_ID, levelId: arena.levelId, reason: state.fail });
  arena.result = { won: false, stars: 0, firstClear: false, why: state.last ? state.last.why : '', fail: state.fail };
}
function uiPincerEndSpoken(result) {
  if (!result.won) return PINCER_TEXTS.card.failTitle + '. ' + (result.why || '');
  return PINCER_TEXTS.card.title + '. ' + result.stars + ' of ' + MAX_STARS + ' stars.';
}
function uiPincerFinish(app) {
  const arena = app.rig.arena;
  arena.view = 'card';
  arena.coach = '';
  arena.slide = null;
  uiArenaClearToast(app.rig);
  if (arena.state.status === 'won') uiPincerWin(app, arena);
  else uiPincerLose(arena);
  app.lastFocusKey = 'pincer-replay';
  app.pendingAnnounce = uiPincerEndSpoken(arena.result);
  return null;
}

export {
  PINCER_RIG_ID, uiPincerCreate, uiPincerPlayable, uiPincerCommit, uiPincerNoping, uiPincerCoachText, uiPincerSpoken, uiPincerNow,
  uiPincerSetClock,
};

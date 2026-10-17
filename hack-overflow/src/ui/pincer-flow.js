import { GAME_EVENT } from '../game/game-events.js';
import { MOST_WATER_ID } from '../game/quest/third-wave.js';
import { PINCER_BUSY_MS } from '../game/rooms/data/pincer-w1.js';
import { PINCER_TEXTS } from '../game/rooms/data/pincer-texts.js';
import { applyPincer, pincerStars, pincerWhyNot } from '../game/rooms/pincer.js';
import { uiArenaClearToast, uiArenaToast } from './arena-shell.js';
import { uiEmit } from './bus.js';
import { uiPincerCoachText, uiPincerSpoken } from './pincer-coach.js';
import { uiPincerCardTitle, uiPincerFirstMode, uiPincerRunFor } from './pincer-modes.js';
import { uiPincerRecordBest } from './pincer-record.js';
import { uiRoomCardView, uiRoomPlayable, uiRoomWin } from './room-flow.js';
import { uiShotSelectors } from './shot-fx.js';


const PINCER_RIG_ID = 'pincer';
const NOPE_MS = 240;
const SETTLE_MS = 400;
const SETTLE_CLASS = 'is-settle';
const SORT_TOAST_MS = 1200;
const MAX_STARS = 3;
const NO_TIME = -Infinity;
const PLACE_KINDS = new Set(['left', 'right', 'plank', 'sort', 'bank']);
const GOOD_KINDS = new Set(['pair']);
const BAD_KINDS = new Set(['left-wrong', 'right-wrong', 'drop', 'miss', 'floor', 'charges', 'best']);
const CLEAR_LEVELS = { w1: 'pincer-1', w2: 'pincer-2', w3: 'pincer-3' };
const QUEST_TAKEN = 2;
const QUEST_DONE = 3;
const POINTER_MOVES = new Set(['l', 'r']);

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

function uiWaterStage(app) {
  const quests = app.game.ext.quests;
  return quests && Object.hasOwn(quests, MOST_WATER_ID) ? quests[MOST_WATER_ID] : 0;
}
function uiPincerAsks(app, mode) {
  return mode === 'w3' && uiWaterStage(app) < QUEST_TAKEN;
}
function uiPincerQuest(arena, send) {
  arena.quest = Promise.resolve(arena.quest).then(() => import('./pincer-quest.js')).then(send).catch(() => null);
}
function uiPincerQuestMove(app, arena, moveId) {
  if (arena.mode !== 'w3' || !POINTER_MOVES.has(moveId)) return;
  const first = arena.ask;
  arena.ask = false;
  if (first) arena.counting = true;
  else if (!arena.counting && uiWaterStage(app) !== QUEST_TAKEN) return;
  uiPincerQuest(arena, (quest) => quest.uiWaterMove(app, arena, first));
}
function uiPincerQuestWin(app, arena) {
  if (arena.mode === 'w3' && uiWaterStage(app) !== QUEST_DONE) uiPincerQuest(arena, (quest) => quest.uiWaterWin(app, arena));
}

function uiPincerCreate(app, rig, start) {
  const mode = start.mode || uiPincerFirstMode(app);
  const run = uiPincerRunFor({ mode, lastIndex: start.lastIndex });
  const arena = {
    rig, mode, levelId: rig.levels[0], poolIndex: run.index, state: run.state, view: 'play', result: null, coach: '',
    busyUntil: NO_TIME, nopeAt: NO_TIME, settleAt: NO_TIME, slide: null, ask: uiPincerAsks(app, mode),
  };
  arena.coach = uiPincerCoachText(arena);
  app.pendingAnnounce = null;
  return arena;
}


function uiPincerPlayable(app) {
  return uiRoomPlayable(app);
}
function uiPincerRefuse(app, moveId, now) {
  const arena = app.rig.arena;
  const why = pincerWhyNot(arena.state, moveId);
  if (!why) return false;
  arena.nopeAt = now;
  uiArenaToast(app, why, 'bad');
  return false;
}
function uiPincerShotFx(state) {
  uiShotSelectors('.pincer-btn-fire', ['.pincer-cannon-l', '.pincer-cannon-r'], { hit: GOOD_KINDS.has(state.last.kind), kill: state.status === 'won', heavy: false });
}
function uiPincerCommit(app, moveId, now) {
  if (!uiPincerPlayable(app)) return false;
  const arena = app.rig.arena;
  if (now < arena.busyUntil) {
    arena.nopeAt = now;
    return false;
  }
  const next = applyPincer(arena.state, moveId);
  if (next === arena.state) return uiPincerRefuse(app, moveId, now);
  arena.state = next;
  arena.busyUntil = now + PINCER_BUSY_MS;
  uiPincerQuestMove(app, arena, moveId);
  if (moveId === 'fire') uiPincerShotFx(arena.state);
  if (moveId === 'sort') uiPincerSettle(arena, now);
  uiPincerAfterMove(app);
  return true;
}
function uiPincerNoping(arena, now) {
  return now - arena.nopeAt < NOPE_MS;
}

function uiPincerSettling(arena, now) {
  return now - arena.settleAt < SETTLE_MS;
}
function uiPincerUnsettle() {
  const rails = typeof document !== 'undefined' && document.querySelectorAll ? document.querySelectorAll('.pincer-rail.' + SETTLE_CLASS) : [];
  rails.forEach((rail) => rail.classList.remove(SETTLE_CLASS));
}
function uiPincerSettle(arena, now) {
  arena.settleAt = now;
  setTimeout(uiPincerUnsettle, SETTLE_MS);
}


function uiPincerCue(state) {
  const last = state.last;
  if (GOOD_KINDS.has(last.kind)) return uiEmit(GAME_EVENT.RIG_GOOD, { rigId: PINCER_RIG_ID, chain: state.pairs });
  if (PLACE_KINDS.has(last.kind)) return uiEmit(GAME_EVENT.RIG_PLACE, { rigId: PINCER_RIG_ID, verb: last.kind });
  return uiEmit(GAME_EVENT.RIG_BAD, { rigId: PINCER_RIG_ID, reason: last.kind });
}
function uiPincerBriefToast(app, text) {
  uiArenaToast(app, text, 'info');
  const { rig } = app;
  window.clearTimeout(rig.toastTimer);
  rig.toastTimer = window.setTimeout(() => {
    uiArenaClearToast(rig);
    if (rig.toastNode) Object.assign(rig.toastNode, { className: 'arena-toast arena-toast-off', textContent: '' });
  }, SORT_TOAST_MS);
}
function uiPincerToast(app, last) {
  if (BAD_KINDS.has(last.kind)) uiArenaToast(app, last.why, 'bad');
  else if (last.kind === 'plank') uiArenaToast(app, last.why, 'good');
  else if (last.kind === 'sort') uiPincerBriefToast(app, last.why);
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
  uiPincerQuestWin(app, arena);
  return uiRoomWin(app, arena, { rigId: PINCER_RIG_ID, clearLevel: CLEAR_LEVELS[arena.mode], stars }).result;
}
function uiPincerLose(arena) {
  const { state } = arena;
  uiEmit(GAME_EVENT.RIG_FAIL, { rigId: PINCER_RIG_ID, levelId: CLEAR_LEVELS[arena.mode], reason: state.fail });
  return { won: false, stars: 0, firstClear: false, why: state.last ? state.last.why : '', fail: state.fail };
}
function uiPincerEndSpoken(result) {
  if (!result.won) return PINCER_TEXTS.card.failTitle + '. ' + (result.why || '');
  return uiPincerCardTitle(result.mode) + '. ' + result.stars + ' of ' + MAX_STARS + ' stars.';
}
function uiPincerFinish(app) {
  const arena = uiRoomCardView(app);
  arena.slide = null;
  const result = arena.state.status === 'won' ? uiPincerWin(app, arena) : uiPincerLose(arena);
  arena.result = { ...result, mode: arena.mode, ...uiPincerRecordBest(app, arena) };
  app.lastFocusKey = 'pincer-replay';
  app.pendingAnnounce = uiPincerEndSpoken(arena.result);
  return null;
}

export {
  PINCER_RIG_ID, QUEST_TAKEN, QUEST_DONE, uiPincerCreate, uiPincerPlayable, uiPincerCommit, uiPincerNoping, uiPincerSettling, uiPincerCoachText, uiPincerSpoken, uiPincerNow,
  uiPincerSetClock,
};

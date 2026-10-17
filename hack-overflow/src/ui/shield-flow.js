import { GAME_EVENT } from '../game/game-events.js';
import { NEXT_TALLER_ID } from '../game/quest/third-wave.js';
import { BUSY_MS, END_GLYPH } from '../game/rooms/data/shield-wave1.js';
import { SHIELD_TEXTS } from '../game/rooms/data/shield-texts.js';
import { applyShield, bruteReads, glyphOf, shieldMoves, shieldPace, shieldPar, shieldStars } from '../game/rooms/shield.js';
import { autoMove, shieldCallPar } from '../game/rooms/shield-auto.js';
import { uiArenaToast } from './arena-shell.js';
import { uiEmit } from './bus.js';
import { uiPrefersReducedMotion } from './dom.js';
import { uiRoomCardView, uiRoomPlayable, uiRoomSetAssist, uiRoomWin } from './room-flow.js';
import { uiShieldCoachText, uiShieldSpoken, uiShieldTop } from './shield-coach.js';
import { uiShieldFirstMode, uiShieldRunFor } from './shield-modes.js';
import { uiShieldRecordBest } from './shield-record.js';


const SHIELD_RIG_ID = 'shield';
const CLEAR_LEVELS = { w1: 'shield-1', w2: 'shield-2', w3: 'shield-3' };
const NOPE_MS = 240;
const NO_TIME = -Infinity;
const MAX_STARS = 3;
const VERB_MOVES = { push: 'push', pop: 'pop', breach: 'breach' };
const PLATE_VERBS = new Set(['push', 'pop']);
const QUEST_TAKEN = 2;

function uiTallerStage(app) {
  const quests = app.game.ext.quests;
  return quests && Object.hasOwn(quests, NEXT_TALLER_ID) ? quests[NEXT_TALLER_ID] : 0;
}

function uiShieldDefaultTime() {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}
let uiShieldClock = uiShieldDefaultTime;
function uiShieldSetClock(now) {
  uiShieldClock = now || uiShieldDefaultTime;
}
function uiShieldTime() {
  return uiShieldClock();
}
function uiShieldCreate(app, rig, start) {
  const mode = start.mode || uiShieldFirstMode(app);
  const run = uiShieldRunFor({ mode, assist: app.game.ext.assist === true, lastIndex: start.lastIndex });
  const arena = {
    rig, mode, levelId: rig.levels[0], poolIndex: run.index, state: run.state,
    startedAt: null, busyUntil: NO_TIME, seen: {}, coach: '', view: 'play', result: null, hold: null,
    fx: { nopeAt: NO_TIME }, reduced: uiPrefersReducedMotion(), ask: mode === 'w3' && uiTallerStage(app) < QUEST_TAKEN,
    manual: app.autoManual === true, calls: 0, autoMoves: 0, usedManual: app.autoManual === true, lastAuto: false, auto: null,
  };
  arena.coach = uiShieldCoachText(arena);
  app.pendingAnnounce = null;
  return arena;
}


function uiShieldPlayable(app) {
  return uiRoomPlayable(app);
}
function uiShieldMoveFor(state, verb) {
  if (verb === 'breach') return VERB_MOVES.breach;
  return glyphOf(state) === END_GLYPH && PLATE_VERBS.has(verb) ? 'clear' : VERB_MOVES[verb];
}
function uiShieldCtx(arena, now) {
  const elapsed = arena.startedAt === null ? 0 : now - arena.startedAt;
  return { pace: shieldPace(elapsed, arena.state) };
}
function uiShieldWalking(arena) {
  return arena.auto !== null && arena.auto.run.snapshot().state === 'running';
}
function uiShieldCommit(app, verb, now) {
  if (!uiShieldPlayable(app) || !Object.hasOwn(VERB_MOVES, verb)) return false;
  const arena = app.rig.arena;
  const move = uiShieldMoveFor(arena.state, verb);
  if (!shieldMoves(arena.state).includes(move)) return false;
  if (uiShieldWalking(arena)) {
    arena.fx.nopeAt = now;
    return false;
  }
  if (arena.manual && now < arena.busyUntil) {
    arena.fx.nopeAt = now;
    uiArenaToast(app, SHIELD_TEXTS.toast.busy, 'info');
    return false;
  }
  uiShieldPlay(arena, move, now);
  uiShieldAfterMove(app);
  if (arena.auto) arena.auto.run.go();
  return true;
}
function uiShieldPlay(arena, move, now) {
  if (arena.startedAt === null) arena.startedAt = now;
  if (arena.manual || autoMove(arena.state) === '') arena.calls += 1;
  else arena.autoMoves += 1;
  arena.state = applyShield(arena.state, move, uiShieldCtx(arena, now));
  arena.lastAuto = false;
  arena.deflected = arena.state.last.kind === 'breach';
  if (arena.manual) arena.busyUntil = now + BUSY_MS;
}
function uiShieldAutoStep(app, now) {
  if (!uiShieldPlayable(app)) return false;
  const arena = app.rig.arena;
  const move = autoMove(arena.state);
  if (!move) return false;
  arena.state = applyShield(arena.state, move, uiShieldCtx(arena, now));
  arena.autoMoves += 1;
  arena.lastAuto = true;
  uiShieldAfterMove(app);
  return true;
}
function uiShieldForced(app) {
  return uiShieldPlayable(app) && autoMove(app.rig.arena.state) !== '';
}
function uiShieldNoping(arena, now) {
  return now - arena.fx.nopeAt < NOPE_MS;
}


function uiShieldCue(state) {
  const last = state.last;
  if (last.kind === 'wrong') return uiEmit(GAME_EVENT.RIG_BAD, { rigId: SHIELD_RIG_ID, reason: last.reason });
  if (last.kind === 'push' && !last.blocked) return uiEmit(GAME_EVENT.RIG_PLACE, { rigId: SHIELD_RIG_ID, verb: 'store' });
  return uiEmit(GAME_EVENT.RIG_GOOD, { rigId: SHIELD_RIG_ID, chain: state.combo });
}
function uiShieldQuest(app, arena) {
  const { last, status } = arena.state;
  arena.questWork = (arena.questWork || Promise.resolve())
    .then(() => import('./shield-quest.js'))
    .then((quest) => quest.uiTowersQuest(app, arena, { last, won: status === 'won' }))
    .catch(() => null); 
}
function uiShieldQuestHears(arena) {
  return !arena.lastAuto || arena.ask !== true || arena.questWork !== undefined;
}
function uiShieldAfterMove(app) {
  const arena = app.rig.arena;
  const state = arena.state;
  if (state.spec.towers && uiShieldQuestHears(arena)) uiShieldQuest(app, arena);
  uiShieldCue(state);
  if (state.last.kind === 'wrong') uiArenaToast(app, state.last.why, 'bad');
  if (state.status !== 'running') return uiShieldFinish(app);
  if (arena.auto) return null;
  arena.coach = uiShieldCoachText(arena);
  app.pendingAnnounce = uiShieldSpoken(arena);
  return null;
}


function uiShieldRun(arena) {
  const { wave, spec } = arena.state;
  const machine = arena.usedManual ? 0 : arena.autoMoves;
  return { presses: arena.calls, machine, par: machine > 0 ? shieldCallPar(wave, spec) : shieldPar(wave, spec) };
}

function uiShieldWin(app, arena) {
  const stars = shieldStars(arena.state);
  return uiRoomWin(app, arena, { rigId: SHIELD_RIG_ID, clearLevel: CLEAR_LEVELS[arena.mode], stars }).result;
}
function uiShieldLoss(arena) {
  uiEmit(GAME_EVENT.RIG_FAIL, { rigId: SHIELD_RIG_ID, levelId: arena.levelId, reason: 'integrity' });
  return { won: false, stars: 0, firstClear: false, why: arena.state.last ? arena.state.last.why : '' };
}
function uiShieldEndSpoken(result) {
  if (!result.won) return SHIELD_TEXTS.card.failTitle + '. ' + (result.why || '');
  return 'Wave clear. The shield holds. ' + result.stars + ' of ' + MAX_STARS + ' stars.';
}
function uiShieldFinish(app) {
  const arena = uiRoomCardView(app);
  const result = arena.state.status === 'won' ? uiShieldWin(app, arena) : uiShieldLoss(arena);
  arena.result = { ...result, mode: arena.mode, ...uiShieldRun(arena), ...uiShieldRecordBest(app, arena), ...(arena.find ? { find: arena.find } : {}) };
  app.lastFocusKey = 'shield-replay';
  app.pendingAnnounce = uiShieldEndSpoken(arena.result);
  return null;
}


function uiShieldSetAssist(app, on) {
  uiRoomSetAssist(app, on);
}
function uiShieldBrute(arena) {
  return bruteReads(arena.state.wave);
}

export {
  SHIELD_RIG_ID, uiShieldSetClock, uiShieldTime, uiShieldCreate, uiShieldCoachText, uiShieldSpoken, uiShieldPlayable, uiShieldCommit, uiShieldNoping, uiShieldSetAssist,
  uiShieldBrute, uiShieldTop, uiShieldAutoStep, uiShieldForced,
};

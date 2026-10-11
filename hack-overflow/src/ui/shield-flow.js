import { GAME_EVENT } from '../game/game-events.js';
import { withAssist } from '../game/save-ext.js';
import { BUSY_MS, END_GLYPH, SHIELD_W1 } from '../game/rooms/data/shield-wave1.js';
import { SHIELD_TEXTS } from '../game/rooms/data/shield-texts.js';
import { fillText } from '../game/rooms/data/turret-texts.js';
import { answerFor, applyShield, bruteReads, createShield, glyphOf, isOpener, paceAt, shieldStars } from '../game/rooms/shield.js';
import { buildPool, pickWave } from '../game/rooms/shield-stream.js';
import { uiArenaPayRank, uiArenaRecordWin } from './arena-reward.js';
import { uiArenaClearToast, uiArenaToast } from './arena-shell.js';
import { uiEmit } from './bus.js';
import { uiPrefersReducedMotion } from './dom.js';
import { uiCommitExt } from './ext-storage.js';


const SHIELD_RIG_ID = 'shield';
const NOPE_MS = 240;
const NO_TIME = -Infinity;
const MAX_STARS = 3;
const VERB_MOVES = { push: 'push', pop: 'pop', breach: 'breach' };
const PLATE_VERBS = new Set(['push', 'pop']);
const RIGHT_KINDS = new Set(['push', 'pop', 'breach', 'clear']);

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
  const picked = pickWave(buildPool(), start.lastIndex, Math.random);
  const arena = {
    rig, levelId: rig.levels[0], poolIndex: picked.index, state: createShield(picked.wave, { assist: app.game.ext.assist === true }),
    startedAt: null, busyUntil: NO_TIME, seen: {}, coach: '', view: 'play', result: null, hold: null,
    fx: { nopeAt: NO_TIME }, reduced: uiPrefersReducedMotion(),
  };
  arena.coach = uiShieldCoachText(arena);
  app.pendingAnnounce = null;
  return arena;
}


function uiShieldTop(state) {
  return state.stack[state.stack.length - 1] ?? '';
}
function uiShieldValues(state) {
  return {
    g: glyphOf(state), top: uiShieldTop(state), depth: state.stack.length, o: state.vi + 1, n: state.wave.length, combo: state.combo,
  };
}
const TEACH_LINES = [
  { id: 'mixed', when: (state) => state.gi === 0 && state.vi === SHIELD_W1.plainVolleys, text: SHIELD_TEXTS.coach.mixed },
  { id: 'end', when: (state) => glyphOf(state) === END_GLYPH, text: SHIELD_TEXTS.coach.end },
  { id: 'open', when: (state) => isOpener(glyphOf(state)), text: SHIELD_TEXTS.coach.open },
  { id: 'close', when: (state) => answerFor(state) === 'pop', text: SHIELD_TEXTS.coach.close },
  { id: 'breach', when: (state) => answerFor(state) === 'breach' && state.stack.length > 0, text: SHIELD_TEXTS.coach.breach },
  { id: 'stray', when: (state) => answerFor(state) === 'breach', text: SHIELD_TEXTS.coach.stray },
];
function uiShieldTeach(arena) {
  const state = arena.state;
  const line = TEACH_LINES.find((item) => !arena.seen[item.id] && item.when(state));
  if (!line) return '';
  arena.seen[line.id] = true;
  return fillText(line.text, uiShieldValues(state));
}
function uiShieldOutcomeLine(state) {
  const last = state.last;
  if (!last || !RIGHT_KINDS.has(last.kind)) return '';
  const values = Object.assign(uiShieldValues(state), { g: last.glyph, depth: last.depth, combo: last.combo ?? state.combo });
  if (last.kind === 'breach') return SHIELD_TEXTS.coach.deflect;
  return fillText(SHIELD_TEXTS.coach[last.kind], values);
}
function uiShieldCoachText(arena) {
  const state = arena.state;
  if (state.status !== 'running') return '';
  const teach = uiShieldTeach(arena);
  if (teach) return teach;
  return uiShieldOutcomeLine(state) || fillText(SHIELD_TEXTS.coach.plain, uiShieldValues(state));
}
function uiShieldSpoken(arena) {
  const state = arena.state;
  if (state.status !== 'running') return '';
  return fillText(SHIELD_TEXTS.coach.announce, uiShieldValues(state));
}


function uiShieldPlayable(app) {
  const arena = app.rig && app.rig.arena;
  if (!arena || arena.view !== 'play') return false;
  return arena.state.status === 'running' && !app.story && !app.menuOpen;
}
function uiShieldMoveFor(state, verb) {
  if (verb === 'breach') return VERB_MOVES.breach;
  return glyphOf(state) === END_GLYPH && PLATE_VERBS.has(verb) ? 'clear' : VERB_MOVES[verb];
}
function uiShieldCtx(arena, now) {
  const state = arena.state;
  const elapsed = arena.startedAt === null ? 0 : now - arena.startedAt;
  return { pace: paceAt(elapsed, state.wave.length, state.assist) };
}
function uiShieldCommit(app, verb, now) {
  if (!uiShieldPlayable(app) || !Object.hasOwn(VERB_MOVES, verb)) return false;
  const arena = app.rig.arena;
  if (now < arena.busyUntil) {
    arena.fx.nopeAt = now;
    return false;
  }
  if (arena.startedAt === null) arena.startedAt = now;
  arena.state = applyShield(arena.state, uiShieldMoveFor(arena.state, verb), uiShieldCtx(arena, now));
  arena.busyUntil = now + BUSY_MS;
  uiShieldAfterMove(app);
  return true;
}
function uiShieldNoping(arena, now) {
  return now - arena.fx.nopeAt < NOPE_MS;
}


function uiShieldCue(state) {
  const last = state.last;
  if (last.kind === 'wrong') return uiEmit(GAME_EVENT.RIG_BAD, { rigId: SHIELD_RIG_ID, reason: last.reason });
  if (last.kind === 'push') return uiEmit(GAME_EVENT.RIG_PLACE, { rigId: SHIELD_RIG_ID, verb: 'store' });
  return uiEmit(GAME_EVENT.RIG_GOOD, { rigId: SHIELD_RIG_ID, chain: state.combo });
}
function uiShieldAfterMove(app) {
  const arena = app.rig.arena;
  const state = arena.state;
  uiShieldCue(state);
  if (state.last.kind === 'wrong') uiArenaToast(app, state.last.why, 'bad');
  if (state.status !== 'running') return uiShieldFinish(app);
  arena.coach = uiShieldCoachText(arena);
  app.pendingAnnounce = uiShieldSpoken(arena);
  return null;
}


function uiShieldWin(app, arena) {
  const stars = shieldStars(arena.state);
  const reward = uiArenaRecordWin(app, { rig: arena.rig, levelId: arena.levelId, stars });
  uiArenaPayRank(app, { rig: arena.rig, stars }, reward);
  uiEmit(GAME_EVENT.RIG_CLEAR, { rigId: SHIELD_RIG_ID, levelId: arena.levelId, stars });
  arena.result = { won: true, stars, firstClear: reward.bestBefore === 0 };
}
function uiShieldEndSpoken(result) {
  if (!result.won) return SHIELD_TEXTS.card.failTitle + '. ' + (result.why || '');
  return 'Wave clear. The shield holds. ' + result.stars + ' of ' + MAX_STARS + ' stars.';
}
function uiShieldFinish(app) {
  const arena = app.rig.arena;
  arena.view = 'card';
  arena.coach = '';
  uiArenaClearToast(app.rig);
  if (arena.state.status === 'won') uiShieldWin(app, arena);
  else {
    uiEmit(GAME_EVENT.RIG_FAIL, { rigId: SHIELD_RIG_ID, levelId: arena.levelId, reason: 'integrity' });
    arena.result = { won: false, stars: 0, firstClear: false, why: arena.state.last ? arena.state.last.why : '' };
  }
  app.lastFocusKey = 'shield-replay';
  app.pendingAnnounce = uiShieldEndSpoken(arena.result);
  return null;
}


function uiShieldSetAssist(app, on) {
  uiCommitExt(app, withAssist(app.game.ext, on));
  const arena = app.rig && app.rig.arena;
  if (!arena) return;
  arena.state = Object.assign({}, arena.state, { assist: on });
}
function uiShieldBrute(arena) {
  return bruteReads(arena.state.wave);
}

export {
  SHIELD_RIG_ID, uiShieldSetClock, uiShieldTime, uiShieldCreate, uiShieldCoachText, uiShieldSpoken, uiShieldPlayable, uiShieldCommit, uiShieldNoping, uiShieldSetAssist,
  uiShieldBrute, uiShieldTop,
};

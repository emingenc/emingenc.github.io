import { GAME_EVENT } from '../game/game-events.js';
import { NET_BUSY_MS, NET_SCORE } from '../game/rooms/data/net-waves.js';
import { NET_TEXTS, fillText } from '../game/rooms/data/net-texts.js';
import { applyNet, bruteReads, netBest, netMoves, netPar, netPeek, netStars, netSum, netWouldTear } from '../game/rooms/net.js';
import { uiArenaPayRank, uiArenaRecordWin } from './arena-reward.js';
import { uiArenaClearToast, uiArenaToast } from './arena-shell.js';
import { uiEmit } from './bus.js';
import { uiNetOtherModes, uiNetRunFor } from './net-modes.js';


const NET_RIG_ID = 'net';
const NOPE_MS = 240;
const MAX_STARS = 3;
const NO_TIME = -Infinity;
const NOT_SEEN = -1;
const SUM_JUDGE = 'sum';
const JUMP_COACH_SHRINKS = 2;
const TOAST_TONES = { tear: 'bad', 'tear-jump': 'bad', wasted: 'bad', strain: 'info', flick: 'good' };
const BAD_CUES = new Set(['tear', 'tear-jump', 'wasted']);

function uiNetDefaultNow() {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}
let uiNetClock = uiNetDefaultNow;
function uiNetSetClock(now) {
  uiNetClock = now || uiNetDefaultNow;
}
function uiNetNow() {
  return uiNetClock();
}

function uiNetCreate(app, rig, start) {
  const run = uiNetRunFor(app, { mode: start.mode, lastIndex: start.lastIndex });
  const arena = {
    rig, mode: run.mode, levelId: rig.levels[0], poolIndex: run.index, state: run.state, view: 'play', result: null, coach: '',
    busyUntil: NO_TIME, nopeAt: NO_TIME, nope: false, drag: null,
  };
  arena.coach = uiNetCoachText(arena);
  app.pendingAnnounce = null;
  return arena;
}


function uiNetValues(state) {
  const seenAt = state.r > 0 ? state.stream.items.lastIndexOf(netPeek(state), state.r - 1) : NOT_SEEN;
  return {
    x: netPeek(state), at: seenAt, to: seenAt + 1, sum: netSum(state), k: state.stream.k, len: state.r - state.l, best: netBest(state),
    points: NET_SCORE.gold,
  };
}
function uiNetJumpSaves(state, values) {
  return netMoves(state).includes('jump') && values.to - state.l >= JUMP_COACH_SHRINKS;
}
function uiNetGoldTaken(state) {
  return netMoves(state).includes('flick') && state.r - 1 === state.stream.gold && state.last.move === 'extend';
}
const COACH_LINES = [
  { when: (state, values) => netWouldTear(state) && uiNetJumpSaves(state, values), key: 'jump' },
  { when: (state) => netWouldTear(state) && state.rules.judge !== SUM_JUDGE, key: 'dup' },
  { when: (state) => netSum(state) > state.stream.k, key: 'sumHigh' },
  { when: (state) => uiNetGoldTaken(state), key: 'gold' },
  { when: (state) => state.steps === 0 && state.rules.judge !== SUM_JUDGE, key: 'start' },
  { when: (state) => state.rules.judge === SUM_JUDGE, key: 'sumLow' },
  { when: () => true, key: 'fresh' },
];
function uiNetCoachText(arena) {
  const state = arena.state;
  if (state.status !== 'running') return '';
  const values = uiNetValues(state);
  const line = COACH_LINES.find((item) => item.when(state, values));
  return fillText(NET_TEXTS.coach[line.key], values);
}
function uiNetSpoken(arena) {
  return fillText(NET_TEXTS.coach.announce, uiNetValues(arena.state));
}


function uiNetPlayable(app) {
  const arena = app.rig && app.rig.arena;
  if (!arena || arena.view !== 'play') return false;
  return arena.state.status === 'running' && !app.story && !app.menuOpen;
}
function uiNetCommit(app, moveId, now) {
  if (!uiNetPlayable(app)) return false;
  const arena = app.rig.arena;
  if (now < arena.busyUntil) {
    Object.assign(arena, { nopeAt: now, nope: true });
    return false;
  }
  const next = applyNet(arena.state, moveId);
  if (next === arena.state) return false;
  Object.assign(arena, { state: next, busyUntil: now + NET_BUSY_MS, nope: false });
  uiNetAfterMove(app);
  return true;
}
function uiNetNoping(arena, now) {
  return now - arena.nopeAt < NOPE_MS;
}
function uiNetClearNope(arena) {
  arena.nope = false;
}


function uiNetCue(last) {
  if (BAD_CUES.has(last.kind)) return uiEmit(GAME_EVENT.RIG_BAD, { rigId: NET_RIG_ID, reason: last.kind });
  if (last.kind === 'flick') return uiEmit(GAME_EVENT.RIG_GOOD, { rigId: NET_RIG_ID, chain: 1 });
  return uiEmit(GAME_EVENT.RIG_PLACE, { rigId: NET_RIG_ID, verb: last.move });
}
function uiNetAfterMove(app) {
  const arena = app.rig.arena;
  const last = arena.state.last;
  uiNetCue(last);
  if (last.why) uiArenaToast(app, last.why, TOAST_TONES[last.kind] || 'info');
  if (arena.state.status !== 'running') return uiNetFinish(app);
  arena.coach = uiNetCoachText(arena);
  app.pendingAnnounce = last.why ? null : uiNetSpoken(arena);
  return null;
}


function uiNetSummary(arena) {
  const { state } = arena;
  return { mode: arena.mode, steps: state.steps, par: netPar(state.stream, state.rules), bruteReads: bruteReads(state.stream, state.rules) };
}
function uiNetWin(app, arena) {
  const stars = netStars(arena.state);
  const reward = uiArenaRecordWin(app, { rig: arena.rig, levelId: arena.levelId, stars });
  uiArenaPayRank(app, { rig: arena.rig, stars }, reward);
  uiEmit(GAME_EVENT.RIG_CLEAR, { rigId: NET_RIG_ID, levelId: arena.levelId, stars });
  const nextMode = uiNetOtherModes(app, arena.mode)[0];
  arena.result = { won: true, stars, firstClear: reward.bestBefore === 0, nextMode, ...uiNetSummary(arena) };
}
function uiNetLose(arena) {
  const { state } = arena;
  uiEmit(GAME_EVENT.RIG_FAIL, { rigId: NET_RIG_ID, levelId: arena.levelId, reason: state.fail });
  arena.result = { won: false, stars: 0, firstClear: false, why: state.last.why, fail: state.fail, ...uiNetSummary(arena) };
}
function uiNetEndSpoken(result) {
  if (!result.won) return NET_TEXTS.card.failTitle + '. ' + result.why;
  return NET_TEXTS.card.title + '. ' + result.stars + ' of ' + MAX_STARS + ' stars.';
}
function uiNetFinish(app) {
  const arena = app.rig.arena;
  Object.assign(arena, { view: 'card', coach: '', drag: null });
  uiArenaClearToast(app.rig);
  if (arena.state.status === 'won') uiNetWin(app, arena);
  else uiNetLose(arena);
  app.lastFocusKey = 'net-replay';
  app.pendingAnnounce = uiNetEndSpoken(arena.result);
  return null;
}

export {
  NET_RIG_ID, uiNetCreate, uiNetPlayable, uiNetCommit, uiNetNoping, uiNetClearNope, uiNetCoachText, uiNetSpoken, uiNetNow, uiNetSetClock,
};

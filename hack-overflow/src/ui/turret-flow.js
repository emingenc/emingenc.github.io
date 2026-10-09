import { GAME_EVENT } from '../game/game-events.js';
import { withAssist } from '../game/save-ext.js';
import { BRUTE_MS_PER_COMPARE, BUSY_MS, FUSE_MS, TURRET_W1 } from '../game/rooms/data/turret-wave1.js';
import { TURRET_TEXTS, fillText } from '../game/rooms/data/turret-texts.js';
import { applyTurret, bruteCompares, createTurret, keyFor, paceAt, turretStars, turretTarget } from '../game/rooms/turret.js';
import { buildPool, pickStream } from '../game/rooms/turret-stream.js';
import { uiArenaRecordWin } from './arena-reward.js';
import { uiArenaClearToast, uiArenaToast } from './arena-shell.js';
import { uiEmit } from './bus.js';
import { uiPrefersReducedMotion } from './dom.js';
import { uiCommitExt } from './ext-storage.js';
import { uiTurretBannerFocus } from './turret-fuse-banner.js';


const TURRET_RIG_ID = 'turret';
const TRAVEL_MS = 400;
const NOPE_MS = 240;
const ASSIST_BRUTE_PER_STEP = 3;
const MS_PER_S = 1000;
const FIRST_DRONE = 1;
const MAX_STARS = 3;
const SECOND_DRONE = 2;
const NO_TIME = -Infinity;
const GOOD_KINDS = new Set(['pair', 'store', 'tag']);
const BAD_KINDS = new Set(['wrong', 'walk', 'fuse']);

function uiTurretFreshFx() {
  return { ramAt: NO_TIME, ramKind: 'dock', beam: null, pops: [], nopeAt: NO_TIME, shiftAt: NO_TIME, shifted: 0 };
}
function uiTurretCreate(app, rig, start) {
  const picked = pickStream(buildPool(), start.lastIndex, Math.random);
  const arena = {
    rig, levelId: rig.levels[0], poolIndex: picked.index, state: createTurret(picked.stream, { assist: app.game.ext.assist === true }),
    playMs: 0, busyUntil: NO_TIME, picked: 0, travel: {}, fuse: {}, fx: uiTurretFreshFx(), banner: false,
    view: 'play', result: null, swallow: null, coach: '', arrived: [], lastT: 0, reduced: uiPrefersReducedMotion(),
  };
  uiTurretArrivals(arena, start.now);
  app.pendingAnnounce = null;
  return arena;
}


function uiTurretArrivals(arena, now) {
  const fresh = arena.state.bay.filter((drone) => !Object.hasOwn(arena.travel, drone.n));
  fresh.forEach(function (drone) {
    arena.travel[drone.n] = arena.reduced ? 1 : 0;
    arena.fuse[drone.n] = drone.fuseMs;
  });
  if (fresh.length > 0) Object.assign(arena.fx, { shiftAt: now, shifted: fresh.length });
  arena.arrived = fresh;
  if (fresh.length > 0 || arena.picked >= arena.state.bay.length) arena.picked = 0;
  arena.coach = uiTurretCoachText(arena);
  arena.lastT = turretTarget(arena.state);
}
const ARRIVAL_LINES = [
  { when: (arena, lead, values) => arena.lastT > 0 && values.t !== arena.lastT, text: (values) => fillText(TURRET_TEXTS.coach.switched, values) },
  { when: (arena) => arena.arrived.length > 1, text: (values) => fillText(TURRET_TEXTS.coach.two, values) },
  { when: (arena, lead) => lead.n === FIRST_DRONE, text: (values) => fillText(TURRET_TEXTS.coach.first, values) },
  { when: (arena, lead) => lead.n === SECOND_DRONE, text: (values) => fillText(TURRET_TEXTS.coach.second, values) },
  { when: (arena, lead) => lead.n === TURRET_W1.dupAt && uiTurretHeld(arena, lead) > 0, text: (values) => fillText(TURRET_TEXTS.coach.dup, values) },
  { when: (arena, lead) => lead.n === TURRET_W1.rushFrom, text: () => TURRET_TEXTS.coach.rush },
  { when: (arena, lead) => lead.n === TURRET_W1.fuseFrom && !arena.state.assist, text: (values) => fillText(TURRET_TEXTS.coach.fuse, values) },
];
function uiTurretHeld(arena, lead) {
  return arena.state.board[lead.v];
}
function uiTurretArrivalValues(arena, lead) {
  const state = arena.state;
  const second = arena.arrived[1];
  return {
    v: lead.v, t: turretTarget(state), key: keyFor(state, lead), count: uiTurretHeld(arena, lead) + 1,
    first: lead.v, second: second ? second.v : '', sec: FUSE_MS.first / MS_PER_S,
  };
}
function uiTurretArrivalLine(arena) {
  const lead = arena.arrived[0];
  const values = uiTurretArrivalValues(arena, lead);
  const rule = ARRIVAL_LINES.find((item) => item.when(arena, lead, values));
  return rule ? rule.text(values) : '';
}
function uiTurretOutcomeLine(state) {
  const last = state.last;
  if (!last || !GOOD_KINDS.has(last.kind)) return '';
  return fillText(TURRET_TEXTS.coach[last.kind], { key: last.key, v: last.v, t: last.t });
}
function uiTurretCoachText(arena) {
  const state = arena.state;
  if (state.status !== 'running' || state.bay.length === 0) return uiTurretOutcomeLine(state);
  const arrival = arena.arrived.length > 0 ? uiTurretArrivalLine(arena) : '';
  if (arrival) return arrival;
  const outcome = uiTurretOutcomeLine(state);
  return outcome || fillText(TURRET_TEXTS.coach.plain, { v: state.bay[0].v, t: turretTarget(state) });
}
function uiTurretSpoken(arena) {
  const state = arena.state;
  if (state.bay.length === 0) return '';
  const values = state.bay.map((drone) => drone.v).join(' and ');
  return fillText(TURRET_TEXTS.coach.announce, { n: values, t: turretTarget(state) });
}


function uiTurretPlayable(app) {
  const arena = app.rig && app.rig.arena;
  if (!arena || arena.view !== 'play' || arena.banner) return false;
  return arena.state.status === 'running' && !app.story && !app.menuOpen;
}
function uiTurretCtx(arena, drone) {
  const state = arena.state;
  const pace = paceAt(arena.playMs, state.stream.length, state.assist);
  const fuseLeft = drone.fuseMs && !state.assist ? Math.max(0, arena.fuse[drone.n]) / drone.fuseMs : 0;
  return { pace, fuseLeft };
}
function uiTurretBayIndex(moveId) {
  return Number(String(moveId).split(':')[1]);
}
function uiTurretCommit(app, moveId, now) {
  if (!uiTurretPlayable(app)) return false;
  const arena = app.rig.arena;
  if (now < arena.busyUntil) {
    arena.fx.nopeAt = now;
    return false;
  }
  const drone = arena.state.bay[uiTurretBayIndex(moveId)];
  if (!drone) return false;
  const next = applyTurret(arena.state, moveId, uiTurretCtx(arena, drone));
  if (next === arena.state) return false;
  arena.state = next;
  arena.busyUntil = now + BUSY_MS;
  uiTurretAfterMove(app, now);
  return true;
}
function uiTurretNoping(arena, now) {
  return now - arena.fx.nopeAt < NOPE_MS;
}


function uiTurretCue(state) {
  const last = state.last;
  if (last.kind === 'pair') return uiEmit(GAME_EVENT.RIG_GOOD, { rigId: TURRET_RIG_ID, chain: last.combo });
  if (GOOD_KINDS.has(last.kind)) return uiEmit(GAME_EVENT.RIG_PLACE, { rigId: TURRET_RIG_ID, verb: last.kind });
  return uiEmit(GAME_EVENT.RIG_BAD, { rigId: TURRET_RIG_ID, reason: last.ram ? 'ram' : last.kind });
}
function uiTurretMotion(arena, now) {
  const last = arena.state.last;
  if (last.kind === 'pair') arena.fx.beam = { at: now, slot: last.key, bayIndex: last.bay, points: last.points };
  if (last.kind === 'pair' || GOOD_KINDS.has(last.kind)) arena.fx.pops.push({ at: now, text: '+' + last.points, bayIndex: last.bay });
  if (last.damage > 0) Object.assign(arena.fx, { ramAt: now, ramKind: 'hit' });
}
function uiTurretAfterMove(app, now) {
  const arena = app.rig.arena;
  const last = arena.state.last;
  uiTurretCue(arena.state);
  uiTurretMotion(arena, now);
  if (BAD_KINDS.has(last.kind)) uiArenaToast(app, last.kind === 'fuse' ? TURRET_TEXTS.toast.fuseOut : last.why, 'bad');
  if (arena.state.status !== 'running') return uiTurretFinish(app);
  uiTurretArrivals(arena, now);
  app.pendingAnnounce = arena.arrived.length > 0 ? uiTurretSpoken(arena) : null;
  return null;
}


function uiTurretWin(app, arena) {
  const stars = turretStars(arena.state);
  const reward = uiArenaRecordWin(app, { rig: arena.rig, levelId: arena.levelId, stars });
  uiEmit(GAME_EVENT.RIG_CLEAR, { rigId: TURRET_RIG_ID, levelId: arena.levelId, stars });
  arena.result = { won: true, stars, rankGain: reward.rankGain, lookupNew: reward.lookupNew };
  app.rig.outroDue = true;
}
function uiTurretFinish(app) {
  const arena = app.rig.arena;
  arena.view = 'card';
  arena.coach = '';
  uiArenaClearToast(app.rig);
  if (arena.state.status === 'won') uiTurretWin(app, arena);
  else {
    uiEmit(GAME_EVENT.RIG_FAIL, { rigId: TURRET_RIG_ID, levelId: arena.levelId, reason: 'integrity' });
    arena.result = { won: false, stars: 0, rankGain: 0, lookupNew: false, why: arena.state.last ? arena.state.last.why : '' };
  }
  app.lastFocusKey = 'turret-replay';
  app.pendingAnnounce = uiTurretEndSpoken(arena.result);
  return null;
}
function uiTurretEndSpoken(result) {
  if (!result.won) return TURRET_TEXTS.card.failTitle + '. ' + (result.why || '');
  const lookup = result.lookupNew ? ' LOOKUP acquired.' : '';
  return 'Wave clear. The way is open. ' + result.stars + ' of ' + MAX_STARS + ' stars. Rank plus ' + result.rankGain + '.' + lookup;
}


function uiTurretFly(arena, dt, now) {
  Object.keys(arena.travel).forEach(function (number) {
    const before = arena.travel[number];
    if (before >= 1) return;
    arena.travel[number] = Math.min(1, before + dt / TRAVEL_MS);
    if (arena.travel[number] >= 1) Object.assign(arena.fx, { ramAt: now, ramKind: 'dock' });
  });
}
function uiTurretLanded(arena, drone) {
  return (arena.travel[drone.n] ?? 1) >= 1;
}
function uiTurretFuseDue(arena) {
  return arena.state.bay.some((drone) => drone.fuseMs !== null && uiTurretLanded(arena, drone));
}
function uiTurretBurn(app, dt, now) {
  const arena = app.rig.arena;
  const index = arena.state.bay.findIndex(function (drone) {
    if (drone.fuseMs === null || !uiTurretLanded(arena, drone)) return false;
    arena.fuse[drone.n] -= dt;
    return arena.fuse[drone.n] <= 0;
  });
  if (index < 0) return false;
  arena.state = applyTurret(arena.state, 'fuse:' + index);
  uiTurretAfterMove(app, now);
  return true;
}
function uiTurretTick(app, dt, now) {
  const arena = app.rig && app.rig.arena;
  if (!arena || arena.view !== 'play') return false;
  uiTurretFly(arena, dt, now);
  if (!uiTurretPlayable(app)) return false;
  arena.playMs += dt;
  if (arena.state.assist) return false;
  if (app.game.ext.assist === null && uiTurretFuseDue(arena)) {
    arena.banner = true;
    app.lastFocusKey = uiTurretBannerFocus(arena.reduced);
    return true;
  }
  return uiTurretBurn(app, dt, now);
}


function uiTurretSetAssist(app, on) {
  uiCommitExt(app, withAssist(app.game.ext, on));
  const arena = app.rig && app.rig.arena;
  if (!arena) return;
  arena.banner = false;
  arena.state = Object.assign({}, arena.state, { assist: on });
}
function uiTurretBrute(arena) {
  const state = arena.state;
  const total = bruteCompares(state.stream.length);
  const spent = state.assist ? state.steps * ASSIST_BRUTE_PER_STEP : Math.floor(arena.playMs / BRUTE_MS_PER_COMPARE);
  return Math.min(total, spent);
}

export {
  TURRET_RIG_ID, TRAVEL_MS, uiTurretCreate, uiTurretCoachText, uiTurretSpoken, uiTurretPlayable, uiTurretCommit, uiTurretNoping,
  uiTurretTick, uiTurretSetAssist, uiTurretBrute,
};

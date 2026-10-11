import { GAME_EVENT } from '../game/game-events.js';
import { withAssist } from '../game/save-ext.js';
import { BRUTE_MS_PER_COMPARE, BUSY_MS, TURRET_W1 } from '../game/rooms/data/turret-wave1.js';
import { TURRET_TEXTS, fillText } from '../game/rooms/data/turret-texts.js';
import { OVERFLOW_PACE_DRONES, REVEAL_MS } from '../game/rooms/data/turret-waves.js';
import {
  applyTurret, bruteCompares, hintOffer, keyFor, paceAt, swarmReady, swarmWindowMs, turretStars, turretTarget, verifyHint,
} from '../game/rooms/turret.js';
import { uiArenaRecordWin } from './arena-reward.js';
import { uiArenaClearToast, uiArenaToast } from './arena-shell.js';
import { uiEmit } from './bus.js';
import { uiPrefersReducedMotion } from './dom.js';
import { uiCommitExt } from './ext-storage.js';
import { uiTurretFirstMode, uiTurretRunFor } from './turret-modes.js';
import { uiTurretRecordBest } from './turret-record.js';


const TURRET_RIG_ID = 'turret';
const TRAVEL_MS = 400;
const NOPE_MS = 240;
const ASSIST_BRUTE_PER_STEP = 3;
const FIRST_DRONE = 1;
const MAX_STARS = 3;
const SECOND_DRONE = 2;
const NO_TIME = -Infinity;
const GOOD_KINDS = new Set(['pair', 'store', 'tag']);
const BAD_KINDS = new Set(['wrong', 'walk', 'fuse', 'swarm']);
const FIRST_SLOT = 1;
const LAST_SLOT = 9;
const TEACHING_RESULTS = { w1: 'turret-1', w2: 'turret-2' };

function uiTurretFreshFx() {
  return { ramAt: NO_TIME, ramKind: 'dock', beam: null, pops: [], nopeAt: NO_TIME, shiftAt: NO_TIME, shifted: 0 };
}
function uiTurretCreate(app, rig, start) {
  const mode = start.mode || uiTurretFirstMode(app);
  const run = uiTurretRunFor({ mode, assist: app.game.ext.assist === true, lastIndex: start.lastIndex });
  const arena = {
    rig, mode, levelId: rig.levels[0], poolIndex: run.index, state: run.state, reveal: {}, swarmLeft: 0,
    playMs: 0, busyUntil: NO_TIME, picked: 0, travel: {}, fuse: {}, fx: uiTurretFreshFx(),
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
  if (fresh.length > 0 || arena.state.last?.kind === 'swarm') arena.swarmLeft = swarmWindowMs(arena.state);
  if (fresh.length > 0 || arena.picked >= arena.state.bay.length) arena.picked = 0;
  arena.coach = uiTurretCoachText(arena);
  arena.lastT = turretTarget(arena.state);
}
const ARRIVAL_LINES = [
  { when: (arena, lead, values) => arena.lastT > 0 && values.t !== arena.lastT, text: (values) => fillText(TURRET_TEXTS.coach.switched, values) },
  { when: (arena) => arena.arrived.some((drone) => drone.gold), text: (values, arena) => fillText(TURRET_TEXTS.coach.gold, { v: arena.arrived.find((drone) => drone.gold).v }) },
  { when: (arena) => arena.arrived.length > 1, text: (values) => fillText(TURRET_TEXTS.coach.two, values) },
  { when: (arena, lead) => lead.n === FIRST_DRONE && arena.state.spec.dark, text: () => TURRET_TEXTS.coach.dark },
  { when: (arena, lead) => lead.n === FIRST_DRONE, text: (values) => fillText(TURRET_TEXTS.coach.first, values) },
  { when: (arena, lead) => lead.n === SECOND_DRONE && !arena.state.spec.dark, text: (values) => fillText(TURRET_TEXTS.coach.second, values) },
  { when: (arena, lead) => lead.n === TURRET_W1.dupAt && uiTurretHeld(arena, lead) > 0, text: (values) => fillText(TURRET_TEXTS.coach.dup, values) },
  { when: (arena, lead) => lead.n === TURRET_W1.rushFrom, text: () => TURRET_TEXTS.coach.rush },
];
function uiTurretHeld(arena, lead) {
  return arena.state.board[lead.v];
}
function uiTurretArrivalValues(arena, lead) {
  const state = arena.state;
  const second = arena.arrived[1];
  return {
    v: lead.v, t: turretTarget(state), key: keyFor(state, lead), count: uiTurretHeld(arena, lead) + 1,
    first: lead.v, second: second ? second.v : '',
  };
}
function uiTurretArrivalLine(arena) {
  const lead = arena.arrived[0];
  const values = uiTurretArrivalValues(arena, lead);
  const rule = ARRIVAL_LINES.find((item) => item.when(arena, lead, values));
  return rule ? rule.text(values, arena) : '';
}
function uiTurretOutcomeLine(state) {
  const last = state.last;
  if (!last || !GOOD_KINDS.has(last.kind)) return '';
  return fillText(TURRET_TEXTS.coach[last.kind], { key: last.key, v: last.v, t: last.t });
}
function uiTurretConsequence(state) {
  const last = state.last;
  if (!last) return '';
  if (state.billed && state.billed.n === last.n && last.kind === 'store') return fillText(TURRET_TEXTS.coach.billed, state.billed);
  return state.double && GOOD_KINDS.has(last.kind) ? TURRET_TEXTS.coach.double : '';
}
function uiTurretOfferLine(state) {
  const offer = hintOffer(state);
  return offer ? fillText(TURRET_TEXTS.coach.hint, offer) : '';
}
function uiTurretCoachText(arena) {
  const state = arena.state;
  if (state.status !== 'running' || state.bay.length === 0) return uiTurretOutcomeLine(state);
  const early = uiTurretOfferLine(state) || uiTurretConsequence(state);
  if (early) return early;
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
  if (!arena || arena.view !== 'play') return false;
  return arena.state.status === 'running' && !app.story && !app.menuOpen;
}
function uiTurretPaceCount(state) {
  return state.spec.endless ? OVERFLOW_PACE_DRONES : state.stream.length;
}
function uiTurretCtx(arena, drone) {
  const state = arena.state;
  const pace = paceAt(arena.playMs, uiTurretPaceCount(state), state.assist);
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
function uiTurretVerify(app) {
  if (!uiTurretPlayable(app)) return false;
  const arena = app.rig.arena;
  const offer = hintOffer(arena.state);
  if (!offer) return false;
  arena.state = verifyHint(arena.state);
  arena.coach = fillText(TURRET_TEXTS.coach.verify, { v: arena.state.bay[offer.bay].v, t: turretTarget(arena.state) });
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
function uiTurretRevealSlots(last) {
  const touched = last.kind === 'wrong' ? [last.slot] : [last.key, GOOD_KINDS.has(last.kind) ? last.v : 0];
  const also = last.also ? uiTurretRevealSlots(last.also) : [];
  return [...touched, ...also].filter((slot) => slot >= FIRST_SLOT && slot <= LAST_SLOT);
}
function uiTurretReveal(arena, now) {
  if (!arena.state.spec.dark) return;
  uiTurretRevealSlots(arena.state.last).forEach(function (slot) {
    arena.reveal[slot] = now + REVEAL_MS;
  });
}
function uiTurretBadToast(app, last) {
  if (last.kind === 'fuse' && last.damage > 0) return uiArenaToast(app, TURRET_TEXTS.toast.fuseOut, 'bad');
  return uiArenaToast(app, last.why, last.damage > 0 ? 'bad' : 'info');
}
function uiTurretSelfToast(app, last) {
  if (last.self && app.rig.arena.state.spec.dark) uiArenaToast(app, fillText(TURRET_TEXTS.toast.self, { v: last.v, t: last.t }), 'info');
}
function uiTurretAfterMove(app, now) {
  const arena = app.rig.arena;
  const last = arena.state.last;
  uiTurretCue(arena.state);
  uiTurretMotion(arena, now);
  uiTurretReveal(arena, now);
  if (BAD_KINDS.has(last.kind)) uiTurretBadToast(app, last);
  else uiTurretSelfToast(app, last);
  if (arena.state.status !== 'running') return uiTurretFinish(app);
  uiTurretArrivals(arena, now);
  app.pendingAnnounce = arena.arrived.length > 0 ? uiTurretSpoken(arena) : null;
  return null;
}


function uiTurretWin(app, arena) {
  const stars = turretStars(arena.state);
  const result = { won: true, stars, firstClear: false, starsImproved: false };
  if (arena.mode === 'w1') {
    const reward = uiArenaRecordWin(app, { rig: arena.rig, levelId: arena.levelId, stars });
    Object.assign(result, { firstClear: reward.bestBefore === 0, starsImproved: reward.improved });
    app.rig.outroDue = true;
  }
  uiEmit(GAME_EVENT.RIG_CLEAR, { rigId: TURRET_RIG_ID, levelId: TEACHING_RESULTS[arena.mode], stars });
  return result;
}
function uiTurretLoss(arena) {
  uiEmit(GAME_EVENT.RIG_FAIL, { rigId: TURRET_RIG_ID, levelId: arena.levelId, reason: 'integrity' });
  return { won: false, stars: 0, firstClear: false, starsImproved: false, why: arena.state.last ? arena.state.last.why : '' };
}
function uiTurretFinish(app) {
  const arena = app.rig.arena;
  arena.view = 'card';
  arena.coach = '';
  uiArenaClearToast(app.rig);
  const result = arena.state.status === 'won' ? uiTurretWin(app, arena) : uiTurretLoss(arena);
  const record = uiTurretRecordBest(app, arena);
  arena.result = { ...result, mode: arena.mode, ...record };
  app.lastFocusKey = 'turret-replay';
  app.pendingAnnounce = uiTurretEndSpoken(arena);
  return null;
}
function uiTurretEndSpoken(arena) {
  const { result, state } = arena;
  if (arena.mode === 'overflow') return TURRET_TEXTS.card.overflowTitle + '. ' + state.resolved + ' drones.';
  if (!result.won) return TURRET_TEXTS.card.failTitle + '. ' + (result.why || '');
  const wave = arena.mode === 'w2' ? 'Wave 2 clear. ' : 'Wave clear. The way is open. ';
  return wave + result.stars + ' of ' + MAX_STARS + ' stars.';
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
function uiTurretSwarm(app, dt, now) {
  const arena = app.rig.arena;
  const state = arena.state;
  const waiting = state.steps > 0 && swarmReady(state) && state.bay.every((drone) => uiTurretLanded(arena, drone));
  if (!waiting) return false;
  arena.swarmLeft -= dt;
  if (arena.swarmLeft > 0) return false;
  arena.state = applyTurret(state, 'swarm:0');
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
  return uiTurretBurn(app, dt, now) || uiTurretSwarm(app, dt, now);
}


function uiTurretSetAssist(app, on) {
  uiCommitExt(app, withAssist(app.game.ext, on));
  const arena = app.rig && app.rig.arena;
  if (!arena) return;
  arena.state = Object.assign({}, arena.state, { assist: on });
}
function uiTurretBrute(arena) {
  const state = arena.state;
  const total = bruteCompares(state.spec.endless ? state.resolved : state.stream.length);
  const spent = state.assist ? state.steps * ASSIST_BRUTE_PER_STEP : Math.floor(arena.playMs / BRUTE_MS_PER_COMPARE);
  return Math.min(total, spent);
}

export {
  TURRET_RIG_ID, TRAVEL_MS, uiTurretCreate, uiTurretCoachText, uiTurretSpoken, uiTurretPlayable, uiTurretCommit, uiTurretNoping,
  uiTurretTick, uiTurretSetAssist, uiTurretBrute, uiTurretVerify,
};

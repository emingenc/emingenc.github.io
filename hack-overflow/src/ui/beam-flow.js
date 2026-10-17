import { ammoMax,countsAmmo } from '../game/ammo.js';
import { rankOf } from '../game/ext/ops.js';
import { GAME_EVENT } from '../game/game-events.js';
import { rankLevel } from '../game/rank.js';
import { ASSIST_PACE,PACE_MAX,SHARD } from '../game/rooms/data/beam-wave.js';
import { BEAM_TEXTS } from '../game/rooms/data/beam-texts.js';
import { fillText } from '../game/rooms/data/turret-texts.js';
import { applyBeam,beamStars,createBeam,liveCells,middleHint,middleOf } from '../game/rooms/beam.js';
import { uiArenaToast } from './arena-shell.js';
import { uiBeamRecordBest } from './beam-record.js';
import { uiBeamRunFor } from './beam-modes.js';
import { uiBeamW3Cue,uiBeamW3Toast,uiBeamW3Values } from './beam-w3-flow.js';
import { uiEmit } from './bus.js';
import { uiPrefersReducedMotion } from './dom.js';
import { uiRoomCardView,uiRoomPlayable,uiRoomWin } from './room-flow.js';


const BEAM_RIG_ID = 'beam';
const BEAM_BUSY_MS = 450;
const BEAM_SHOT_MS = 400;
const NOPE_MS = 240;
const NO_TIME = -Infinity;
const MAX_STARS = 3;
const PACE_FAST_MS = 5000;
const PACE_SLOW_MS = 15000;
const LEVEL_OF_MODE = { w1:'beam-1',w2:'beam-2',w3:'beam-3' };
const SHOT_LINE = '{word}. The weak point is in {lo}..{hi} ({size} cells).';
const BASE_COACH = { w1:BEAM_TEXTS.coach.w1,w2:BEAM_TEXTS.coach.w2,w3:BEAM_TEXTS.coach.w3 };
const NO_TARGET = 'Nothing to BOLT right now.';

function uiBeamDefaultTime() {
return typeof performance !== 'undefined' ? performance.now() :Date.now();
}
let uiBeamClock = uiBeamDefaultTime;
function uiBeamSetClock(now) {
uiBeamClock = now || uiBeamDefaultTime;
}
function uiBeamTime() {
return uiBeamClock();
}


function uiBeamAssist(app) {
const choice = app.game.ext.assist;
return choice === true || (choice !== false && Boolean(uiPrefersReducedMotion()));
}
function uiBeamOptions(app) {
const bolt = countsAmmo(app.game.ext);
const ammo = bolt ? ammoMax(rankLevel(rankOf(app.game.ext))) :undefined;
return { assist:uiBeamAssist(app),bolt,ammo };
}
function uiBeamPace(elapsed) {
if (elapsed <= PACE_FAST_MS) return PACE_MAX;
if (elapsed >= PACE_SLOW_MS) return ASSIST_PACE;
return PACE_MAX - (PACE_MAX - ASSIST_PACE) * (elapsed - PACE_FAST_MS) / (PACE_SLOW_MS - PACE_FAST_MS);
}

function uiBeamCreate(app,rig,start) {
const run = uiBeamRunFor({ mode:start.mode,lastIndex:start.lastIndex ?? null });
const arena = {
rig,levelId:rig.levels[0],mode:start.mode,state:createBeam(start.mode,{ ...uiBeamOptions(app),...run.options }),poolIndex:run.index,
view:'play',result:null,coach:'',busyUntil:NO_TIME,thinkFrom:null,fx:{ nopeAt:NO_TIME,shotAt:NO_TIME },swallow:null,
};
arena.coach = uiBeamCoachText(arena);
app.pendingAnnounce = null;
return arena;
}


function uiBeamValues(state) {
const bites = state.mites.map((mite) => mite.bitesIn);
return {
lo:state.lo,hi:state.hi,live:state.hi - state.lo + 1,mid:middleOf(state),cell:state.selected,points:SHARD.score,
n:bites.length > 0 ? Math.min(...bites) :0,...(state.rotated ? uiBeamW3Values(state) :{}),
};
}
function uiBeamBaseCoach(state) {
return state.rotated && state.probes > 0 ? BEAM_TEXTS.coach.ends :BASE_COACH[state.wave];
}
const COACH_LINES = [
{ when:(state) => state.shard !== null,text:() => BEAM_TEXTS.coach.shardNow },
{ when:(state) => state.mites.length > 0,text:(state) => (state.bolt ? BEAM_TEXTS.coach.mite :BEAM_TEXTS.coach.miteNoBolt) },
{ when:(state) => middleHint(state) !== null,text:() => BEAM_TEXTS.coach.middle },
{ when:(state) => Boolean(state.pending),text:() => BEAM_TEXTS.coach.keep },
{ when:(state) => state.selected !== null,text:() => BEAM_TEXTS.coach.select },
{ when:() => true,text:uiBeamBaseCoach },
];
function uiBeamCoachText(arena) {
const state = arena.state;
if (state.status !== 'running') return '';
const line = COACH_LINES.find((item) => item.when(state));
return fillText(line.text(state),uiBeamValues(state));
}
function uiBeamSpoken(arena) {
const state = arena.state;
if (state.status !== 'running') return '';
return fillText(BEAM_TEXTS.coach.announce,uiBeamValues(state));
}


function uiBeamCommit(app,move,now) {
if (!uiRoomPlayable(app)) return false;
const arena = app.rig.arena;
if (now < arena.busyUntil) {
arena.fx.nopeAt = now;
return false;
}
if (arena.thinkFrom === null) arena.thinkFrom = now;
const next = applyBeam(arena.state,move,{ pace:uiBeamPace(now - arena.thinkFrom) });
if (next === arena.state) return false;
arena.state = next;
uiBeamAfterMove(app,now);
return next.last.ok;
}
function uiBeamNudge(app,delta,now) {
if (!uiRoomPlayable(app)) return false;
const state = app.rig.arena.state;
const live = liveCells(state);
const at = live.indexOf(state.selected);
const target = at < 0 ? middleOf(state) :live[Math.min(live.length - 1,Math.max(0,at + delta))];
return uiBeamCommit(app,'select:' + target,now);
}
function uiBeamBoltMove(state) {
if (state.shard) return 'bolt:shard';
return state.mites.length > 0 ? 'bolt:mite' :null;
}
function uiBeamBolt(app,now) {
if (!uiRoomPlayable(app)) return false;
const move = uiBeamBoltMove(app.rig.arena.state);
if (move) return uiBeamCommit(app,move,now);
uiArenaToast(app,NO_TARGET,'info');
return false;
}
function uiBeamNoping(arena,now) {
return now - arena.fx.nopeAt < NOPE_MS;
}
function uiBeamShooting(arena,now) {
return arena.state.last !== null && arena.state.last.kind === 'shot' && now - arena.fx.shotAt < BEAM_SHOT_MS * 2;
}


function uiBeamShotToast(last) {
const failed = last.slip || last.decoy || last.events.bites > 0;
if (failed) return { text:last.toast,kind:'bad' };
return { text:fillText(SHOT_LINE,{ word:last.answer,lo:last.to.lo,hi:last.to.hi,size:last.kept }),kind:'good' };
}
function uiBeamShotCue(state) {
const last = state.last;
if (last.slip || last.decoy) return uiEmit(GAME_EVENT.RIG_BAD,{ rigId:BEAM_RIG_ID,reason:last.decoy ? 'decoy' :'slip' });
return uiEmit(GAME_EVENT.RIG_GOOD,{ rigId:BEAM_RIG_ID,chain:state.combo });
}
function uiBeamSettle(app,toastOf) {
const arena = app.rig.arena;
if (arena.state.status !== 'running') return uiBeamFinish(app);
const toast = toastOf(arena.state.last);
uiArenaToast(app,toast.text,toast.kind);
arena.coach = uiBeamCoachText(arena);
return null;
}
function uiBeamAfterShot(app,now) {
const arena = app.rig.arena;
const state = arena.state;
arena.busyUntil = now + BEAM_BUSY_MS;
arena.fx.shotAt = now;
arena.thinkFrom = now;
uiBeamShotCue(state);
return uiBeamSettle(app,uiBeamShotToast);
}
function uiBeamAfterBolt(app) {
const arena = app.rig.arena;
const last = arena.state.last;
uiArenaToast(app,last.toast,last.dry ? 'info' :'good');
if (!last.dry) uiEmit(GAME_EVENT.RIG_GOOD,{ rigId:BEAM_RIG_ID,chain:arena.state.combo });
arena.coach = uiBeamCoachText(arena);
}
function uiBeamAfterRotated(app,now) {
const arena = app.rig.arena;
const state = arena.state;
arena.busyUntil = now + BEAM_BUSY_MS;
arena.thinkFrom = now;
const cue = uiBeamW3Cue(state);
if (cue) uiEmit(cue.type,{ rigId:BEAM_RIG_ID,...cue.detail });
return uiBeamSettle(app,uiBeamW3Toast);
}
function uiBeamAfterMove(app,now) {
const arena = app.rig.arena;
const last = arena.state.last;
if (arena.state.rotated && (last.kind === 'shot' || last.kind === 'keep')) return uiBeamAfterRotated(app,now);
if (last.kind === 'shot') return uiBeamAfterShot(app,now);
if (last.kind === 'bolt') return uiBeamAfterBolt(app);
if (!last.ok) uiArenaToast(app,last.toast,'bad');
arena.coach = uiBeamCoachText(arena);
app.pendingAnnounce = last.ok ? last.toast.split('.')[0] + '.' :null;
return null;
}


function uiBeamWin(app,arena) {
return uiRoomWin(app,arena,{ rigId:BEAM_RIG_ID,clearLevel:LEVEL_OF_MODE[arena.mode],stars:beamStars(arena.state) }).result;
}
function uiBeamLoss(arena) {
const last = arena.state.last;
uiEmit(GAME_EVENT.RIG_FAIL,{ rigId:BEAM_RIG_ID,levelId:LEVEL_OF_MODE[arena.mode],reason:last.end });
return { won:false,stars:0,firstClear:false,why:last.toast };
}
function uiBeamEndSpoken(result) {
if (!result.won) return BEAM_TEXTS.card.failTitle + '. ' + result.why;
return 'Lock found. ' + result.stars + ' of ' + MAX_STARS + ' stars.';
}
function uiBeamFinish(app) {
const arena = uiRoomCardView(app);
const result = arena.state.status === 'won' ? uiBeamWin(app,arena) :uiBeamLoss(arena);
arena.result = { ...result,mode:arena.mode,...uiBeamRecordBest(app,arena) };
app.lastFocusKey = 'beam-replay';
app.pendingAnnounce = uiBeamEndSpoken(arena.result);
return null;
}

export {
BEAM_RIG_ID,BEAM_BUSY_MS,BEAM_SHOT_MS,uiBeamSetClock,uiBeamTime,uiBeamCreate,uiBeamCoachText,uiBeamSpoken,uiBeamCommit,uiBeamNudge,
uiBeamBolt,uiBeamBoltMove,uiBeamNoping,uiBeamShooting,uiBeamAssist,uiBeamPace,
};

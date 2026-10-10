import { growHp,maxHeartsFor,passDoorway } from '../game/hp.js';
import { cellToward } from '../game/move.js';
import { dangerCells,mitesView,miteAt,resetMites,sentryMites,tickMites,zapMite } from '../game/mites.js';
import { COACH_RANGE,CORRIDOR_MOUTH,MITE_RANGE,SHOT_COOLDOWN_MS,SHOT_RANGE } from '../game/sentry-lanes.js';
import { createExt,withZap } from '../game/save-ext.js';
import { isOpen } from '../game/world.js';
import { uiRenderKeepingFocus } from './app.js';
import { uiAnnounce,uiPointerIsCoarse } from './dom.js';
import { uiCommitExt } from './ext-storage.js';
import { ensureFight,uiDroneAlive } from './grid-actors.js';
import { uiDrawMites } from './grid-draw-mites.js';
import { uiDrawHitFlash,uiNoteHit,uiShakeStage } from './grid-drone-fx.js';
import { DANGER_HINT,WAIT_TEXT,sentryCoachLine } from './grid-sentry-coach.js';
import { uiShowToast } from './grid-toast.js';

const BARRIER_ID = 'barrier-sentry';
const GROW_TOAST = 'NEW HEART! # hearts max. Zap mites to grow stronger.';

function uiBarrierClosed(game) {
return Object.hasOwn(game.world.things,BARRIER_ID) && !isOpen(game.world,game.progress,BARRIER_ID);
}
function uiMitesOf(game) {
return (game.fight && game.fight.mites) || [];
}
function uiReach(foe,pos) {
return Math.max(Math.abs(foe.col - pos.col),Math.abs(foe.row - pos.row));
}
function uiNear(game,range) {
return mitesView(uiMitesOf(game)).filter(function (foe) { return foe.hp > 0 && uiReach(foe,game.avatar.pos) <= range; });
}
function uiSameCell(one,other) {
return one.col === other.col && one.row === other.row;
}
function uiPaint(game,state) {
if (game.drawActors === state.painter) return;
state.inner = game.drawActors || null;
game.drawActors = state.painter;
}
function uiStrikeFx(ctx,app,frame) {
const notes = uiNoteHit(app.game.fight,frame.now);
uiDrawHitFlash(ctx,frame,notes.hitAt);
uiShakeStage(app,frame,notes.hitAt);
}
function uiPainterFor(state) {
return function (ctx,app,frame) {
if (state.inner) state.inner(ctx,app,frame);
else if (app.game.fight) uiStrikeFx(ctx,app,frame);
uiDrawMites(ctx,app,frame);
uiDrawHitFlash(ctx,frame,state.dangerAt);
};
}
function uiSetCoach(game,state,text) {
if (text === state.coach) return;
if (!text && game.coach === state.coach) game.coach = null;
if (text) { game.coach = text; uiAnnounce(text); state.told = true; }
state.coach = text;
}
function uiEndCoach(game,state) {
game.coachDone = true;
uiSetCoach(game,state,null);
}
function uiRefreshCoach(game,state,near) {
const text = near.length > 0 && !game.coachDone ? state.coach || sentryCoachLine(state.told,uiPointerIsCoarse()) :null;
uiSetCoach(game,state,text);
}
function uiEngage(app,near) {
const fight = app.game.fight;
if (near.length === 0 || fight.engaged) return;
fight.engaged = true;
uiRenderKeepingFocus(app);
}
function uiNoteMouth(game) {
if (game.avatar.pos.col < CORRIDOR_MOUTH.col) return;
game.doorway = { ...CORRIDOR_MOUTH };
game.fight.hp = passDoorway(game.fight.hp,CORRIDOR_MOUTH);
}
function uiRetire(app,state) {
const game = app.game;
if (game.sentry !== state.api) return;
game.sentry = null;
if (game.drawActors === state.painter) game.drawActors = state.inner;
if (game.fight) Object.assign(game.fight,{ mites:null,engaged:false,shotAt:null });
if (game.fight && !uiDroneAlive(app)) game.fight.hp = { ...game.fight.hp,hearts:game.fight.hp.max };
uiSetCoach(game,state,null);
}
function uiActive(app,state) {
if (!uiBarrierClosed(app.game)) { uiRetire(app,state); return false; }
return !app.game.opening;
}
function uiDangerAt(game,target,mite) {
return Boolean(mite) || dangerCells(uiMitesOf(game),game.avatar.pos).some(function (cell) { return uiSameCell(cell,target); });
}
function uiBump(game,dir,event) {
return { pos:{ ...game.avatar.pos },facing:dir,event };
}
function uiGuardStep(app,state,move) {
if (!uiActive(app,state)) return null;
const game = app.game;
uiPaint(game,state);
const target = cellToward(game.avatar.pos,move.dir);
const mite = miteAt(uiMitesOf(game),target);
if (mite && !move.auto) return uiBump(game,move.dir,{ type:'bump',zap:mite.id });
return move.auto && uiDangerAt(game,target,mite) ? uiBump(game,move.dir,{ type:'danger' }) :null;
}
function uiTick(app,state) {
if (!uiActive(app,state)) return 0;
const game = app.game;
uiPaint(game,state);
const ticked = tickMites(uiMitesOf(game),game.avatar.pos,{ range:MITE_RANGE });
game.fight.mites = ticked.mites;
uiNoteMouth(game);
const near = uiNear(game,COACH_RANGE);
uiRefreshCoach(game,state,near);
uiEngage(app,near);
return ticked.hits;
}
function uiCountZap(app) {
const game = app.game;
const ext = withZap(game.ext || createExt());
uiCommitExt(app,ext);
const max = maxHeartsFor(ext.zaps);
if (max <= game.fight.hp.max) return;
game.fight.hp = growHp(game.fight.hp,max);
uiShowToast(app,{ text:GROW_TOAST.replace('#',max),kind:'reward' });
}
function uiFizzle(game,id,now) {
if (!uiNear(game,SHOT_RANGE).some(function (foe) { return foe.id === id; })) return 'far';
return now - (game.fight.shotAt ?? -Infinity) < SHOT_COOLDOWN_MS ? 'cool' :null;
}
function uiHit(app,zap,state) {
const now = performance.now();
const fizzle = uiFizzle(app.game,zap.id,now);
if (fizzle) return fizzle;
app.game.fight.shotAt = now;
const zapped = zapMite(uiMitesOf(app.game),zap.id,zap.dmg);
app.game.fight.mites = zapped.mites;
uiEndCoach(app.game,state);
if (zapped.killed) uiCountZap(app);
return zapped.killed ? 'kill' :'dent';
}
function uiDanger(app,state) {
state.dangerAt = performance.now();
if (state.hinted) return;
state.hinted = true;
uiShowToast(app,{ text:DANGER_HINT,kind:'info' });
uiRenderKeepingFocus(app);
}
function uiSentryFor(app,state) {
return {
guardStep:function (ignored,dir,auto) { return uiGuardStep(app,state,{ dir,auto }); },
tick:function () { return uiTick(app,state); },
foes:function () { return uiActive(app,state) ? uiNear(app.game,COACH_RANGE) :[]; },
hit:function (ignored,id,dmg) { return uiHit(app,{ id,dmg },state); },
settle:function () { uiActive(app,state); },
wait:function () { uiAnnounce(WAIT_TEXT); uiEndCoach(app.game,state); },
danger:function () { uiDanger(app,state); },
reset:function () { app.game.fight.mites = resetMites(uiMitesOf(app.game)); },
};
}
function uiInstallSentry(app) {
const game = app.game;
if (game.sentry || !uiBarrierClosed(game)) return;
const fight = ensureFight(game);
fight.mites = sentryMites();
uiNoteMouth(game);
const state = { inner:null,painter:null,coach:null,told:false,hinted:false,dangerAt:null,api:null };
state.painter = uiPainterFor(state);
state.api = uiSentryFor(app,state);
game.sentry = state.api;
uiPaint(game,state);
}

export { uiInstallSentry };

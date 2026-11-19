import { easeOutCubic } from '../game/ease.js';
import { edgeWeights,flashAlpha } from '../game/foe-motion.js';
import { uiKickStage,uiStageShake } from './grid-stage-shake.js';

const CRASH_MS = 350;
const DUST_MS = 450;
const BURST_MS = 650;
const DUST = { count:7,reach:0.9,size:0.2 };
const BURST_RINGS = [
{ colour:'amber',count:10,reach:1.3,size:0.22,out:true },
{ colour:'text',count:6,reach:0.7,size:0.16,out:true },
];
const EDGE_BAND_OUTER = 0.18;
const EDGE_BAND_MID = 0.11;
const EDGE_BAND_INNER = 0.05;
const EDGE_BANDS = [EDGE_BAND_OUTER,EDGE_BAND_MID,EDGE_BAND_INNER];
const EDGE_SHARE = 0.4;
const STILL_PROGRESS = 0.5;
const HALF = 0.5;
const FULL_TURN = Math.PI * 2;
const HEAVY_HIT = 1;

const uiFightNotes = new WeakMap();
let uiHitEdges = edgeWeights(null);

function uiNotesOf(fight) {
if (!uiFightNotes.has(fight)) uiFightNotes.set(fight,{ hearts:fight.hp.hearts,revives:fight.revives || 0,hitAt:null,drones:new Map() });
return uiFightNotes.get(fight);
}
function uiNoteHit(fight,now) {
const notes = uiNotesOf(fight);
const revives = fight.revives || 0;
const lost = notes.hearts - fight.hp.hearts;
if (lost > 0 || revives > notes.revives) {
notes.hitAt = now;
uiKickStage(lost > HEAVY_HIT || revives > notes.revives ? 'hitHard' :'hit',now);
}
notes.hearts = fight.hp.hearts;
notes.revives = revives;
return notes;
}
function uiNoteStrike(from) {
uiHitEdges = edgeWeights(from);
}
function uiDroneClock(notes,actor,now) {
if (!notes.drones.has(actor.id)) notes.drones.set(actor.id,{ born:now,died:null,hurtAt:null,impactAt:null,struckAt:null,urgentAt:null });
const clock = notes.drones.get(actor.id);
if (actor.hp <= 0 && clock.died === null) clock.died = now;
return clock;
}
function uiProgress(age,span,reducedMotion) {
return reducedMotion ? STILL_PROGRESS :Math.min(Math.max(age / span,0),1);
}
function uiCrashDrop(frame,spot) {
if (frame.reducedMotion) return 0;
const left = 1 - Math.min(spot.age / CRASH_MS,1);
return -(spot.top + frame.tile) * left * left;
}
function uiDrawSparks(ctx,frame,spark) {
const progress = uiProgress(spark.age,spark.span,frame.reducedMotion);
const size = frame.tile * spark.size * (1 - progress);
ctx.globalAlpha = 1 - progress;
ctx.fillStyle = frame.palette[spark.colour];
for (let index = 0; index < spark.count; index += 1) {
const angle = (index / spark.count) * FULL_TURN;
const reach = frame.tile * spark.reach * (spark.out ? easeOutCubic(progress) :progress);
ctx.fillRect(spark.x + Math.cos(angle) * reach - size * HALF,spark.y + Math.sin(angle) * reach - size * HALF,size,size);
}
ctx.globalAlpha = 1;
}
function uiCentreOf(frame,actor) {
return { x:(actor.col - frame.camera.col + HALF) * frame.tile,y:(actor.row - frame.camera.row + HALF) * frame.tile };
}
function uiDrawDust(ctx,frame,spot) {
const since = spot.age - CRASH_MS;
if (frame.reducedMotion || since < 0 || since >= DUST_MS) return;
uiDrawSparks(ctx,frame,{ ...DUST,...uiCentreOf(frame,spot.actor),colour:'dim',age:since,span:DUST_MS });
}
function uiDrawBurst(ctx,frame,spot) {
if (spot.age >= BURST_MS) return;
const centre = uiCentreOf(frame,spot.actor);
BURST_RINGS.forEach(function (ring) { uiDrawSparks(ctx,frame,{ ...ring,...centre,age:spot.age,span:BURST_MS }); });
}
function uiDrawEdges(ctx,frame,weights) {
const short = Math.min(frame.width,frame.height);
EDGE_BANDS.forEach(function (share) {
const depth = short * share;
ctx.fillRect(0,0,frame.width,depth * weights.top);
ctx.fillRect(0,frame.height - depth * weights.bottom,frame.width,depth * weights.bottom);
ctx.fillRect(0,0,depth * weights.left,frame.height);
ctx.fillRect(frame.width - depth * weights.right,0,depth * weights.right,frame.height);
});
}
function uiDrawHitFlash(ctx,frame,hitAt) {
if (hitAt === null) return;
const alpha = flashAlpha(frame.now - hitAt,frame.reducedMotion);
if (alpha <= 0) return;
ctx.globalAlpha = alpha * EDGE_SHARE;
ctx.fillStyle = frame.palette.red;
uiDrawEdges(ctx,frame,uiHitEdges);
ctx.globalAlpha = 1;
}
function uiShakeStage(app,frame) {
uiStageShake(app.game.stage && app.game.stage.canvas,frame);
}

export { uiNotesOf,uiNoteHit,uiNoteStrike,uiDroneClock,uiCrashDrop,uiDrawDust,uiDrawBurst,uiDrawHitFlash,uiShakeStage,CRASH_MS,BURST_MS };

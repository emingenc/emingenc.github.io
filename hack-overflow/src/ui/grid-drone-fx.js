const CRASH_MS = 350;
const DUST_MS = 450;
const BURST_MS = 900;
const FLASH_MS = 300;
const SHAKE_MS = 250;
const SHAKE_PX = 5;
const SHAKE_RATE = 0.09;
const FLASH_ALPHA = 0.3;
const DUST = { count:7,reach:0.9,size:0.2 };
const BURST_RINGS = [
{ colour:'amber',count:10,reach:1.3,size:0.22 },
{ colour:'text',count:6,reach:0.7,size:0.16 },
];
const STILL_PROGRESS = 0.5;
const HALF = 0.5;
const FULL_TURN = Math.PI * 2;

const uiFightNotes = new WeakMap();

function uiNotesOf(fight) {
if (!uiFightNotes.has(fight)) uiFightNotes.set(fight,{ hearts:fight.hp.hearts,revives:fight.revives || 0,hitAt:null,drones:new Map() });
return uiFightNotes.get(fight);
}
function uiNoteHit(fight,now) {
const notes = uiNotesOf(fight);
const revives = fight.revives || 0;
if (fight.hp.hearts < notes.hearts || revives > notes.revives) notes.hitAt = now;
notes.hearts = fight.hp.hearts;
notes.revives = revives;
return notes;
}
function uiDroneClock(notes,actor,now) {
if (!notes.drones.has(actor.id)) notes.drones.set(actor.id,{ born:now,died:null });
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
const reach = frame.tile * spark.reach * progress;
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
function uiDrawHitFlash(ctx,frame,hitAt) {
const age = hitAt === null ? FLASH_MS :frame.now - hitAt;
if (age < 0 || age >= FLASH_MS) return;
ctx.globalAlpha = FLASH_ALPHA * (frame.reducedMotion ? 1 :1 - age / FLASH_MS);
ctx.fillStyle = frame.palette.red;
ctx.fillRect(0,0,frame.width,frame.height);
ctx.globalAlpha = 1;
}
function uiShakeStage(app,frame,hitAt) {
const canvas = app.game.stage && app.game.stage.canvas;
if (!canvas || !canvas.style) return;
const age = hitAt === null || frame.reducedMotion ? SHAKE_MS :frame.now - hitAt;
if (age >= SHAKE_MS) {
if (canvas.style.transform) canvas.style.removeProperty('transform');
return;
}
const offset = Math.round(Math.sin(age * SHAKE_RATE) * SHAKE_PX * (1 - age / SHAKE_MS));
canvas.style.setProperty('transform','translateX(' + offset + 'px)');
}

export { uiNoteHit,uiDroneClock,uiCrashDrop,uiDrawDust,uiDrawBurst,uiDrawHitFlash,uiShakeStage,CRASH_MS,BURST_MS };

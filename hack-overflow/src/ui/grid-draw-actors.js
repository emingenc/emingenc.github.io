import { actorIntent } from '../game/actors.js';
import { bobOf,phaseOf } from '../game/npc-motion.js';
import { uiDrawArt } from './art-hook.js';
import { uiDrawShadow } from './grid-foe-glide.js';
import { uiEyedInk,uiFillCentred } from './grid-glyph-art.js';
import { uiPillPopBegin,uiRingPulse,uiRingShare } from './grid-ring-feel.js';
import { uiWatchCombat } from './grid-combat-fx.js';
import { uiCrashDrop,uiDrawDust,uiDrawHitFlash,uiDroneClock,uiNoteHit,uiShakeStage } from './grid-drone-fx.js';
import { uiDrawFoePosed,uiDrawInPose,uiDrawPosed,uiFoeLook } from './grid-foe-fx.js';
import { uiBoxesMeet,uiNotchedBox,uiOutlinedText,uiTextWidth,uiWorldFont } from './grid-world-text.js';

const DRONE_ART = ['x.....x','xx.x.xx','.xxexx.','..xxx..','...x...'];
const ART_TILES = 0.9;
const BOB = { tiles:0.07,ms:300 };
const PILL = { fontPx:12,padX:6,height:18,overlap:0.3,gap:2,edge:3,tries:5 };
const RING_RADIUS_TILES = 0.62;
const RING_GROW_TILES = 0.18;
const RING_PX = 3;
const TRACK_ALPHA = 0.35;
const HALF = 0.5;
const FULL_TURN = Math.PI * 2;
const TOP = -Math.PI / 2;
const ALERT_ARM = 1;
const CALM_LABEL = 'HOVERS';

const uiPlaced = new WeakMap();
const uiPills = new WeakMap();

function uiDrawDroneArt(ctx,frame,spot) {
const bob = spot.look.dying ? 0 :bobOf(frame,BOB,phaseOf(spot.actor.id));
if (!spot.look.dying) uiDrawShadow(ctx,frame,{ left:spot.left,top:spot.top,lift:BOB.tiles - bob / frame.tile });
const painted = { left:spot.left,top:spot.top + spot.drop + bob,size:frame.tile,dpr:frame.dpr,accent:spot.accent };
const job = { left:painted.left,top:painted.top,look:spot.look,flashArt:'drone',paint:function () {
if (uiDrawArt(ctx,'drone',painted)) return;
uiFillCentred(ctx,DRONE_ART,{ left:painted.left,top:painted.top,tile:frame.tile,share:ART_TILES,ink:uiEyedInk(frame.palette.bg,spot.colour) });
} };
uiDrawPosed(ctx,frame,job);
}
function uiIntentOf(spot) {
return spot.calm ? null :actorIntent(spot.actor);
}
function uiUrgent(intent) {
return Boolean(intent) && intent.inTicks <= ALERT_ARM;
}
function uiPillText(spot) {
if (spot.calm) return CALM_LABEL;
const intent = actorIntent(spot.actor);
return intent ? intent.verb.toUpperCase() + ' ' + intent.inTicks :'';
}
function uiDrawRing(ctx,frame,spot) {
const intent = uiIntentOf(spot);
const pulse = uiRingPulse(frame,uiUrgent(intent));
const centre = { x:spot.left + frame.tile * HALF,y:spot.top + frame.tile * HALF };
const radius = frame.tile * (RING_RADIUS_TILES + RING_GROW_TILES * pulse);
ctx.lineWidth = RING_PX;
ctx.strokeStyle = spot.calm ? frame.palette.dim :frame.palette.amber;
if (intent) ctx.globalAlpha = TRACK_ALPHA;
ctx.beginPath();
ctx.arc(centre.x,centre.y,radius,0,FULL_TURN);
ctx.stroke();
ctx.globalAlpha = 1;
if (!intent) return;
ctx.strokeStyle = uiUrgent(intent) ? frame.palette.red :frame.palette.amber;
ctx.beginPath();
ctx.arc(centre.x,centre.y,radius,TOP,TOP + FULL_TURN * uiRingShare(frame,{ actor:spot.actor,ticks:intent.inTicks }));
ctx.stroke();
}
function uiPlacedBoxes(frame) {
if (!uiPlaced.has(frame)) uiPlaced.set(frame,[]);
return uiPlaced.get(frame);
}
function uiPillBox(frame,spot,width) {
const above = spot.top >= PILL.height;
const left = Math.min(Math.max(spot.left + frame.tile * HALF - width * HALF,PILL.edge),Math.max(frame.width - width - PILL.edge,PILL.edge));
const step = (PILL.height + PILL.gap) * (above ? -1 :1);
let top = above ? spot.top - PILL.height * (1 - PILL.overlap) :spot.top + frame.tile + PILL.gap;
const taken = uiPlacedBoxes(frame);
for (let tries = 0;tries < PILL.tries && taken.some((box) => uiBoxesMeet(box,{ left,top,width,height:PILL.height }));tries += 1) top += step;
const box = { left,top,width,height:PILL.height };
taken.push(box);
return box;
}
function uiInView(frame,spot) {
return spot.left + frame.tile > 0 && spot.top + frame.tile > 0 && spot.left < frame.width && spot.top < frame.height;
}
function uiQueuedPills(frame) {
if (!uiPills.has(frame)) uiPills.set(frame,[]);
return uiPills.get(frame);
}
function uiDrawPill(ctx,frame,spot) {
const text = uiPillText(spot);
if (text === '') return;
const width = uiTextWidth(ctx,text,uiWorldFont(PILL.fontPx)) + PILL.padX * 2;
const box = uiPillBox(frame,spot,width);
const intent = uiIntentOf(spot);
const tone = uiUrgent(intent) ? 'red' :spot.calm ? 'dim' :'amber';
const centre = { x:box.left + width * HALF,y:box.top + box.height * HALF };
uiPillPopBegin(ctx,frame,{ actor:spot.actor,ticks:intent ? intent.inTicks :null,...centre });
uiNotchedBox(ctx,frame,{ ...box,edge:tone,fill:'bg' });
uiOutlinedText(ctx,frame,{ text,x:centre.x,y:centre.y,font:uiWorldFont(PILL.fontPx),ink:'text' });
ctx.restore();
}
function uiDrawQueuedPills(ctx,frame) {
const pills = uiPills.get(frame);
if (!pills) return;
uiPills.delete(frame);
pills.forEach(function (spot) {
const paint = function () { uiDrawPill(ctx,frame,spot); };
if (spot.look) uiDrawInPose(ctx,frame,{ foe:spot.actor,look:spot.look,paint });
else paint();
});
}
function uiDrawActorTag(ctx,frame,spot) {
if (!uiInView(frame,spot)) return;
if (spot.ring || spot.calm || uiIntentOf(spot)) uiDrawRing(ctx,frame,spot);
uiQueuedPills(frame).push(spot);
}
function uiDrawDrone(ctx,frame,spot) {
const actor = spot.actor;
const cell = { actor,calm:spot.calm,ring:true,left:(actor.col - frame.camera.col) * frame.tile,top:(actor.row - frame.camera.row) * frame.tile };
const drop = uiCrashDrop(frame,{ top:cell.top,age:spot.age });
const urgent = actor.arm <= ALERT_ARM;
uiDrawDroneArt(ctx,frame,{ ...cell,drop,look:spot.look,accent:urgent ? 'red' :'cyan',colour:urgent ? frame.palette.red :frame.palette.cyan });
if (spot.look.dying) return;
uiDrawActorTag(ctx,frame,cell);
uiDrawDust(ctx,frame,spot);
}
const PAINTERS = new Map([['drone',uiDrawDrone]]);
const SELF_POSED = new Set(['drone']);
function uiRegisterActorPainter(kind,painter) {
PAINTERS.set(kind,painter);
}
function uiDrawActor(ctx,frame,spot) {
const actor = spot.actor;
const kind = actor.kind ?? 'drone';
const painter = PAINTERS.get(kind);
if (!painter) return;
const clock = uiDroneClock(spot.notes,actor,frame.now);
const look = uiFoeLook(frame,actor);
const shown = { actor,calm:spot.calm,age:frame.now - clock.born,look };
if (look.debris >= 0 || SELF_POSED.has(kind)) {
if (look.shown || look.debris >= 0) painter(ctx,frame,shown);
return;
}
uiDrawFoePosed(ctx,frame,{ foe:actor,look,paint:function () { painter(ctx,frame,shown); } });
}
function uiDrawActors(ctx,app,frame) {
uiWatchCombat(app,frame);
const fight = app.game.fight;
if (!fight) return;
const notes = uiNoteHit(fight,frame.now);
fight.actors.forEach(function (actor) { uiDrawActor(ctx,frame,{ actor,notes,calm:Boolean(fight.calm) }); });
uiDrawQueuedPills(ctx,frame);
uiDrawHitFlash(ctx,frame,notes.hitAt);
uiShakeStage(app,frame);
}

export { uiDrawActors,uiDrawActorTag,uiRegisterActorPainter };

import { actorIntent } from '../game/actors.js';
import { pulseAt } from '../game/wayfinding.js';
import { uiWatchCombat } from './grid-combat-fx.js';
import { uiCrashDrop,uiDrawBurst,uiDrawDust,uiDrawHitFlash,uiDroneClock,uiNoteHit,uiShakeStage } from './grid-drone-fx.js';
import { uiBoxesMeet,uiNotchedBox,uiOutlinedText,uiTextWidth,uiWorldFont } from './grid-world-text.js';

const DRONE_ART = ['x.....x','xx.x.xx','.xxexx.','..xxx..','...x...'];
const ART_TILES = 0.9;
const BOB_TILES = 0.04;
const BOB_MS = 300;
const PILL = { fontPx:12,padX:6,height:18,overlap:0.3,gap:2,edge:3,tries:5 };
const RING_RADIUS_TILES = 0.62;
const RING_GROW_TILES = 0.18;
const RING_PX = 3;
const TRACK_ALPHA = 0.35;
const COUNT_FULL = 3;
const HALF = 0.5;
const FULL_TURN = Math.PI * 2;
const TOP = -Math.PI / 2;
const ALERT_ARM = 1;
const CALM_LABEL = 'HOVERS';

const uiPlaced = new WeakMap();

function uiBobOf(frame) {
return frame.reducedMotion ? 0 :Math.sin(frame.now / BOB_MS) * BOB_TILES * frame.tile;
}
function uiDrawArt(ctx,frame,spot) {
const pixel = (frame.tile * ART_TILES) / DRONE_ART[0].length;
const left = spot.left + (frame.tile - pixel * DRONE_ART[0].length) * HALF;
const top = spot.top + spot.drop + uiBobOf(frame) + (frame.tile - pixel * DRONE_ART.length) * HALF;
DRONE_ART.forEach(function (line,row) {
[...line].forEach(function (glyph,col) {
if (glyph === '.') return;
ctx.fillStyle = glyph === 'e' ? frame.palette.bg :spot.colour;
ctx.fillRect(left + col * pixel,top + row * pixel,pixel,pixel);
});
});
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
const pulse = pulseAt(frame.now,frame.reducedMotion);
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
ctx.arc(centre.x,centre.y,radius,TOP,TOP + FULL_TURN * Math.min(intent.inTicks / COUNT_FULL,1));
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
function uiDrawPill(ctx,frame,spot) {
const text = uiPillText(spot);
if (text === '') return;
const width = uiTextWidth(ctx,text,uiWorldFont(PILL.fontPx)) + PILL.padX * 2;
const box = uiPillBox(frame,spot,width);
const tone = uiUrgent(uiIntentOf(spot)) ? 'red' :spot.calm ? 'dim' :'amber';
uiNotchedBox(ctx,frame,{ ...box,edge:tone,fill:'bg' });
uiOutlinedText(ctx,frame,{ text,x:box.left + width * HALF,y:box.top + box.height * HALF,font:uiWorldFont(PILL.fontPx),ink:'text' });
}
function uiDrawActorTag(ctx,frame,spot) {
if (!uiInView(frame,spot)) return;
if (spot.ring || spot.calm || uiIntentOf(spot)) uiDrawRing(ctx,frame,spot);
uiDrawPill(ctx,frame,spot);
}
function uiDrawDrone(ctx,frame,spot) {
const actor = spot.actor;
const cell = { actor,calm:spot.calm,ring:true,left:(actor.col - frame.camera.col) * frame.tile,top:(actor.row - frame.camera.row) * frame.tile };
const drop = uiCrashDrop(frame,{ top:cell.top,age:spot.age });
uiDrawArt(ctx,frame,{ ...cell,drop,colour:actor.arm <= ALERT_ARM ? frame.palette.red :frame.palette.cyan });
uiDrawActorTag(ctx,frame,cell);
uiDrawDust(ctx,frame,spot);
}
const PAINTERS = new Map([['drone',uiDrawDrone]]);
function uiRegisterActorPainter(kind,painter) {
PAINTERS.set(kind,painter);
}
function uiDrawActor(ctx,frame,spot) {
const painter = PAINTERS.get(spot.actor.kind ?? 'drone');
if (!painter) return;
const clock = uiDroneClock(spot.notes,spot.actor,frame.now);
if (spot.actor.hp > 0) painter(ctx,frame,{ actor:spot.actor,calm:spot.calm,age:frame.now - clock.born });
else uiDrawBurst(ctx,frame,{ actor:spot.actor,age:frame.now - clock.died });
}
function uiDrawActors(ctx,app,frame) {
uiWatchCombat(app,frame);
const fight = app.game.fight;
if (!fight) return;
const notes = uiNoteHit(fight,frame.now);
fight.actors.forEach(function (actor) { uiDrawActor(ctx,frame,{ actor,notes,calm:Boolean(fight.calm) }); });
uiDrawHitFlash(ctx,frame,notes.hitAt);
uiShakeStage(app,frame,notes.hitAt);
}

export { uiDrawActors,uiDrawActorTag,uiRegisterActorPainter };

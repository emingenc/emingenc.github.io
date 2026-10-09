import { actorIntent } from '../game/actors.js';
import { pulseAt } from '../game/wayfinding.js';
import { uiCrashDrop,uiDrawBurst,uiDrawDust,uiDrawHitFlash,uiDroneClock,uiNoteHit,uiShakeStage } from './grid-drone-fx.js';

const DRONE_ART = ['x.....x','xx.x.xx','.xxexx.','..xxx..','...x...'];
const ART_TILES = 0.9;
const BOB_TILES = 0.04;
const BOB_MS = 300;
const TAG_FONT_TILES = 0.9;
const TAG_GAP_TILES = 0.4;
const TAG_OUTLINE_PX = 4;
const TAG_FONT = 'px VT323, monospace';
const RING_RADIUS_TILES = 0.62;
const RING_GROW_TILES = 0.18;
const RING_PX = 3;
const HALF = 0.5;
const FULL_TURN = Math.PI * 2;
const ALERT_ARM = 1;

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
function uiDrawRing(ctx,frame,spot) {
const pulse = pulseAt(frame.now,frame.reducedMotion);
ctx.lineWidth = RING_PX;
ctx.strokeStyle = frame.palette.amber;
ctx.beginPath();
ctx.arc(spot.left + frame.tile * HALF,spot.top + frame.tile * HALF,frame.tile * (RING_RADIUS_TILES + RING_GROW_TILES * pulse),0,FULL_TURN);
ctx.stroke();
}
function uiDrawTag(ctx,frame,spot) {
const size = Math.round(frame.tile * TAG_FONT_TILES);
const gap = frame.tile * TAG_GAP_TILES;
const above = spot.top >= size + gap;
const centre = spot.left + frame.tile * HALF;
const baseline = above ? spot.top - gap :spot.top + frame.tile + gap;
const label = actorIntent(spot.actor).label;
ctx.font = size + TAG_FONT;
ctx.textAlign = 'center';
ctx.textBaseline = above ? 'bottom' :'top';
ctx.lineWidth = TAG_OUTLINE_PX;
ctx.strokeStyle = frame.palette.bg;
ctx.strokeText(label,centre,baseline);
ctx.fillStyle = frame.palette.amber;
ctx.fillText(label,centre,baseline);
}
function uiDrawDrone(ctx,frame,spot) {
const actor = spot.actor;
const cell = { actor,left:(actor.col - frame.camera.col) * frame.tile,top:(actor.row - frame.camera.row) * frame.tile };
const drop = uiCrashDrop(frame,{ top:cell.top,age:spot.age });
uiDrawArt(ctx,frame,{ ...cell,drop,colour:actor.arm <= ALERT_ARM ? frame.palette.red :frame.palette.cyan });
uiDrawRing(ctx,frame,cell);
uiDrawTag(ctx,frame,cell);
uiDrawDust(ctx,frame,spot);
}
function uiDrawActor(ctx,frame,spot) {
const clock = uiDroneClock(spot.notes,spot.actor,frame.now);
if (spot.actor.hp > 0) uiDrawDrone(ctx,frame,{ actor:spot.actor,age:frame.now - clock.born });
else uiDrawBurst(ctx,frame,{ actor:spot.actor,age:frame.now - clock.died });
}
function uiDrawActors(ctx,app,frame) {
const fight = app.game.fight;
if (!fight) return;
const notes = uiNoteHit(fight,frame.now);
fight.actors.forEach(function (actor) { uiDrawActor(ctx,frame,{ actor,notes }); });
uiDrawHitFlash(ctx,frame,notes.hitAt);
uiShakeStage(app,frame,notes.hitAt);
}

export { uiDrawActors };

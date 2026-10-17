import { floodSpec } from '../game/power/flood.js';
import { uiRegisterActorPainter } from './grid-draw-actors.js';
import { uiSpotOf } from './grid-spot.js';

const BIT_ART = ['.x.x.','xxxxx','xexex','xxxxx','.x.x.'];
const BIT_TILES = 0.7;
const BOB_TILES = 0.04;
const BOB_MS = 250;
const HALF = 0.5;
const LOCK_TILES = 0.34;
const LOCK_EDGE_TILES = 0.06;
const LOCK_OUTLINE_PX = 2;
const LOCK_BODY_AT = 0.45;
const LOCK_BAR_SHARE = 0.22;
const PIP_TILES = 0.16;
const PIP_GAP_TILES = 0.06;
const PIP_TOP_TILES = 0.04;
const PIP_COUNT = floodSpec.hold + 1;
const PIP_LIT_INK = 'red';
const PIP_DIM_INK = 'border';
const LOCK_INK = 'cyan';
const RING_INK = 'amber';
const RING_TILES = 0.5;
const RING_PULSE_TILES = 0.12;
const RING_PX = 3;
const RING_MS = 220;
const FULL_TURN = Math.PI * 2;

function uiBobOf(frame) {
return frame.reducedMotion ? 0 :Math.sin(frame.now / BOB_MS) * BOB_TILES * frame.tile;
}
function uiDrawBit(ctx,frame,spot) {
const actor = spot.actor;
const pixel = (frame.tile * BIT_TILES) / BIT_ART[0].length;
const left = (actor.col - frame.camera.col) * frame.tile + (frame.tile - pixel * BIT_ART[0].length) * HALF;
const top = (actor.row - frame.camera.row) * frame.tile + uiBobOf(frame) + (frame.tile - pixel * BIT_ART.length) * HALF;
BIT_ART.forEach(function (line,row) {
[...line].forEach(function (glyph,col) {
if (glyph === '.') return;
ctx.fillStyle = glyph === 'e' ? frame.palette.bg :frame.palette.red;
ctx.fillRect(left + col * pixel,top + row * pixel,pixel,pixel);
});
});
}
function uiRegisterFloodPainter() {
uiRegisterActorPainter('flood',uiDrawBit);
}
function uiPaintPadlock(ctx,frame,spot) {
const size = frame.tile * LOCK_TILES;
const left = spot.left + frame.tile - size - frame.tile * LOCK_EDGE_TILES;
const top = spot.top + frame.tile * LOCK_EDGE_TILES;
const bar = size * LOCK_BAR_SHARE;
const bodyTop = top + size * LOCK_BODY_AT;
ctx.fillStyle = frame.palette.bg;
ctx.fillRect(left - LOCK_OUTLINE_PX,top - LOCK_OUTLINE_PX,size + LOCK_OUTLINE_PX * 2,size + LOCK_OUTLINE_PX * 2);
ctx.fillStyle = frame.palette[LOCK_INK];
ctx.fillRect(left,bodyTop,size,top + size - bodyTop);
ctx.fillRect(left + bar,top,bar,bodyTop - top);
ctx.fillRect(left + size - bar * 2,top,bar,bodyTop - top);
ctx.fillRect(left + bar,top,size - bar * 2,bar);
}
function uiPaintPips(ctx,frame,view) {
const spot = uiSpotOf(view.cell,frame);
if (!spot) return;
const pip = frame.tile * PIP_TILES;
const gap = frame.tile * PIP_GAP_TILES;
for (let index = 0; index < PIP_COUNT; index += 1) {
ctx.fillStyle = frame.palette[index < view.rewrites ? PIP_LIT_INK :PIP_DIM_INK];
ctx.fillRect(spot.left + gap + index * (pip + gap),spot.top + frame.tile * PIP_TOP_TILES,pip,pip);
}
}
function uiPaintRing(ctx,frame,cell) {
const spot = uiSpotOf(cell,frame);
if (!spot) return;
const swell = frame.reducedMotion ? 0 :(Math.sin(frame.now / RING_MS) + 1) * HALF;
ctx.strokeStyle = frame.palette[RING_INK];
ctx.lineWidth = RING_PX;
ctx.beginPath();
ctx.arc(spot.left + frame.tile * HALF,spot.top + frame.tile * HALF,frame.tile * (RING_TILES + swell * RING_PULSE_TILES),0,FULL_TURN);
ctx.stroke();
}
function uiPaintFloodMarks(ctx,frame,view) {
view.held.map((cell) => uiSpotOf(cell,frame)).filter(Boolean).forEach((spot) => uiPaintPadlock(ctx,frame,spot));
if (view.run) uiPaintPips(ctx,frame,view.run);
if (view.ring) uiPaintRing(ctx,frame,view.ring);
}

export { uiPaintFloodMarks,uiRegisterFloodPainter };

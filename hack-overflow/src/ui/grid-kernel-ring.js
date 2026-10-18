import { KERNEL_DOOR } from '../game/finale/roadback.js';
import { ringAlive,tintAlpha } from '../game/finale/kernel-ring.js';
import { ringCells } from '../game/finale/siege.js';
import { uiSpotOf } from './grid-spot.js';

const ALPHA_DIGITS = 3;
const TINT_RGB = '180,30,60';
const BLOCK_FILL = '#3a0a14';
const BLOCK_EDGE = '#ff3355';
const GLITCH_FILL = '#ff7788';
const LABEL_FILL = '#ffd0d6';
const LABEL_TEXT = 'ROOT';
const INSET_TILES = 0.06;
const EDGE_TILES = 0.07;
const GLITCH_WIDE = 0.5;
const GLITCH_HIGH = 0.1;
const GLITCH_LEFT = 0.15;
const GLITCH_STEPS = 3;
const GLITCH_TOP = 0.2;
const GLITCH_GAP = 0.25;
const FONT_TILES = 0.34;
const FONT_FACE = 'px VT323, monospace';
const MIDDLE = 0.5;

function uiRingOn(kernel) {
return Boolean(kernel) && Number.isFinite(kernel.good) && kernel.n > 0;
}
function uiRingTint(ctx,frame,alpha) {
if (alpha <= 0) return;
ctx.fillStyle = 'rgba(' + TINT_RGB + ',' + alpha.toFixed(ALPHA_DIGITS) + ')';
ctx.fillRect(0,0,frame.width,frame.height);
}
function uiRingGlitch(ctx,frame,mark) {
const step = (mark.cell.col + mark.cell.row) % GLITCH_STEPS;
ctx.fillStyle = GLITCH_FILL;
ctx.fillRect(mark.spot.left + frame.tile * GLITCH_LEFT,mark.spot.top + frame.tile * (GLITCH_TOP + step * GLITCH_GAP),
frame.tile * GLITCH_WIDE,Math.max(1,frame.tile * GLITCH_HIGH));
}
function uiRingBlock(ctx,frame,cell) {
const spot = uiSpotOf(cell,frame);
if (!spot) return;
const inset = frame.tile * INSET_TILES;
const edge = Math.max(1,Math.round(frame.tile * EDGE_TILES));
const size = frame.tile - 2 * inset;
ctx.fillStyle = BLOCK_EDGE;
ctx.fillRect(spot.left + inset,spot.top + inset,size,size);
ctx.fillStyle = BLOCK_FILL;
ctx.fillRect(spot.left + inset + edge,spot.top + inset + edge,size - 2 * edge,size - 2 * edge);
uiRingGlitch(ctx,frame,{ cell,spot });
}
function uiRingNearest(cells) {
const gap = (cell) => (cell.col - KERNEL_DOOR.col) ** 2 + (cell.row - KERNEL_DOOR.row) ** 2;
return cells.reduce((best,cell) => (best && gap(best) <= gap(cell) ? best :cell),null);
}
function uiRingLabel(ctx,frame,cell) {
const spot = cell && uiSpotOf(cell,frame);
if (!spot) return;
ctx.fillStyle = LABEL_FILL;
ctx.font = Math.round(frame.tile * FONT_TILES) + FONT_FACE;
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';
ctx.fillText(LABEL_TEXT,spot.left + frame.tile * MIDDLE,spot.top + frame.tile * MIDDLE);
}
function uiPaintRing(ctx,frame,app) {
const kernel = app.game.kernel;
if (!uiRingOn(kernel)) return;
const standing = ringAlive(ringCells(app.game.world),kernel.n,kernel.good);
uiRingTint(ctx,frame,tintAlpha(kernel.n,kernel.good));
standing.forEach((cell) => uiRingBlock(ctx,frame,cell));
uiRingLabel(ctx,frame,uiRingNearest(standing));
}

export { uiPaintRing };

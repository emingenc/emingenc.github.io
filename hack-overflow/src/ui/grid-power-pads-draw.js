import { PADS } from '../game/power/pads.js';
import { uiSpotOf } from './grid-spot.js';

const INSET_TILES = 0.3;
const BAR_TILES = 0.07;
const DOT_TILES = 0.16;
const HALF = 0.5;
const IDLE_INK = 'border';
const TAGGED_INK = 'cyan';

function uiDrawRing(ctx,frame,spot) {
const inset = frame.tile * INSET_TILES;
const bar = frame.tile * BAR_TILES;
const side = frame.tile - inset * 2;
ctx.fillRect(spot.left + inset,spot.top + inset,side,bar);
ctx.fillRect(spot.left + inset,spot.top + inset + side - bar,side,bar);
ctx.fillRect(spot.left + inset,spot.top + inset,bar,side);
ctx.fillRect(spot.left + inset + side - bar,spot.top + inset,bar,side);
}
function uiDrawDot(ctx,frame,spot) {
const dot = frame.tile * DOT_TILES;
ctx.fillRect(spot.left + frame.tile * HALF - dot / 2,spot.top + frame.tile * HALF - dot / 2,dot,dot);
}
function uiPaintPadMarks(ctx,frame,tagged) {
PADS.forEach((pad) => {
const spot = uiSpotOf(pad,frame);
if (!spot) return;
const lit = tagged.includes(pad.id);
ctx.fillStyle = frame.palette[lit ? TAGGED_INK :IDLE_INK];
uiDrawRing(ctx,frame,spot);
if (lit) uiDrawDot(ctx,frame,spot);
});
}

export { uiPaintPadMarks };

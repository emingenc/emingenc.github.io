import { LOCKERS,isSealed } from '../game/power/lockers.js';
import { uiSpotOf } from './grid-spot.js';

const INSET_TILES = 0.1;
const BAR_TILES = 0.1;
const HATCH_STEPS = 6;
const BOX_LEFT_TILES = 0.3;
const BOX_TOP_TILES = 0.4;
const BOX_SIDE_TILES = 0.4;
const BOX_BAR_TILES = 0.08;

function uiPaintFrame(ctx,frame,spot) {
const edge = frame.tile * INSET_TILES;
const side = frame.tile - edge * 2;
const bar = frame.tile * BAR_TILES;
ctx.fillStyle = frame.palette.panel;
ctx.fillRect(spot.left + edge,spot.top + edge,side,side);
ctx.fillStyle = frame.palette.amber;
ctx.fillRect(spot.left + edge,spot.top + edge,side,bar);
ctx.fillRect(spot.left + edge,spot.top + edge + side - bar,side,bar);
ctx.fillRect(spot.left + edge,spot.top + edge,bar,side);
ctx.fillRect(spot.left + edge + side - bar,spot.top + edge,bar,side);
}
function uiPaintCross(ctx,frame,spot) {
const edge = frame.tile * (INSET_TILES + BAR_TILES);
const step = (frame.tile - edge * 2) / HATCH_STEPS;
ctx.fillStyle = frame.palette.amber;
for (let at = 0; at < HATCH_STEPS; at += 1) {
ctx.fillRect(spot.left + edge + at * step,spot.top + edge + at * step,step,step);
ctx.fillRect(spot.left + edge + (HATCH_STEPS - 1 - at) * step,spot.top + edge + at * step,step,step);
}
}
function uiPaintHatch(ctx,frame,spot) {
uiPaintFrame(ctx,frame,spot);
uiPaintCross(ctx,frame,spot);
}
function uiPaintOpened(ctx,frame,spot) {
const side = frame.tile * BOX_SIDE_TILES;
const bar = frame.tile * BOX_BAR_TILES;
const left = spot.left + frame.tile * BOX_LEFT_TILES;
const top = spot.top + frame.tile * BOX_TOP_TILES;
ctx.fillStyle = frame.palette.cyan;
ctx.fillRect(left,top + side - bar,side,bar);
ctx.fillRect(left,top,bar,side);
ctx.fillRect(left + side - bar,top,bar,side);
}
function uiPaintLockers(ctx,app,frame) {
LOCKERS.forEach(function (locker) {
const spot = uiSpotOf(locker,frame);
if (!spot) return;
if (isSealed(app.game.ext,locker.id)) uiPaintHatch(ctx,frame,spot);
else uiPaintOpened(ctx,frame,spot);
});
}

export { uiPaintLockers };

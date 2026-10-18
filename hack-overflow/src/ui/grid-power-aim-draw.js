import { uiSpotOf } from './grid-spot.js';

const WASH_ALPHA = 0.2;
const BREATH_MS = 600;
const BREATH_DEPTH = 0.08;
const ARM_TILES = 0.32;
const BAR_TILES = 0.09;
const INKS = { TAG:'cyan',BOLT:'amber' };

function uiArm(frame) {
const breath = frame.reducedMotion ? 0 :Math.sin(frame.now / BREATH_MS) * BREATH_DEPTH;
return frame.tile * (ARM_TILES + breath);
}
function uiDrawBrackets(ctx,frame,spot) {
const arm = uiArm(frame);
const bar = frame.tile * BAR_TILES;
const right = spot.left + frame.tile;
const bottom = spot.top + frame.tile;
ctx.fillRect(spot.left,spot.top,arm,bar);
ctx.fillRect(spot.left,spot.top,bar,arm);
ctx.fillRect(right - arm,spot.top,arm,bar);
ctx.fillRect(right - bar,spot.top,bar,arm);
ctx.fillRect(spot.left,bottom - bar,arm,bar);
ctx.fillRect(spot.left,bottom - arm,bar,arm);
ctx.fillRect(right - arm,bottom - bar,arm,bar);
ctx.fillRect(right - bar,bottom - arm,bar,arm);
}
function uiPaintAimMark(ctx,frame,mark) {
const spot = uiSpotOf(mark,frame);
if (!spot) return;
ctx.fillStyle = frame.palette[INKS[mark.verb] || INKS.TAG];
ctx.globalAlpha = WASH_ALPHA;
ctx.fillRect(spot.left,spot.top,frame.tile,frame.tile);
ctx.globalAlpha = 1;
uiDrawBrackets(ctx,frame,spot);
}

export { uiPaintAimMark };

import { uiSpotOf } from './grid-spot.js';

const HALF = 0.5;
const FONT = 'px VT323, monospace';
const TEXT_MODE = 'optimizeSpeed';
const PULSE_MS = 420;
const GLINT_ARM = 0.34;
const GLINT_THICK = 0.1;
const GLINT_LOW = 0.55;
const NUMBER_INSET = 0.16;
const NUMBER_TILES = 0.5;
const NUMBER_BORDER = 2;
const SPARK_MS = 170;
const SPARK_TILES = 0.1;
const SPARKS = Object.freeze([{ across:0.22,down:0.3 },{ across:0.68,down:0.22 },{ across:0.46,down:0.7 }]);
const FAN_BODY = Object.freeze({ inset:0.22,span:0.56 });
const FAN_BAR = 0.1;
const SMOKE_COUNT = 3;
const SMOKE_TILES = 0.12;
const SMOKE_RISE = 0.3;
const SMOKE_MS = 900;
const WAIT_TILES = 0.4;
const WAIT_AT = Object.freeze({ across:0.78,down:0.12 });
const FLICKER_MS = 110;
const FLICKER_ALPHA = Object.freeze({ low:0.12,high:0.5 });
const OUTLINE_TILES = 0.06;
const SWEEP_MS = 520;
const SWEEP_BAR = 0.16;
const SWEEP_FILL = 0.3;

function uiPulseOf(frame,period) {
return frame.reducedMotion ? 1 :(Math.sin(frame.now / period) + 1) * HALF;
}
function uiLoopOf(frame,period) {
return frame.reducedMotion ? HALF :(frame.now % period) / period;
}
function uiPhaseOf(frame,period) {
return frame.reducedMotion ? 0 :Math.floor(frame.now / period);
}
function uiRect(ctx,box) {
ctx.fillStyle = box.colour;
ctx.fillRect(box.left,box.top,box.width,box.height);
}
function uiPaintGlint(ctx,frame,spot) {
const arm = frame.tile * GLINT_ARM * (GLINT_LOW + (1 - GLINT_LOW) * uiPulseOf(frame,PULSE_MS));
const thick = frame.tile * GLINT_THICK;
const middle = { left:spot.left + frame.tile * HALF,top:spot.top + frame.tile * HALF };
const colour = frame.palette.amber;
uiRect(ctx,{ left:middle.left - arm,top:middle.top - thick * HALF,width:arm * 2,height:thick,colour });
uiRect(ctx,{ left:middle.left - thick * HALF,top:middle.top - arm,width:thick,height:arm * 2,colour });
uiRect(ctx,{ left:middle.left - thick,top:middle.top - thick,width:thick * 2,height:thick * 2,colour:frame.palette.bright });
}
function uiPaintNumber(ctx,frame,spot) {
const mark = spot.mark;
const inset = frame.tile * NUMBER_INSET;
const size = frame.tile - inset * 2;
const colour = mark.done ? frame.palette.dim :frame.palette[mark.tone || 'amber'];
uiRect(ctx,{ left:spot.left + inset,top:spot.top + inset,width:size,height:size,colour });
uiRect(ctx,{
left:spot.left + inset + NUMBER_BORDER,top:spot.top + inset + NUMBER_BORDER,width:size - NUMBER_BORDER * 2,height:size - NUMBER_BORDER * 2,
colour:frame.palette.bg,
});
ctx.font = Math.round(frame.tile * NUMBER_TILES) + FONT;
ctx.textRendering = TEXT_MODE;
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';
ctx.fillStyle = colour;
ctx.fillText(String(mark.n),spot.left + frame.tile * HALF,spot.top + frame.tile * HALF);
}
function uiPaintShimmer(ctx,frame,spot) {
const phase = uiPhaseOf(frame,SPARK_MS);
const size = frame.tile * SPARK_TILES;
SPARKS.forEach(function (spark,index) {
if (!frame.reducedMotion && (phase + index) % SPARKS.length === 0) return;
uiRect(ctx,{ left:spot.left + frame.tile * spark.across,top:spot.top + frame.tile * spark.down,width:size,height:size,colour:frame.palette.cyan });
});
}
function uiPaintSmoke(ctx,frame,spot) {
const size = frame.tile * SMOKE_TILES;
for (let puff = 0; puff < SMOKE_COUNT; puff += 1) {
const along = (uiLoopOf(frame,SMOKE_MS) + puff / SMOKE_COUNT) % 1;
ctx.globalAlpha = 1 - along;
uiRect(ctx,{
left:spot.left + frame.tile * (FAN_BODY.inset + FAN_BODY.span * (puff + 1) / (SMOKE_COUNT + 1)) - size * HALF,
top:spot.top + frame.tile * (FAN_BODY.inset - SMOKE_RISE * along),width:size,height:size,colour:frame.palette.red,
});
}
ctx.globalAlpha = 1;
}
function uiPaintFan(ctx,frame,spot) {
const mark = spot.mark;
const tile = frame.tile;
const body = { left:spot.left + tile * FAN_BODY.inset,top:spot.top + tile * FAN_BODY.inset,size:tile * FAN_BODY.span };
const bar = tile * FAN_BAR;
const colour = mark.due ? frame.palette.red :frame.palette.dim;
uiRect(ctx,{ left:body.left,top:body.top + (body.size - bar) * HALF,width:body.size,height:bar,colour });
uiRect(ctx,{ left:body.left + (body.size - bar) * HALF,top:body.top,width:bar,height:body.size,colour });
if (!mark.due) return;
uiPaintSmoke(ctx,frame,spot);
ctx.font = Math.round(tile * WAIT_TILES) + FONT;
ctx.textRendering = TEXT_MODE;
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';
ctx.fillStyle = frame.palette.amber;
ctx.fillText('...',spot.left + tile * WAIT_AT.across,spot.top + tile * WAIT_AT.down);
}
function uiPaintFlicker(ctx,frame,spot) {
const tile = frame.tile;
const lit = uiPhaseOf(frame,FLICKER_MS) % 2 === 0;
ctx.globalAlpha = lit ? FLICKER_ALPHA.high :FLICKER_ALPHA.low;
uiRect(ctx,{ left:spot.left,top:spot.top,width:tile,height:tile,colour:frame.palette.magenta });
ctx.globalAlpha = 1;
const edge = Math.max(1,Math.round(tile * OUTLINE_TILES));
const colour = frame.palette.magenta;
uiRect(ctx,{ left:spot.left,top:spot.top,width:tile,height:edge,colour });
uiRect(ctx,{ left:spot.left,top:spot.top + tile - edge,width:tile,height:edge,colour });
uiRect(ctx,{ left:spot.left,top:spot.top,width:edge,height:tile,colour });
uiRect(ctx,{ left:spot.left + tile - edge,top:spot.top,width:edge,height:tile,colour });
}
function uiPaintSweep(ctx,frame,spot) {
const tile = frame.tile;
const bar = tile * SWEEP_BAR;
ctx.globalAlpha = SWEEP_FILL;
uiRect(ctx,{ left:spot.left,top:spot.top,width:tile,height:tile,colour:frame.palette.red });
ctx.globalAlpha = 1;
uiRect(ctx,{ left:spot.left,top:spot.top + (tile - bar) * uiLoopOf(frame,SWEEP_MS),width:tile,height:bar,colour:frame.palette.red });
}
const PAINTERS = {
glint:uiPaintGlint,number:uiPaintNumber,shimmer:uiPaintShimmer,fan:uiPaintFan,flicker:uiPaintFlicker,sweep:uiPaintSweep,
};
const MARK_KINDS = Object.freeze(Object.keys(PAINTERS));

function uiPaintMarks(ctx,frame,marks) {
marks.forEach(function (mark) {
const spot = Object.hasOwn(PAINTERS,mark.kind) ? uiSpotOf(mark,frame) :null;
if (spot) PAINTERS[mark.kind](ctx,frame,{ ...spot,mark });
});
}

export { MARK_KINDS,uiPaintMarks,uiRect };

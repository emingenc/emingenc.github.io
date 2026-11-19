import { PADS } from '../game/power/pads.js';
import { createTrack,easeOutBack,trackSeen,trackValue } from '../game/power-feel.js';
import { uiPressBurst } from './grid-power-feel.js';
import { uiSpotOf } from './grid-spot.js';

const BAR_TILES = 0.07;
const DOT_TILES = 0.16;
const HALF = 0.5;
const IDLE_INK = 'border';
const TAGGED_INK = 'cyan';
const GLOW_MS = 140;
const GROW_FROM = 0.6;
const RING_REACH_TILES = 0.2;

const uiGlow = createTrack(GLOW_MS,easeOutBack);
const uiWasLit = new Map();

function uiDrawRing(ctx,frame,place) {
const inset = frame.tile * (HALF - RING_REACH_TILES * place.scale);
const bar = frame.tile * BAR_TILES;
const side = frame.tile - inset * 2;
const { left,top } = place.spot;
ctx.fillRect(left + inset,top + inset,side,bar);
ctx.fillRect(left + inset,top + inset + side - bar,side,bar);
ctx.fillRect(left + inset,top + inset,bar,side);
ctx.fillRect(left + inset + side - bar,top + inset,bar,side);
}
function uiDrawDot(ctx,frame,place) {
const { spot } = place;
const dot = frame.tile * DOT_TILES * place.scale;
ctx.fillRect(spot.left + frame.tile * HALF - dot / 2,spot.top + frame.tile * HALF - dot / 2,dot,dot);
}
function uiPadLevel(frame,pad,lit) {
if (lit && !frame.reducedMotion && uiWasLit.get(pad.id) === false) uiPressBurst(pad,'pop');
uiWasLit.set(pad.id,lit);
trackSeen(uiGlow,pad.id,{ value:lit ? 1 :0,now:frame.now });
return frame.reducedMotion ? Number(lit) :trackValue(uiGlow,pad.id,frame.now);
}
function uiDrawLit(ctx,frame,place) {
ctx.globalAlpha = Math.min(place.level,1);
ctx.fillStyle = frame.palette[TAGGED_INK];
uiDrawRing(ctx,frame,{ spot:place.spot,scale:GROW_FROM + (1 - GROW_FROM) * place.level });
uiDrawDot(ctx,frame,{ spot:place.spot,scale:place.level });
ctx.globalAlpha = 1;
}
function uiPaintPadMarks(ctx,frame,tagged) {
PADS.forEach((pad) => {
const level = uiPadLevel(frame,pad,tagged.includes(pad.id));
const spot = uiSpotOf(pad,frame);
if (!spot) return;
if (level < 1) {
ctx.fillStyle = frame.palette[IDLE_INK];
uiDrawRing(ctx,frame,{ spot,scale:1 });
}
if (level > 0) uiDrawLit(ctx,frame,{ spot,level });
});
}

export { uiPaintPadMarks };

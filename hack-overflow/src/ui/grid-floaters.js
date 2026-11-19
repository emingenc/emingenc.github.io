import { FLOAT,popScale,riseAt,fadeAt } from '../game/float-feel.js';
import { uiGridPainter } from './grid-draw-fx.js';
import { uiOutlinedText,uiTextWidth,uiWorldFont } from './grid-world-text.js';

const FLOAT_MS = FLOAT.ms;
const HERO_TONE = 'red';
const RISE_TILES = 0.9;
const HERO_RISE_TILES = 0.8;
const START_TILES = 0.2;
const HERO_START_TILES = 0.05;
const FONT_PX = 14;
const HERO_FONT_PX = 18;
const STACK_PX = 16;
const STACK_WITHIN_MS = 400;
const EDGE_PX = 6;
const HALF = 0.5;
const CAP = 16;

let uiFloaters = [];

function uiSameCell(one,other) {
return one.col === other.col && one.row === other.row;
}
function uiStackOf(cell,atMs) {
return uiFloaters.filter(function (float) { return uiSameCell(float,cell) && Math.abs(float.atMs - atMs) < STACK_WITHIN_MS; }).length;
}
function uiFloat(cell,float) {
uiGridPainter(uiDrawFloaters);
const lift = uiStackOf(cell,float.atMs) * STACK_PX;
uiFloaters = [...uiFloaters,{ col:cell.col,row:cell.row,lift,...float }].slice(-CAP);
}
function uiAgeOf(float,frame) {
return frame.now - float.atMs;
}
function uiIsHero(float) {
return float.tone === HERO_TONE;
}
function uiFontPx(float,spot) {
const base = uiIsHero(float) ? HERO_FONT_PX :FONT_PX;
return spot.still ? base :Math.round(base * popScale(spot.age));
}
function uiRiseOf(float,spot) {
if (spot.still) return 0;
return spot.frame.tile * (uiIsHero(float) ? HERO_RISE_TILES :RISE_TILES) * riseAt(spot.age);
}
function uiFloatSpot(ctx,frame,float) {
const spot = { frame,age:Math.max(uiAgeOf(float,frame),0),still:frame.reducedMotion };
const px = uiFontPx(float,spot);
const half = uiTextWidth(ctx,float.text,uiWorldFont(px)) * HALF + EDGE_PX;
const centre = (float.col - frame.camera.col + HALF) * frame.tile;
const start = uiIsHero(float) ? HERO_START_TILES :START_TILES;
const baseline = (float.row - frame.camera.row + start) * frame.tile - float.lift - uiRiseOf(float,spot);
return { x:Math.min(Math.max(centre,half),frame.width - half),y:Math.max(baseline,px),px,age:spot.age };
}
function uiDrawFloat(ctx,frame,float) {
const spot = uiFloatSpot(ctx,frame,float);
ctx.globalAlpha = frame.reducedMotion ? 1 :fadeAt(spot.age);
uiOutlinedText(ctx,frame,{ text:float.text,x:spot.x,y:spot.y,font:uiWorldFont(spot.px),ink:float.tone });
ctx.globalAlpha = 1;
}
function uiDrawFloaters(frame) {
uiFloaters = uiFloaters.filter(function (float) { return uiAgeOf(float,frame) < FLOAT_MS; });
uiFloaters.filter(function (float) { return uiAgeOf(float,frame) >= 0; }).forEach(function (float) { uiDrawFloat(frame.ctx,frame,float); });
}
function uiFloaterTexts() {
return uiFloaters.map(function (float) { return float.text; });
}
function uiFloatersClear() {
uiFloaters = [];
}

export { uiFloat,uiDrawFloaters,uiFloaterTexts,uiFloatersClear,FLOAT_MS };

import { uiGridPainter } from './grid-draw-fx.js';
import { uiOutlinedText,uiTextWidth,uiWorldFont } from './grid-world-text.js';

const FLOAT_MS = 950;
const FADE_FROM = 0.6;
const RISE_TILES = 0.9;
const START_TILES = 0.2;
const FONT_PX = 14;
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
function uiAlphaOf(progress) {
return progress < FADE_FROM ? 1 :1 - (progress - FADE_FROM) / (1 - FADE_FROM);
}
function uiRiseOf(frame,progress) {
return frame.reducedMotion ? 0 :frame.tile * RISE_TILES * (1 - (1 - progress) * (1 - progress));
}
function uiFloatSpot(ctx,frame,float) {
const half = uiTextWidth(ctx,float.text,uiWorldFont(FONT_PX)) * HALF + EDGE_PX;
const centre = (float.col - frame.camera.col + HALF) * frame.tile;
const progress = Math.min(Math.max(uiAgeOf(float,frame) / FLOAT_MS,0),1);
const baseline = (float.row - frame.camera.row + START_TILES) * frame.tile - float.lift - uiRiseOf(frame,progress);
return { x:Math.min(Math.max(centre,half),frame.width - half),y:Math.max(baseline,FONT_PX),progress };
}
function uiDrawFloat(ctx,frame,float) {
const spot = uiFloatSpot(ctx,frame,float);
ctx.globalAlpha = frame.reducedMotion ? 1 :uiAlphaOf(spot.progress);
uiOutlinedText(ctx,frame,{ text:float.text,x:spot.x,y:spot.y,font:uiWorldFont(FONT_PX),ink:float.tone });
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

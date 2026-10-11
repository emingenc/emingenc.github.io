import { VOLLEY } from '../game/power/volley.js';
import { uiSpotOf } from './grid-spot.js';

const PIXELS = 8;
const BRACE_ART = ['..xxx...','..xex...','..xxx.mm','.xxxxxcc','.xxxxxmm','..x.x.cc','..x.x.mm','.xx.xx..'];
const BRACE_INKS = { x:'text',e:'bg',m:'magenta',c:'cyan' };
const PLAQUE = '([()])';
const PLAQUE_FONT = 0.2;
const LANE_FONT = 0.7;
const LANE_STEP = 0.8;
const LANE_START = 0.4;
const PLATE_SIZE = 0.64;
const TOWER_SHIFT = 1;
const HALF = 0.5;
const FONT = 'px VT323, monospace';
const INSET = 0.12;
const DOORWAY_LEFT = 0.3;
const DOORWAY_WIDTH = 0.4;
const EMPTY_BAR = 0.2;
const EMPTY_BAR_WIDE = 1.2;
const ROUND_INK = 'cyan';
const SQUARE_INK = 'magenta';

function uiPaintBrace(ctx,frame,spot) {
const pixel = frame.tile / PIXELS;
BRACE_ART.forEach(function (line,row) {
[...line].forEach(function (glyph,col) {
if (glyph === '.') return;
ctx.fillStyle = frame.palette[BRACE_INKS[glyph]];
ctx.fillRect(spot.left + col * pixel,spot.top + row * pixel,pixel,pixel);
});
});
}
function uiText(ctx,frame,place) {
ctx.font = Math.round(frame.tile * place.size) + FONT;
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';
ctx.fillStyle = frame.palette[place.ink];
ctx.fillText(place.text,place.x,place.y);
}
function uiPaintDoor(ctx,frame,scene) {
const spot = uiSpotOf(VOLLEY.door,frame);
if (!spot) return;
const inset = frame.tile * INSET;
ctx.fillStyle = frame.palette.bg;
ctx.fillRect(spot.left + inset,spot.top + inset,frame.tile - inset * 2,frame.tile - inset * 2);
if (scene.open) {
ctx.fillStyle = frame.palette.amber;
ctx.fillRect(spot.left + frame.tile * DOORWAY_LEFT,spot.top + inset,frame.tile * DOORWAY_WIDTH,frame.tile - inset * 2);
return;
}
uiText(ctx,frame,{ text:PLAQUE,x:spot.left + frame.tile * HALF,y:spot.top + frame.tile * HALF,size:PLAQUE_FONT,ink:'magenta' });
}
function uiGlyphInk(glyph) {
return glyph === '(' || glyph === ')' ? ROUND_INK :SQUARE_INK;
}
function uiPaintLane(ctx,frame,lane) {
const spot = uiSpotOf({ col:VOLLEY.doorFrom.col,row:VOLLEY.doorFrom.row - 1 },frame);
if (!spot) return;
[...lane.text,'$'].forEach(function (glyph,index) {
const now = index === lane.at;
const ink = index < lane.at ? 'dim' :now ? 'bright' :glyph === '$' ? 'amber' :uiGlyphInk(glyph);
uiText(ctx,frame,{ text:glyph,x:spot.left + (LANE_START + index * LANE_STEP) * frame.tile,y:spot.top + frame.tile * HALF,size:LANE_FONT,ink });
});
}
function uiPaintTower(ctx,frame,stack) {
const spot = uiSpotOf({ col:VOLLEY.doorFrom.col + TOWER_SHIFT,row:VOLLEY.doorFrom.row - 2 },frame);
if (!spot) return;
const size = frame.tile * PLATE_SIZE;
if (stack === '') {
ctx.fillStyle = frame.palette.dim;
ctx.fillRect(spot.left,spot.top + (frame.tile - size * EMPTY_BAR) * HALF,frame.tile * EMPTY_BAR_WIDE,size * EMPTY_BAR);
return;
}
[...stack].forEach(function (glyph,index) {
const left = spot.left + (index * LANE_STEP) * frame.tile;
ctx.fillStyle = frame.palette[uiGlyphInk(glyph)];
ctx.fillRect(left,spot.top + (frame.tile - size) * HALF,size,size);
uiText(ctx,frame,{ text:glyph,x:left + size * HALF,y:spot.top + frame.tile * HALF,size:LANE_FONT,ink:'bg' });
});
}
function uiPaintPlate(ctx,frame,scene) {
const brace = uiSpotOf(VOLLEY.brace,frame);
if (brace) uiPaintBrace(ctx,frame,brace);
uiPaintDoor(ctx,frame,scene);
if (!scene.view) return;
uiPaintLane(ctx,frame,{ text:scene.view.lane,at:scene.view.at });
uiPaintTower(ctx,frame,scene.view.stack);
}

export { uiPaintPlate };

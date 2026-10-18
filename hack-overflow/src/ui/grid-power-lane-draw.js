import { LIGHT_STEPS,LANE,laneFrame } from '../game/power/lane.js';
import { LANE_POCKET,LANE_SHOTS,SILL_CELL } from '../game/power/lane-map.js';
import { uiSpotOf } from './grid-spot.js';

const PIXELS = 8;
const SILL_ART = ['..xxx...','..xex.cc','..xxx.c.','.xxxxxc.','.xxxxxc.','..x.x.c.','..x.x.cc','.xx.xx..'];
const SILL_INKS = { x:'text',e:'bg',c:'cyan' };
const SHOT_INKS = { blue:'cyan',green:'primary',amber:'amber',violet:'magenta' };
const FRAME_INK = 'bright';
const LIGHT_INK = 'amber';
const FONT_TILES = 0.6;
const INSET_TILES = 0.1;
const BORDER_TILES = 0.06;
const FRAME_EDGE_TILES = 0.08;
const LIGHT_ALPHA = 0.3;
const BAND_INK = 'cyan';
const BAND_ALPHA = 0.14;
const BAND_EDGE_TILES = 0.05;
const WASH_ALPHA = 0.22;
const CAPTION = 'FRAME';
const CAPTION_TILES = 0.4;
const CAPTION_LIFT_TILES = 0.12;
const HALF = 0.5;
const FONT = 'px VT323, monospace';
const POCKET_ROWS = LANE_POCKET.maxRow - LANE_POCKET.minRow + 1;

function uiPaintSill(ctx,frame,spot) {
const pixel = frame.tile / PIXELS;
SILL_ART.forEach(function (line,row) {
[...line].forEach(function (glyph,col) {
if (glyph === '.') return;
ctx.fillStyle = frame.palette[SILL_INKS[glyph]];
ctx.fillRect(spot.left + col * pixel,spot.top + row * pixel,pixel,pixel);
});
});
}
function uiDrawBand(ctx,frame) {
const first = uiSpotOf(LANE_SHOTS[0],frame);
if (!first) return;
const width = frame.tile * LANE_SHOTS.length;
const edge = frame.tile * BAND_EDGE_TILES;
ctx.fillStyle = frame.palette[BAND_INK];
ctx.globalAlpha = BAND_ALPHA;
ctx.fillRect(first.left,first.top,width,frame.tile);
ctx.globalAlpha = 1;
ctx.fillRect(first.left,first.top,width,edge);
ctx.fillRect(first.left,first.top + frame.tile - edge,width,edge);
}
function uiDrawShot(ctx,frame,{ shot,spot }) {
const edge = frame.tile * INSET_TILES;
const border = frame.tile * BORDER_TILES;
const side = frame.tile - edge * 2;
const ink = frame.palette[SHOT_INKS[shot.colour]];
ctx.fillStyle = ink;
ctx.fillRect(spot.left + edge,spot.top + edge,side,side);
ctx.fillStyle = frame.palette.panel;
ctx.fillRect(spot.left + edge + border,spot.top + edge + border,side - border * 2,side - border * 2);
ctx.font = Math.round(frame.tile * FONT_TILES) + FONT;
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';
ctx.fillStyle = ink;
ctx.fillText(shot.glyph,spot.left + frame.tile * HALF,spot.top + frame.tile * HALF);
}
function uiDrawShots(ctx,frame) {
LANE.shots.forEach(function (shot,index) {
const spot = uiSpotOf(LANE_SHOTS[index],frame);
if (spot) uiDrawShot(ctx,frame,{ shot,spot });
});
}
function uiDrawFrame(ctx,frame,state) {
const first = uiSpotOf(LANE_SHOTS[state.l],frame);
if (!first) return;
const edge = frame.tile * FRAME_EDGE_TILES;
const width = frame.tile * laneFrame(state).length;
ctx.fillStyle = frame.palette[BAND_INK];
ctx.globalAlpha = WASH_ALPHA;
ctx.fillRect(first.left,first.top,width,frame.tile);
ctx.globalAlpha = 1;
ctx.font = Math.round(frame.tile * CAPTION_TILES) + FONT;
ctx.textAlign = 'center';
ctx.textBaseline = 'bottom';
ctx.fillStyle = frame.palette[FRAME_INK];
ctx.fillText(CAPTION,first.left + width / 2,first.top - frame.tile * CAPTION_LIFT_TILES);
ctx.fillRect(first.left,first.top,width,edge);
ctx.fillRect(first.left,first.top + frame.tile - edge,width,edge);
ctx.fillRect(first.left,first.top,edge,frame.tile);
ctx.fillRect(first.left + width - edge,first.top,edge,frame.tile);
}
function uiLightColumn(light) {
return Math.floor(light * LANE_SHOTS.length / LIGHT_STEPS);
}
function uiDrawLight(ctx,frame,light) {
const column = uiLightColumn(light);
if (light === 0 || column >= LANE_SHOTS.length) return;
const spot = uiSpotOf({ col:LANE_POCKET.minCol + column,row:LANE_POCKET.minRow },frame);
if (!spot) return;
ctx.globalAlpha = LIGHT_ALPHA;
ctx.fillStyle = frame.palette[LIGHT_INK];
ctx.fillRect(spot.left,spot.top,frame.tile,frame.tile * POCKET_ROWS);
ctx.globalAlpha = 1;
}
function uiPaintLane(ctx,frame,scene) {
const sill = uiSpotOf(SILL_CELL,frame);
if (sill) uiPaintSill(ctx,frame,sill);
if (!scene) return;
uiDrawBand(ctx,frame);
uiDrawShots(ctx,frame);
uiDrawFrame(ctx,frame,scene);
uiDrawLight(ctx,frame,scene.light);
}

export { uiPaintLane };

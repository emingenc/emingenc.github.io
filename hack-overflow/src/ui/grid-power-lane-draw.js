import { LIGHT_STEPS,LANE,laneFrame } from '../game/power/lane.js';
import { LANE_POCKET,LANE_SHOTS,SILL_CELL } from '../game/power/lane-map.js';
import { createTrack } from '../game/power-feel.js';
import { uiGlideIndex } from './grid-power-feel.js';
import { uiSpotOf } from './grid-spot.js';
import { uiDrawArt } from './art-hook.js';
import { uiFillGlyphs } from './grid-glyph-art.js';

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
const GLIDE_MS = 150;
const POCKET_ROWS = LANE_POCKET.maxRow - LANE_POCKET.minRow + 1;

const uiGlide = createTrack(GLIDE_MS);

function uiPaintSill(ctx,frame,spot) {
if (uiDrawArt(ctx,'sill',{ left:spot.left,top:spot.top,size:frame.tile,dpr:frame.dpr,palette:frame.palette,accent:'cyan' })) return;
const pixel = frame.tile / PIXELS;
uiFillGlyphs(ctx,SILL_ART,{ left:spot.left,top:spot.top,pixel,ink:(glyph) => frame.palette[SILL_INKS[glyph]] });
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
function uiDrawCaption(ctx,frame,at) {
ctx.font = Math.round(frame.tile * CAPTION_TILES) + FONT;
ctx.textAlign = 'center';
ctx.textBaseline = 'bottom';
ctx.fillStyle = frame.palette[FRAME_INK];
ctx.fillText(CAPTION,at.x,at.y);
}
function uiDrawFrame(ctx,frame,state) {
const from = uiGlideIndex(uiGlide,'from',{ index:state.l,frame });
const length = uiGlideIndex(uiGlide,'length',{ index:laneFrame(state).length,frame });
const first = uiSpotOf({ col:LANE_SHOTS[0].col + from,row:LANE_SHOTS[0].row },frame);
if (!first) return;
const edge = frame.tile * FRAME_EDGE_TILES;
const width = frame.tile * length;
ctx.fillStyle = frame.palette[BAND_INK];
ctx.globalAlpha = WASH_ALPHA;
ctx.fillRect(first.left,first.top,width,frame.tile);
ctx.globalAlpha = 1;
uiDrawCaption(ctx,frame,{ x:first.left + width / 2,y:first.top - frame.tile * CAPTION_LIFT_TILES });
ctx.fillRect(first.left,first.top,width,edge);
ctx.fillRect(first.left,first.top + frame.tile - edge,width,edge);
ctx.fillRect(first.left,first.top,edge,frame.tile);
ctx.fillRect(first.left + width - edge,first.top,edge,frame.tile);
}
function uiLightColumn(light) {
return Math.floor(light * LANE_SHOTS.length / LIGHT_STEPS);
}
function uiDrawLight(ctx,frame,light) {
const column = uiGlideIndex(uiGlide,'light',{ index:uiLightColumn(light),frame });
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

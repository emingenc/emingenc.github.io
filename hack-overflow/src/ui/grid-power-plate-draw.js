import { VOLLEY } from '../game/power/volley.js';
import { createTrack,dropLook,trackSeen,trackValue } from '../game/power-feel.js';
import { uiDrawArt } from './art-hook.js';
import { uiFillGlyphs } from './grid-glyph-art.js';
import { uiFlashBox,uiPulseLook } from './grid-power-feel.js';
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
const PULSE_KEY = 'volley:';
const MARKER_MS = 120;
const MARKER_KEY = 'at';
const MARKER_WIDTH = 0.5;
const MARKER_HEIGHT = 0.07;
const MARKER_TOP = 0.86;
const REST = { lift:0,alpha:1 };
const NEVER = -Infinity;

const uiMarker = createTrack(MARKER_MS);
const uiTower = { stack:'',grewAt:NEVER };

function uiPaintBrace(ctx,frame,spot) {
if (uiDrawArt(ctx,'brace',{ left:spot.left,top:spot.top,size:frame.tile,dpr:frame.dpr,palette:frame.palette,accent:'cyan' })) return;
const pixel = frame.tile / PIXELS;
uiFillGlyphs(ctx,BRACE_ART,{ left:spot.left,top:spot.top,pixel,ink:(glyph) => frame.palette[BRACE_INKS[glyph]] });
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
const look = uiPulseLook(PULSE_KEY + index,frame);
const laneX = spot.left + (LANE_START + index * LANE_STEP) * frame.tile;
const size = frame.tile * PLATE_SIZE;
uiFlashBox(ctx,{ left:laneX - size * HALF + look.shake * frame.tile,top:spot.top + (frame.tile - size) * HALF,side:size,flash:look.flash,ink:frame.palette.bright });
uiText(ctx,frame,{ text:glyph,x:laneX + look.shake * frame.tile,y:spot.top + frame.tile * HALF,size:LANE_FONT,ink });
});
uiDrawMarker(ctx,frame,{ spot,at:lane.at });
}
function uiDrawMarker(ctx,frame,lane) {
trackSeen(uiMarker,MARKER_KEY,{ value:lane.at,now:frame.now });
const at = frame.reducedMotion ? lane.at :trackValue(uiMarker,MARKER_KEY,frame.now);
const width = frame.tile * MARKER_WIDTH;
ctx.fillStyle = frame.palette.bright;
ctx.fillRect(lane.spot.left + (LANE_START + at * LANE_STEP) * frame.tile - width * HALF,lane.spot.top + frame.tile * MARKER_TOP,width,frame.tile * MARKER_HEIGHT);
}
function uiTowerDrop(frame,stack) {
if (stack.length > uiTower.stack.length && stack.startsWith(uiTower.stack)) uiTower.grewAt = frame.now;
uiTower.stack = stack;
return frame.reducedMotion ? REST :dropLook(frame.now - uiTower.grewAt);
}
function uiDrawTowerPlate(ctx,frame,plate) {
const size = frame.tile * PLATE_SIZE;
const left = plate.spot.left + (plate.index * LANE_STEP) * frame.tile;
const lift = plate.look.lift * frame.tile;
ctx.globalAlpha = plate.look.alpha;
ctx.fillStyle = frame.palette[uiGlyphInk(plate.glyph)];
ctx.fillRect(left,plate.spot.top + (frame.tile - size) * HALF - lift,size,size);
uiText(ctx,frame,{ text:plate.glyph,x:left + size * HALF,y:plate.spot.top + frame.tile * HALF - lift,size:LANE_FONT,ink:'bg' });
}
function uiPaintTower(ctx,frame,stack) {
const spot = uiSpotOf({ col:VOLLEY.doorFrom.col + TOWER_SHIFT,row:VOLLEY.doorFrom.row - 2 },frame);
if (!spot) return;
const size = frame.tile * PLATE_SIZE;
if (stack === '') {
uiTower.stack = '';
ctx.fillStyle = frame.palette.dim;
ctx.fillRect(spot.left,spot.top + (frame.tile - size * EMPTY_BAR) * HALF,frame.tile * EMPTY_BAR_WIDE,size * EMPTY_BAR);
return;
}
const drop = uiTowerDrop(frame,stack);
[...stack].forEach(function (glyph,index) {
uiDrawTowerPlate(ctx,frame,{ glyph,index,spot,look:index === stack.length - 1 ? drop :REST });
});
ctx.globalAlpha = 1;
}
function uiPaintPlate(ctx,frame,scene) {
const brace = uiSpotOf(VOLLEY.brace,frame);
if (brace) uiPaintBrace(ctx,frame,brace);
uiPaintDoor(ctx,frame,scene);
if (!scene.view) return;
uiPaintLane(ctx,frame,{ text:scene.view.lane,at:scene.view.at });
uiPaintTower(ctx,frame,scene.view.stack);
}

function uiGlyphCell(index) {
return { col:VOLLEY.doorFrom.col + LANE_START + index * LANE_STEP - HALF,row:VOLLEY.doorFrom.row - 1 };
}

export { uiPaintPlate,uiGlyphCell,PULSE_KEY };

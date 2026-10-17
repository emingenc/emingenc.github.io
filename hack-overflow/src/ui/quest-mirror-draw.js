import { MIRROR } from '../game/power/mirror.js';
import { signRow } from '../game/walk/mirror-quest.js';
import { uiRect } from './grid-quest-marks.js';
import { uiSpotOf } from './grid-spot.js';

const HALF = 0.5;
const NEAR_CELLS = 2;
const FONT = 'px VT323, monospace';
const TEXT_MODE = 'optimizeSpeed';
const SIZE_TILES = 0.82;
const GAP_TILES = 0.1;
const LIFT_TILES = 1.2;
const BORDER = 2;
const LETTER_TILES = 0.62;
const POINTER_TILES = 0.34;
const CAPTION_TILES = 0.4;
const CAPTION_GAP = 0.12;
const PANEL_ALPHA = 0.85;
const POINTER_DROP = 0.02;
const TONES = Object.freeze({ done:'cyan',next:'amber',bad:'magenta',end:'dim',mid:'dim' });
const LETTER_TONES = Object.freeze({ done:'cyan',next:'bright',bad:'red',end:'dim',mid:'dim' });

function uiText(ctx,frame,spot) {
ctx.font = Math.round(frame.tile * spot.tiles) + FONT;
ctx.textRendering = TEXT_MODE;
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';
ctx.fillStyle = spot.colour;
ctx.fillText(spot.text,spot.x,spot.y);
}
function uiRowBox(frame,spot) {
const tile = frame.tile;
const size = tile * SIZE_TILES;
const gap = tile * GAP_TILES;
const width = size * MIRROR.plates.length + gap * (MIRROR.plates.length - 1);
const centre = spot.left + tile * HALF;
const above = spot.top - tile * LIFT_TILES;
const left = Math.max(0,Math.min(centre - width * HALF,frame.width - width));
return { left,top:above < tile * CAPTION_TILES ? spot.top + tile :above,size,gap,width };
}
function uiPaintTile(ctx,frame,cell) {
const { tile,box,at } = cell;
const left = box.left + at * (box.size + box.gap);
const role = tile.role;
uiRect(ctx,{ left,top:box.top,width:box.size,height:box.size,colour:frame.palette[TONES[role]] });
ctx.globalAlpha = PANEL_ALPHA;
uiRect(ctx,{ left:left + BORDER,top:box.top + BORDER,width:box.size - BORDER * 2,height:box.size - BORDER * 2,colour:frame.palette.bg });
ctx.globalAlpha = 1;
uiText(ctx,frame,{ text:tile.ch,tiles:LETTER_TILES,x:left + box.size * HALF,y:box.top + box.size * HALF,colour:frame.palette[LETTER_TONES[role]] });
if (!tile.pointer) return;
uiText(ctx,frame,{
text:tile.pointer,tiles:POINTER_TILES,x:left + box.size * HALF,y:box.top + box.size + frame.tile * (POINTER_TILES * HALF + POINTER_DROP),
colour:frame.palette[TONES[role]],
});
}
function uiHeroNear(app) {
const pos = app.game.avatar && app.game.avatar.pos;
return Boolean(pos) && Math.max(Math.abs(pos.col - MIRROR.cell.col),Math.abs(pos.row - MIRROR.cell.row)) <= NEAR_CELLS;
}
function uiSignShown(app) {
const power = app.game.power;
const sign = power && power.gen === app.game.gen && power.bridge ? power.bridge.sign :null;
return sign && (sign.open || (sign.state.status === 'found' && uiHeroNear(app))) ? sign.state :null;
}
function uiDrawMirrorSign(ctx,app,frame) {
const state = uiSignShown(app);
const spot = state ? uiSpotOf(MIRROR.cell,frame) :null;
if (!spot) return;
const row = signRow(state.shown,state.status);
const box = uiRowBox(frame,spot);
row.tiles.forEach(function (tile,at) { uiPaintTile(ctx,frame,{ tile,box,at }); });
uiText(ctx,frame,{
text:row.caption,tiles:CAPTION_TILES,x:box.left + box.width * HALF,y:box.top - frame.tile * (CAPTION_TILES * HALF + CAPTION_GAP),colour:frame.palette.text,
});
}

export { uiDrawMirrorSign };

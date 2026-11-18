import { BRUTE_CELL,markOf } from '../game/cast/brute.js';
import { counterVeiled,helpMark } from '../game/finale/siege.js';
import { uiDrawArt } from './art-hook.js';
import { uiEyedInk,uiFillCentred } from './grid-glyph-art.js';
import { uiVeilCell } from './grid-siege-draw.js';

const ART = ['.xxxxxx.','xxexxexx','xxxxxxxx','.xxxxxx.','xxxxxxxx','xx.xx.xx'];
const ART_TILES = 0.78;
const MARK_TILES = 0.42;
const MARK_AT = { across:0.8,down:0.06 };
const MARK_OUTLINE_PX = 3;
const FONT = 'px VT323, monospace';
const TEXT_MODE = 'optimizeSpeed';

function uiMark(ctx,frame,mark) {
const { spot,text } = mark;
ctx.font = Math.round(frame.tile * MARK_TILES) + FONT;
ctx.textRendering = TEXT_MODE;
ctx.textAlign = 'center';
ctx.textBaseline = 'top';
ctx.lineWidth = MARK_OUTLINE_PX;
ctx.strokeStyle = frame.palette.bg;
ctx.strokeText(text,spot.left + frame.tile * MARK_AT.across,spot.top + frame.tile * MARK_AT.down);
ctx.fillStyle = frame.palette.bright;
ctx.fillText(text,spot.left + frame.tile * MARK_AT.across,spot.top + frame.tile * MARK_AT.down);
}
function uiBody(ctx,frame,spot) {
if (uiDrawArt(ctx,'brute',{ left:spot.left,top:spot.top,size:frame.tile,dpr:frame.dpr,accent:'red' })) return;
ctx.fillStyle = frame.palette.panel;
ctx.fillRect(spot.left,spot.top,frame.tile,frame.tile);
uiFillCentred(ctx,ART,{ left:spot.left,top:spot.top,tile:frame.tile,share:ART_TILES,ink:uiEyedInk(frame.palette.bg,frame.palette.red) });
}
function uiDrawBrute(ctx,app,frame) {
if (!app.game.brute || app.game.brute.inert) return;
const spot = { left:(BRUTE_CELL.col - frame.camera.col) * frame.tile,top:(BRUTE_CELL.row - frame.camera.row) * frame.tile };
if (spot.left + frame.tile <= 0 || spot.top + frame.tile <= 0 || spot.left >= frame.width || spot.top >= frame.height) return;
uiBody(ctx,frame,spot);
if (counterVeiled(app.game.ext,app.game.save)) uiVeilCell(ctx,frame,spot);
uiMark(ctx,frame,{ spot,text:helpMark(app.game.ext,app.game.save) || markOf(app.game.ext,Boolean(app.game.brute && app.game.brute.race)) });
}

export { uiDrawBrute };

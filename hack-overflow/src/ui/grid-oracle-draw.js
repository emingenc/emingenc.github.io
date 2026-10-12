import { ANSWERS,DOORS,SIGN,isLive } from '../game/cast/oracle.js';
import { uiSpotOf } from './grid-spot.js';

const HALF = 0.5;
const DARK_ALPHA = 0.8;
const LIT_ALPHA = 0.22;
const NUMBER_TILES = 0.5;
const MARK_TILES = 0.7;
const SIGN_TEXT_TILES = 0.46;
const FONT = 'px VT323, monospace';
const TEXT_MODE = 'optimizeSpeed';
const PLAQUE = { inset:0.1,span:0.8,lineWidth:2,upper:0.36,lower:0.68 };
const MARKS = { [ANSWERS.higher]:'>',[ANSWERS.lower]:'<' };

function uiText(ctx,frame,spot) {
ctx.font = Math.round(frame.tile * spot.tiles) + FONT;
ctx.textRendering = TEXT_MODE;
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';
ctx.fillStyle = spot.colour;
ctx.fillText(spot.text,spot.x,spot.y);
}
function uiShade(ctx,frame,spot) {
ctx.globalAlpha = spot.alpha;
ctx.fillStyle = spot.colour;
ctx.fillRect(spot.left,spot.top,frame.tile,frame.tile);
ctx.globalAlpha = 1;
}
function uiAnswerOf(state,index) {
return index < state.lo ? ANSWERS.higher :ANSWERS.lower;
}
function uiDoorLabel(frame,state,index) {
if (!state.opened.includes(index)) return { text:String(index),tiles:NUMBER_TILES,colour:isLive(state,index) ? frame.palette.bright :frame.palette.dim };
if (state.done && index === state.lo) return { text:'*',tiles:MARK_TILES,colour:frame.palette.amber };
return { text:MARKS[uiAnswerOf(state,index)],tiles:MARK_TILES,colour:frame.palette.amber };
}
function uiDrawDoor(ctx,frame,door) {
const { state,index } = door;
const spot = uiSpotOf(DOORS[index],frame);
if (!spot) return;
if (isLive(state,index)) uiShade(ctx,frame,{ ...spot,colour:frame.palette.cyan,alpha:LIT_ALPHA });
else uiShade(ctx,frame,{ ...spot,colour:frame.palette.bg,alpha:DARK_ALPHA });
uiText(ctx,frame,{ ...uiDoorLabel(frame,state,index),x:spot.left + frame.tile * HALF,y:spot.top + frame.tile * HALF });
}
function uiDrawSign(ctx,frame) {
const spot = uiSpotOf(SIGN,frame);
if (!spot) return;
const tile = frame.tile;
const box = { left:spot.left + tile * PLAQUE.inset,top:spot.top + tile * PLAQUE.inset,size:tile * PLAQUE.span };
ctx.fillStyle = frame.palette.panel;
ctx.fillRect(box.left,box.top,box.size,box.size);
ctx.lineWidth = PLAQUE.lineWidth;
ctx.strokeStyle = frame.palette.cyan;
ctx.strokeRect(box.left,box.top,box.size,box.size);
const centre = spot.left + tile * HALF;
uiText(ctx,frame,{ text:'32',tiles:SIGN_TEXT_TILES,x:centre,y:spot.top + tile * PLAQUE.upper,colour:frame.palette.cyan });
uiText(ctx,frame,{ text:'?',tiles:SIGN_TEXT_TILES,x:centre,y:spot.top + tile * PLAQUE.lower,colour:frame.palette.bright });
}
function uiDrawOracle(ctx,app,frame) {
const oracle = app.game.oracle;
if (!oracle || oracle.inert) return;
uiDrawSign(ctx,frame);
DOORS.forEach(function (unused,index) { uiDrawDoor(ctx,frame,{ state:oracle.state,index }); });
}

export { uiDrawOracle };

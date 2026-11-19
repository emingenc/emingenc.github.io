import { darkMix,doorMemory,flashAlpha,markScale,noteDoors } from '../game/cast/door-fx.js';
import { ANSWERS,DOORS,SIGN,isLive } from '../game/cast/oracle.js';
import { pulseAt } from '../game/wayfinding.js';
import { uiSpotOf } from './grid-spot.js';

const HALF = 0.5;
const DARK_ALPHA = 0.8;
const LIT_ALPHA = 0.22;
const LIT_SWING = 0.05;
const EDGE_ALPHA = 0.3;
const EDGE_SWING = 0.4;
const EDGE_INSET = 1.5;
const NUMBER_TILES = 0.5;
const MARK_TILES = 0.7;
const SIGN_TEXT_TILES = 0.46;
const FONT = 'px VT323, monospace';
const TEXT_MODE = 'optimizeSpeed';
const UI_DOORS = doorMemory();
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
if (spot.alpha <= 0) return;
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
function uiAge(frame,at) {
return frame.reducedMotion ? Infinity :frame.now - at;
}
function uiEdge(ctx,frame,door) {
const { state,index,spot } = door;
if (frame.reducedMotion || !isLive(state,index) || (index !== state.lo && index !== state.hi)) return;
ctx.globalAlpha = EDGE_ALPHA + EDGE_SWING * pulseAt(frame.now,false);
ctx.strokeStyle = frame.palette.cyan;
ctx.lineWidth = 1;
ctx.strokeRect(spot.left + EDGE_INSET,spot.top + EDGE_INSET,frame.tile - 2 * EDGE_INSET,frame.tile - 2 * EDGE_INSET);
ctx.globalAlpha = 1;
}
function uiDoorShade(ctx,frame,door) {
const { state,index,spot } = door;
const pulse = frame.reducedMotion ? 0 :pulseAt(frame.now,false);
if (isLive(state,index)) { uiShade(ctx,frame,{ ...spot,colour:frame.palette.cyan,alpha:LIT_ALPHA + LIT_SWING * pulse }); return; }
const dark = darkMix(uiAge(frame,UI_DOORS.deadAt[index]));
if (dark < 1) uiShade(ctx,frame,{ ...spot,colour:frame.palette.cyan,alpha:LIT_ALPHA * (1 - dark) });
uiShade(ctx,frame,{ ...spot,colour:frame.palette.bg,alpha:DARK_ALPHA * dark });
}
function uiDrawDoor(ctx,frame,door) {
const { state,index } = door;
const spot = uiSpotOf(DOORS[index],frame);
if (!spot) return;
uiDoorShade(ctx,frame,{ state,index,spot });
uiEdge(ctx,frame,{ state,index,spot });
const age = uiAge(frame,UI_DOORS.openedAt[index]);
const label = uiDoorLabel(frame,state,index);
uiText(ctx,frame,{ ...label,tiles:label.tiles * markScale(age),x:spot.left + frame.tile * HALF,y:spot.top + frame.tile * HALF });
uiShade(ctx,frame,{ ...spot,colour:frame.palette.bright,alpha:flashAlpha(age) });
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
noteDoors(UI_DOORS,oracle.state,frame.now);
uiDrawSign(ctx,frame);
DOORS.forEach(function (unused,index) { uiDrawDoor(ctx,frame,{ state:oracle.state,index }); });
}

export { uiDrawOracle };

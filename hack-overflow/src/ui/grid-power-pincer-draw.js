import { BRIDGE } from '../game/power/bridge.js';
import { MIRROR } from '../game/power/mirror.js';
import { uiSpotOf } from './grid-spot.js';

const FONT_TILES = 0.6;
const MARK_TILES = 0.34;
const INSET_TILES = 0.1;
const BORDER_TILES = 0.06;
const HALF = 0.5;
const MIRROR_GAP_TILES = 0.08;
const FONT = 'px VT323, monospace';
const TARGET_TEXT = 'T=' + BRIDGE.target;
const TWIN_TEXT = ['L>','<R'];
const TWIN_INKS = ['cyan','magenta'];

function uiSetText(ctx,frame,face) {
ctx.font = Math.round(frame.tile * face.tiles) + FONT;
ctx.textAlign = face.align;
ctx.textBaseline = face.baseline;
ctx.fillStyle = frame.palette[face.ink];
}
function uiDrawBox(ctx,frame,box) {
const edge = frame.tile * INSET_TILES;
const border = frame.tile * BORDER_TILES;
const side = frame.tile - edge * 2;
ctx.fillStyle = frame.palette[box.ink];
ctx.fillRect(box.spot.left + edge,box.spot.top + edge,side,side);
ctx.fillStyle = frame.palette.panel;
ctx.fillRect(box.spot.left + edge + border,box.spot.top + edge + border,side - border * 2,side - border * 2);
uiSetText(ctx,frame,{ tiles:FONT_TILES,align:'center',baseline:'middle',ink:box.ink });
ctx.fillText(box.text,box.spot.left + frame.tile * HALF,box.spot.top + frame.tile * HALF);
}
function uiDrawTwins(ctx,frame) {
BRIDGE.twins.forEach((twin,index) => {
const spot = uiSpotOf(twin,frame);
if (spot) uiDrawBox(ctx,frame,{ spot,ink:TWIN_INKS[index],text:TWIN_TEXT[index] });
});
}
function uiDrawSign(ctx,frame) {
const spot = uiSpotOf(MIRROR.cell,frame);
if (!spot) return;
const gap = frame.tile * MIRROR_GAP_TILES;
const bar = frame.tile * (HALF - INSET_TILES * 2) - gap;
const top = spot.top + frame.tile * INSET_TILES;
ctx.fillStyle = frame.palette.cyan;
ctx.fillRect(spot.left + frame.tile * HALF - gap - bar,top,bar,frame.tile - frame.tile * INSET_TILES * 2);
ctx.fillStyle = frame.palette.magenta;
ctx.fillRect(spot.left + frame.tile * HALF + gap,top,bar,frame.tile - frame.tile * INSET_TILES * 2);
}
function uiDrawMark(ctx,frame,mark) {
const spot = uiSpotOf(BRIDGE.cells[mark.index],frame);
if (!spot) return;
const right = mark.align === 'right';
uiSetText(ctx,frame,{ tiles:MARK_TILES,align:mark.align,baseline:'top',ink:mark.ink });
ctx.fillText(mark.text,spot.left + frame.tile * (right ? 1 - INSET_TILES :INSET_TILES),spot.top + frame.tile * INSET_TILES);
}
function uiPlateInk(index,pointers) {
if (index === pointers.l) return 'amber';
return index === pointers.r ? 'cyan' :'border';
}
function uiDrawPlates(ctx,frame,pointers) {
BRIDGE.cells.forEach((cell,index) => {
const spot = uiSpotOf(cell,frame);
if (spot) uiDrawBox(ctx,frame,{ spot,ink:uiPlateInk(index,pointers),text:String(BRIDGE.plates[index]) });
});
uiDrawMark(ctx,frame,{ index:pointers.l,text:'L',align:'left',ink:'amber' });
uiDrawMark(ctx,frame,{ index:pointers.r,text:'R',align:'right',ink:'cyan' });
}
function uiDrawTarget(ctx,frame) {
const spot = uiSpotOf({ col:BRIDGE.drone.col,row:BRIDGE.drone.row - 1 },frame);
if (spot) uiDrawBox(ctx,frame,{ spot,ink:'amber',text:TARGET_TEXT });
}
function uiPaintHall(ctx,frame,bridge) {
uiDrawTwins(ctx,frame);
uiDrawSign(ctx,frame);
if (!bridge) return;
uiDrawPlates(ctx,frame,bridge);
uiDrawTarget(ctx,frame);
}

export { uiPaintHall };

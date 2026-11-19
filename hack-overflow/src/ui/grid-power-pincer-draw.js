import { BRIDGE } from '../game/power/bridge.js';
import { MIRROR } from '../game/power/mirror.js';
import { uiFlashBox,uiGlideIndex,uiPulseLook } from './grid-power-feel.js';
import { uiSpotOf } from './grid-spot.js';
import { BORDER_TILES,FONT_TILES,HALF,INSET_TILES,MARK_TILES,uiNewGlide,uiPlateInk,uiSetText } from './grid-power-kit.js';

const MIRROR_GAP_TILES = 0.08;
const TARGET_TEXT = 'T=' + BRIDGE.target;
const TWIN_TEXT = ['L>','<R'];
const TWIN_INKS = ['cyan','magenta'];
const PULSE_KEY = 'pincer:';

const uiGlide = uiNewGlide();

function uiDrawBox(ctx,frame,box) {
const edge = frame.tile * INSET_TILES;
const border = frame.tile * BORDER_TILES;
const side = frame.tile - edge * 2;
const look = uiPulseLook(box.key || '',frame);
const left = box.spot.left + look.shake * frame.tile;
ctx.fillStyle = frame.palette[box.ink];
ctx.fillRect(left + edge,box.spot.top + edge,side,side);
ctx.fillStyle = frame.palette.panel;
ctx.fillRect(left + edge + border,box.spot.top + edge + border,side - border * 2,side - border * 2);
uiSetText(ctx,frame,{ size:frame.tile * FONT_TILES,align:'center',baseline:'middle',ink:box.ink });
ctx.fillText(box.text,left + frame.tile * HALF,box.spot.top + frame.tile * HALF);
uiFlashBox(ctx,{ left:left + edge,top:box.spot.top + edge,side,flash:look.flash,ink:frame.palette.bright });
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
function uiPlateAt(at) {
const first = BRIDGE.cells[0];
return { col:first.col + at,row:first.row };
}
function uiDrawMark(ctx,frame,mark) {
const spot = uiSpotOf(uiPlateAt(uiGlideIndex(uiGlide,mark.text,{ index:mark.index,frame })),frame);
if (!spot) return;
const right = mark.align === 'right';
uiSetText(ctx,frame,{ size:frame.tile * MARK_TILES,align:mark.align,baseline:'top',ink:mark.ink });
ctx.fillText(mark.text,spot.left + frame.tile * (right ? 1 - INSET_TILES :INSET_TILES),spot.top + frame.tile * INSET_TILES);
}
function uiDrawPlates(ctx,frame,pointers) {
BRIDGE.cells.forEach((cell,index) => {
const spot = uiSpotOf(cell,frame);
if (spot) uiDrawBox(ctx,frame,{ spot,ink:uiPlateInk(index,pointers),text:String(BRIDGE.plates[index]),key:PULSE_KEY + index });
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

export { uiPaintHall,PULSE_KEY };

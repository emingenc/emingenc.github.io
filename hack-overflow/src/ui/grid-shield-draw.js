import { BORDER_TILES,FONT_TILES,HALF,INSET_TILES,MARK_TILES,uiNewGlide,uiPlateInk,uiSetText } from './grid-power-kit.js';
import { uiFlashBox,uiGlideIndex,uiPulseLook } from './grid-power-feel.js';
import { uiSpotOf } from './grid-spot.js';

const BOX_TILES = 1.1;
const MARGIN_TILES = 0.3;
const DRONE_TEXT = 'SH';
const PULSE_KEY = 'shield:';

const uiGlide = uiNewGlide();

function uiDrawBox(ctx,frame,box) {
const border = box.side * BORDER_TILES;
const look = uiPulseLook(box.key || '',frame);
const left = box.left + look.shake * frame.tile;
ctx.fillStyle = frame.palette[box.ink];
ctx.fillRect(left,box.top,box.side,box.side);
ctx.fillStyle = frame.palette.panel;
ctx.fillRect(left + border,box.top + border,box.side - border * 2,box.side - border * 2);
if (box.text) {
uiSetText(ctx,frame,{ size:box.side * FONT_TILES,align:'center',baseline:'middle',ink:box.ink });
ctx.fillText(box.text,left + box.side * HALF,box.top + box.side * HALF);
}
uiFlashBox(ctx,{ left,top:box.top,side:box.side,flash:look.flash,ink:frame.palette.bright });
}
function uiDrawCellBox(ctx,frame,box) {
const spot = uiSpotOf(box.cell,frame);
if (!spot) return;
const edge = frame.tile * INSET_TILES;
uiDrawBox(ctx,frame,{ left:spot.left + edge,top:spot.top + edge,side:frame.tile - edge * 2,ink:box.ink,text:box.text });
}
function uiDrawLane(ctx,frame,drone) {
drone.lane.forEach((cell) => uiDrawCellBox(ctx,frame,{ cell,ink:'border',text:'' }));
if (!drone.live) uiDrawCellBox(ctx,frame,{ cell:drone.drone,ink:'magenta',text:DRONE_TEXT });
}
function uiReadoutSide(frame,count) {
return Math.min(frame.tile * BOX_TILES,(frame.width - frame.tile * MARGIN_TILES * 2) / count);
}
function uiDrawMark(ctx,frame,mark) {
const right = mark.align === 'right';
uiSetText(ctx,frame,{ size:mark.side * MARK_TILES,align:mark.align,baseline:'bottom',ink:mark.ink });
ctx.fillText(mark.text,mark.left + (right ? mark.side :0),mark.top);
}
function uiDrawReadout(ctx,frame,readout) {
const count = readout.plates.length + 1;
const side = uiReadoutSide(frame,count);
const left = (frame.width - side * count) * HALF;
const top = frame.height - side - frame.tile * MARGIN_TILES;
readout.plates.forEach((plate,index) => {
uiDrawBox(ctx,frame,{ left:left + side * index,top,side,ink:uiPlateInk(index,readout),text:String(plate),key:PULSE_KEY + index });
});
uiDrawBox(ctx,frame,{ left:left + side * readout.plates.length,top,side,ink:'amber',text:'T=' + readout.target });
const leftAt = uiGlideIndex(uiGlide,'L',{ index:readout.l,frame });
const rightAt = uiGlideIndex(uiGlide,'R',{ index:readout.r,frame });
uiDrawMark(ctx,frame,{ left:left + side * leftAt,top,side,text:'L',align:'left',ink:'amber' });
uiDrawMark(ctx,frame,{ left:left + side * rightAt,top,side,text:'R',align:'right',ink:'cyan' });
}
function uiPaintShields(ctx,frame,shields) {
shields.drones.forEach((drone) => uiDrawLane(ctx,frame,drone));
if (shields.readout) uiDrawReadout(ctx,frame,shields.readout);
}

export { uiPaintShields,PULSE_KEY };

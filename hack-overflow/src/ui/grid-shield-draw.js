import { uiSpotOf } from './grid-spot.js';

const FONT_TILES = 0.6;
const MARK_TILES = 0.34;
const INSET_TILES = 0.1;
const BORDER_TILES = 0.06;
const HALF = 0.5;
const BOX_TILES = 1.1;
const MARGIN_TILES = 0.3;
const FONT = 'px VT323, monospace';
const DRONE_TEXT = 'SH';

function uiSetText(ctx,frame,face) {
ctx.font = Math.round(face.size) + FONT;
ctx.textAlign = face.align;
ctx.textBaseline = face.baseline;
ctx.fillStyle = frame.palette[face.ink];
}
function uiDrawBox(ctx,frame,box) {
const border = box.side * BORDER_TILES;
ctx.fillStyle = frame.palette[box.ink];
ctx.fillRect(box.left,box.top,box.side,box.side);
ctx.fillStyle = frame.palette.panel;
ctx.fillRect(box.left + border,box.top + border,box.side - border * 2,box.side - border * 2);
if (!box.text) return;
uiSetText(ctx,frame,{ size:box.side * FONT_TILES,align:'center',baseline:'middle',ink:box.ink });
ctx.fillText(box.text,box.left + box.side * HALF,box.top + box.side * HALF);
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
function uiPlateInk(index,pointers) {
if (index === pointers.l) return 'amber';
return index === pointers.r ? 'cyan' :'border';
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
uiDrawBox(ctx,frame,{ left:left + side * index,top,side,ink:uiPlateInk(index,readout),text:String(plate) });
});
uiDrawBox(ctx,frame,{ left:left + side * readout.plates.length,top,side,ink:'amber',text:'T=' + readout.target });
uiDrawMark(ctx,frame,{ left:left + side * readout.l,top,side,text:'L',align:'left',ink:'amber' });
uiDrawMark(ctx,frame,{ left:left + side * readout.r,top,side,text:'R',align:'right',ink:'cyan' });
}
function uiPaintShields(ctx,frame,shields) {
shields.drones.forEach((drone) => uiDrawLane(ctx,frame,drone));
if (shields.readout) uiDrawReadout(ctx,frame,shields.readout);
}

export { uiPaintShields };

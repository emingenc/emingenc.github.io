import { createTrack,easeOutBack } from '../game/power-feel.js';

const FONT_TILES = 0.6;
const MARK_TILES = 0.34;
const INSET_TILES = 0.1;
const BORDER_TILES = 0.06;
const HALF = 0.5;
const FONT = 'px VT323, monospace';
const GLIDE_MS = 150;

function uiNewGlide() {
return createTrack(GLIDE_MS,easeOutBack);
}
function uiSetText(ctx,frame,face) {
ctx.font = Math.round(face.size) + FONT;
ctx.textAlign = face.align;
ctx.textBaseline = face.baseline;
ctx.fillStyle = frame.palette[face.ink];
}
function uiPlateInk(index,pointers) {
if (index === pointers.l) return 'amber';
return index === pointers.r ? 'cyan' :'border';
}

export { FONT_TILES,MARK_TILES,INSET_TILES,BORDER_TILES,HALF,uiNewGlide,uiSetText,uiPlateInk };

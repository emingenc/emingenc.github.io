import { newShowNote,noteShown,revealCell,showFade } from '../game/power/armored-fade.js';
import { pulseAt } from '../game/wayfinding.js';
import { uiDrawArt } from './art-hook.js';

const MITE_ART = ['..sss..','.sssss.','sbebebs','.sssss.','x.x.x.x'];
const ART_TILES = 0.8;
const MARK_TILES = 0.2;
const MARK_BAR_TILES = 0.06;
const MARK_INSET_TILES = 0.06;
const HALF = 0.5;
const WARN = { alpha:0.3,pulse:0.4,radius:0.4,width:2,ink:'cyan' };
const FULL_TURN = Math.PI * 2;
const NOTES = new Map();
const COLOURS = { s:'primary',b:'cyan',e:'bg',x:'dim' };
const SHELL = MITE_ART.flatMap((line,row) => [...line].map((glyph,col) => ({ glyph,col,row }))).filter((one) => one.glyph !== '.');

function uiDrawShell(ctx,frame,spot) {
if (uiDrawArt(ctx,'mite-armored',{ left:spot.left,top:spot.top,size:frame.tile,dpr:frame.dpr,accent:'primary' })) return;
const pixel = (frame.tile * ART_TILES) / MITE_ART[0].length;
const left = spot.left + (frame.tile - pixel * MITE_ART[0].length) * HALF;
const top = spot.top + (frame.tile - pixel * MITE_ART.length) * HALF;
SHELL.forEach(function (one) {
ctx.fillStyle = frame.palette[COLOURS[one.glyph]];
ctx.fillRect(left + one.col * pixel,top + one.row * pixel,pixel,pixel);
});
}
function uiDrawCorner(ctx,frame,spot) {
const corner = spot.corner;
const arm = frame.tile * MARK_TILES;
const bar = frame.tile * MARK_BAR_TILES;
const inset = frame.tile * MARK_INSET_TILES;
const flat = spot.left + (corner.right ? frame.tile - inset - arm :inset);
const upright = spot.left + (corner.right ? frame.tile - inset - bar :inset);
ctx.fillRect(flat,spot.top + (corner.low ? frame.tile - inset - bar :inset),arm,bar);
ctx.fillRect(upright,spot.top + (corner.low ? frame.tile - inset - arm :inset),bar,arm);
}
function uiDrawMarks(ctx,frame,spot) {
ctx.fillStyle = frame.palette.magenta;
[{ right:false,low:false },{ right:true,low:false },{ right:false,low:true },{ right:true,low:true }].forEach(function (corner) { uiDrawCorner(ctx,frame,{ ...spot,corner }); });
}
function uiNoteOf(id) {
if (!NOTES.has(id)) NOTES.set(id,newShowNote());
return NOTES.get(id);
}
function uiDrawWarning(ctx,frame,actor) {
const cell = revealCell(actor);
const left = (cell.col - frame.camera.col) * frame.tile;
const top = (cell.row - frame.camera.row) * frame.tile;
if (left + frame.tile <= 0 || top + frame.tile <= 0 || left >= frame.width || top >= frame.height) return;
ctx.globalAlpha = WARN.alpha * (1 - WARN.pulse + WARN.pulse * pulseAt(frame.now,frame.reducedMotion));
ctx.strokeStyle = frame.palette[WARN.ink];
ctx.lineWidth = WARN.width;
ctx.beginPath();
ctx.arc(left + frame.tile * HALF,top + frame.tile * HALF,frame.tile * WARN.radius,0,FULL_TURN);
ctx.stroke();
ctx.globalAlpha = 1;
}
function uiDrawArmored(ctx,frame,spot) {
const actor = spot.actor;
const note = noteShown(uiNoteOf(actor.id),{ awake:actor.awake,col:actor.col,row:actor.row,now:frame.now });
if (!actor.awake) uiDrawWarning(ctx,frame,actor);
const fade = showFade(note,frame);
if (fade.alpha <= 0) return;
const cell = { left:(note.col - frame.camera.col) * frame.tile,top:(note.row - frame.camera.row) * frame.tile + fade.rise };
ctx.globalAlpha = fade.alpha;
uiDrawShell(ctx,frame,cell);
if (actor.tagged) uiDrawMarks(ctx,frame,cell);
ctx.globalAlpha = 1;
}

export { uiDrawArmored };

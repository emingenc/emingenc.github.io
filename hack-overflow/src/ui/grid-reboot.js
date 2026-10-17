import { uiGridPainter } from './grid-draw-fx.js';
import { uiNotchedBox,uiOutlinedText,uiWorldFont } from './grid-world-text.js';

const REBOOT_MS = 2200;
const FADE_MS = 280;
const TITLE = 'REBOOT AT DOORWAY';
const KEPT = 'Hearts back to full.';
const CAUSES = { drone:'Shot by a drone.',sentinel:'Hit by the sentinel.',mite:'Stung by a mite.' };
const UNKNOWN_CAUSE = 'You were hit.';
const TITLE_PX = 16;
const LINE_PX = 12;
const PAD_PX = 10;
const GAP_PX = 6;
const WIDTH_PX = 240;
const EDGE_PX = 12;
const DOWN_SHARE = 0.34;
const HALF = 0.5;

let uiReboot = null;

function uiStartReboot(atMs,cause) {
uiGridPainter(uiDrawReboot);
uiReboot = { atMs,line:CAUSES[cause] || UNKNOWN_CAUSE };
}
function uiAlphaOf(age,still) {
if (still) return 1;
return Math.min(Math.min(age / FADE_MS,1),Math.min((REBOOT_MS - age) / FADE_MS,1));
}
function uiCardBox(frame) {
const width = Math.min(WIDTH_PX,frame.width - 2 * EDGE_PX);
const height = TITLE_PX + LINE_PX * 2 + GAP_PX * 2 + PAD_PX * 2;
return { left:(frame.width - width) * HALF,top:frame.height * DOWN_SHARE - height * HALF,width,height };
}
function uiDrawReboot(frame) {
if (!uiReboot) return;
const age = frame.now - uiReboot.atMs;
if (age >= REBOOT_MS) { uiReboot = null; return; }
if (age < 0) return;
const ctx = frame.ctx;
const box = uiCardBox(frame);
const centre = box.left + box.width * HALF;
ctx.globalAlpha = uiAlphaOf(age,frame.reducedMotion);
uiNotchedBox(ctx,frame,{ ...box,edge:'red',fill:'bg' });
uiOutlinedText(ctx,frame,{ text:TITLE,x:centre,y:box.top + PAD_PX + TITLE_PX * HALF,font:uiWorldFont(TITLE_PX),ink:'red' });
uiOutlinedText(ctx,frame,{ text:uiReboot.line,x:centre,y:box.top + PAD_PX + TITLE_PX + GAP_PX + LINE_PX * HALF,font:uiWorldFont(LINE_PX),ink:'text' });
uiOutlinedText(ctx,frame,{ text:KEPT,x:centre,y:box.top + PAD_PX + TITLE_PX + GAP_PX * 2 + LINE_PX * (1 + HALF),font:uiWorldFont(LINE_PX),ink:'dim' });
ctx.globalAlpha = 1;
}
function uiRebootNow() {
return uiReboot;
}
function uiRebootClear() {
uiReboot = null;
}

export { uiStartReboot,uiRebootNow,uiRebootClear,REBOOT_MS,TITLE };

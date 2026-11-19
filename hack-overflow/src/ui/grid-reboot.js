import { BEAT,blackAt,washAt,cardBox,cardLine } from '../game/reboot-beat.js';
import { uiDownNow } from './grid-hero-hurt.js';
import { uiGridPainter } from './grid-draw-fx.js';
import { uiNotchedBox,uiOutlinedText,uiWorldFont } from './grid-world-text.js';

const REBOOT_MS = 2200;
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
const LINES = 3;
const HALF = 0.5;

let uiReboot = null;

function uiStartReboot(atMs,cause) {
uiGridPainter(uiDrawReboot);
const down = uiDownNow();
uiReboot = { atMs:down ? down.at :atMs,delayMs:down ? BEAT.cardAtMs :0,line:CAUSES[cause] || UNKNOWN_CAUSE };
}
function uiCardBox(frame) {
const width = Math.min(WIDTH_PX,frame.width - 2 * EDGE_PX);
const height = TITLE_PX + LINE_PX * 2 + GAP_PX * 2 + PAD_PX * 2;
return { left:(frame.width - width) * HALF,top:frame.height * DOWN_SHARE - height * HALF,width,height };
}
function uiFill(frame,ink,alpha) {
frame.ctx.globalAlpha = alpha;
frame.ctx.fillStyle = frame.palette[ink];
frame.ctx.fillRect(0,0,frame.width,frame.height);
frame.ctx.globalAlpha = 1;
}
function uiDrawBlack(frame,age) {
if (!uiDownNow() || frame.reducedMotion) return;
if (washAt(age) > 0) uiFill(frame,'red',washAt(age));
if (blackAt(age) > 0) uiFill(frame,'bg',blackAt(age));
}
function uiLineAlpha(card,index) {
return card.still ? 1 :card.box.alpha * cardLine(card.age,index);
}
function uiDrawLines(frame,card) {
const ctx = frame.ctx;
const centre = card.box.left + card.box.width * HALF;
const top = card.box.top + card.dy;
ctx.globalAlpha = uiLineAlpha(card,0);
uiOutlinedText(ctx,frame,{ text:TITLE,x:centre,y:top + PAD_PX + TITLE_PX * HALF,font:uiWorldFont(TITLE_PX),ink:'red' });
ctx.globalAlpha = uiLineAlpha(card,1);
uiOutlinedText(ctx,frame,{ text:uiReboot.line,x:centre,y:top + PAD_PX + TITLE_PX + GAP_PX + LINE_PX * HALF,font:uiWorldFont(LINE_PX),ink:'text' });
ctx.globalAlpha = uiLineAlpha(card,LINES - 1);
uiOutlinedText(ctx,frame,{ text:KEPT,x:centre,y:top + PAD_PX + TITLE_PX + GAP_PX * 2 + LINE_PX * (1 + HALF),font:uiWorldFont(LINE_PX),ink:'dim' });
}
function uiDrawCard(frame,age) {
const look = frame.reducedMotion ? { alpha:1,dy:0 } :cardBox(age,REBOOT_MS);
const box = uiCardBox(frame);
frame.ctx.globalAlpha = look.alpha;
uiNotchedBox(frame.ctx,frame,{ ...box,top:box.top + look.dy,edge:'red',fill:'bg' });
uiDrawLines(frame,{ box,dy:look.dy,age,still:frame.reducedMotion });
frame.ctx.globalAlpha = 1;
}
function uiDrawReboot(frame) {
if (!uiReboot) return;
const age = frame.now - uiReboot.atMs;
uiDrawBlack(frame,age);
const cardAge = age - uiReboot.delayMs;
if (cardAge >= REBOOT_MS) { uiReboot = null; return; }
if (cardAge < 0) return;
uiDrawCard(frame,cardAge);
}
function uiRebootNow() {
return uiReboot;
}
function uiRebootClear() {
uiReboot = null;
}

export { uiStartReboot,uiRebootNow,uiRebootClear,REBOOT_MS,TITLE };

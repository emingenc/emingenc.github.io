import { uiGridPainter } from './grid-draw-fx.js';
import { uiNotchedBox,uiOutlinedText,uiTextWidth,uiWorldFont } from './grid-world-text.js';

const SPEECH_LINE = /^([A-Z][A-Z0-9-]*): (.+)$/;
const BASE_MS = 1100;
const CHAR_MS = 55;
const MIN_MS = 2400;
const MAX_MS = 6500;
const FADE_MS = 160;
const PENDING_MAX = 2;
const FONT_PX = 12;
const HEAD_PX = 11;
const LINE_PX = 16;
const PAD_PX = 8;
const WIDTH_MAX = 220;
const LINES_MAX = 3;
const TAIL_PX = 7;
const TAIL_RIM = 6;
const TAIL_MID = 4;
const TAIL_TIP = 2;
const TAIL_STEPS = [TAIL_RIM,TAIL_MID,TAIL_TIP];
const TAIL_STEP_PX = 2;
const EDGE_PX = 4;
const ELLIPSIS = '…';
const HALF = 0.5;
const HEAD_INK = 'cyan';

const uiSpeakers = new Map();
const uiTalking = new Map();

function uiRegisterSpeaker(name,locate) {
uiSpeakers.set(name,locate);
}
function uiInView(app,cell) {
const view = app.game.view;
if (!view) return false;
return cell.col + 1 > view.camera.col && cell.row + 1 > view.camera.row && cell.col < view.camera.col + view.cols && cell.row < view.camera.row + view.rows;
}
function uiReadMs(text) {
return Math.min(Math.max(BASE_MS + text.length * CHAR_MS,MIN_MS),MAX_MS);
}
function uiLineFor(app,name,text) {
const talk = uiTalking.get(name) || { name,app,bubble:null,queue:[] };
const line = { text,ms:uiReadMs(text),atMs:null };
if (!talk.bubble) talk.bubble = line;
else talk.queue = [...talk.queue,line].slice(-PENDING_MAX);
talk.app = app;
uiTalking.set(name,talk);
}
function uiSpeechTap(app,toast) {
const match = SPEECH_LINE.exec(toast.text);
const locate = match ? uiSpeakers.get(match[1]) :null;
const cell = locate ? locate(app) :null;
if (!cell || !uiInView(app,cell)) return false;
uiGridPainter(uiDrawSpeech);
uiLineFor(app,match[1],match[2]);
return true;
}
function uiAdvance(talk,now) {
if (talk.bubble && talk.bubble.atMs === null) talk.bubble.atMs = now;
if (talk.bubble && now - talk.bubble.atMs >= talk.bubble.ms) {
talk.bubble = talk.queue.shift() || null;
if (talk.bubble) talk.bubble.atMs = now;
}
}
function uiWrap(ctx,text) {
const lines = [];
let line = '';
text.split(' ').forEach(function (word) {
const trial = line === '' ? word :line + ' ' + word;
if (line === '' || uiTextWidth(ctx,trial,uiWorldFont(FONT_PX)) <= WIDTH_MAX) { line = trial; return; }
lines.push(line);
line = word;
});
lines.push(line);
if (lines.length <= LINES_MAX) return lines;
return [...lines.slice(0,LINES_MAX - 1),lines.slice(LINES_MAX - 1).join(' ').slice(0,WIDTH_MAX / (FONT_PX * HALF)) + ELLIPSIS];
}
function uiAlphaOf(talk,now,still) {
if (still) return 1;
const age = now - talk.bubble.atMs;
return Math.min(Math.min(age / FADE_MS,1),Math.min((talk.bubble.ms - age) / FADE_MS,1));
}
function uiBoxFor(ctx,frame,spec) {
const widest = Math.max(...spec.lines.map(function (line) { return uiTextWidth(ctx,line,uiWorldFont(FONT_PX)); }),uiTextWidth(ctx,spec.name,uiWorldFont(HEAD_PX)));
const width = Math.min(widest,WIDTH_MAX) + 2 * PAD_PX;
const height = (spec.lines.length + 1) * LINE_PX + 2 * PAD_PX - (LINE_PX - HEAD_PX);
const centre = (spec.cell.col - frame.camera.col + HALF) * frame.tile;
const top = (spec.cell.row - frame.camera.row) * frame.tile - TAIL_PX - height;
const below = top < EDGE_PX;
return {
left:Math.min(Math.max(centre - width * HALF,EDGE_PX),Math.max(frame.width - width - EDGE_PX,EDGE_PX)),
top:below ? (spec.cell.row - frame.camera.row + 1) * frame.tile + TAIL_PX :top,width,height,below,centre,
};
}
function uiDrawTail(ctx,frame,box) {
const centre = Math.min(Math.max(box.centre,box.left + PAD_PX),box.left + box.width - PAD_PX);
ctx.fillStyle = frame.palette.panel;
TAIL_STEPS.forEach(function (width,step) {
const out = step * TAIL_STEP_PX;
const top = box.below ? box.top + EDGE_PX - out - TAIL_STEP_PX :box.top + box.height - EDGE_PX + out;
ctx.fillRect(centre - width * HALF,top,width,TAIL_STEP_PX);
});
}
function uiDrawBubble(ctx,frame,talk) {
const cell = uiSpeakers.get(talk.name)(talk.app);
if (!cell) return;
const lines = uiWrap(ctx,talk.bubble.text);
const box = uiBoxFor(ctx,frame,{ cell,lines,name:talk.name });
ctx.globalAlpha = uiAlphaOf(talk,frame.now,frame.reducedMotion);
uiNotchedBox(ctx,frame,{ ...box,edge:'cyan',fill:'panel' });
uiDrawTail(ctx,frame,box);
const left = box.left + PAD_PX;
uiOutlinedText(ctx,frame,{ text:talk.name,x:left,y:box.top + PAD_PX + HEAD_PX * HALF,font:uiWorldFont(HEAD_PX),ink:HEAD_INK,align:'left' });
lines.forEach(function (line,index) {
uiOutlinedText(ctx,frame,{ text:line,x:left,y:box.top + PAD_PX + LINE_PX * (index + 1) + FONT_PX * HALF - (LINE_PX - HEAD_PX),font:uiWorldFont(FONT_PX),ink:'text',align:'left' });
});
ctx.globalAlpha = 1;
}
function uiDrawSpeech(frame) {
uiTalking.forEach(function (talk) {
uiAdvance(talk,frame.now);
if (talk.bubble) uiDrawBubble(frame.ctx,frame,talk);
});
}
function uiSpeechTexts() {
return [...uiTalking.values()].flatMap(function (talk) { return [talk.bubble,...talk.queue].filter(Boolean).map(function (line) { return talk.name + ': ' + line.text; }); });
}
function uiSpeaking() {
return [...uiTalking.values()].some(function (talk) { return Boolean(talk.bubble); });
}
function uiSpeechClear() {
uiTalking.clear();
}

export { uiRegisterSpeaker,uiSpeechTap,uiSpeaking,uiSpeechTexts,uiSpeechClear };

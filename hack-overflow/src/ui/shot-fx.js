import { uiGridBurst, uiGridPainter } from './grid-draw-fx.js';
import { uiEl, uiPrefersReducedMotion } from './dom.js';

const SHOT_MS = 240;
const SHOT_FLIGHT = 0.45;
const SHOT_COLOUR = { hit:'bright',kill:'amber',miss:'dim' };
const SHOT_BURST = { hit:{ kind:'spark',count:7 },kill:{ kind:'spark',count:14 },miss:{ kind:'fizz',count:5 } };
const SHOT_LAYER_CLASS = 'shot-fx-layer';
const SHOT_Z = '60';
const SHOT_LINE_PX = 3;
const SHOT_HEAVY_PX = 6;
const SHOT_MARK_PX = 16;
const SHOT_GRACE_MS = 60;
const SHOT_CELL_CENTRE = 0.5;

const TRACER = { flight:SHOT_FLIGHT,minPx:2,markMinPx:12,lineShare:0.1,heavyScale:1.8,markShare:0.5,missShare:0.3,cap:8 };

let uiShotSeed = 0;
let uiTracers = [];

function uiSnap(value,dpr) {
return Math.max(Math.round(value * dpr),1) / dpr;
}
function uiTracerPoint(cell,frame) {
return { x:(cell.col + SHOT_CELL_CENTRE - frame.camera.col) * frame.tile,y:(cell.row + SHOT_CELL_CENTRE - frame.camera.row) * frame.tile };
}
function uiTracerSpan(t,still) {
if (still) return { head:1,tail:0 };
return { head:Math.min(t / TRACER.flight,1),tail:Math.max((t - TRACER.flight) / (1 - TRACER.flight),0) };
}
function uiTracerLine(ctx,tracer,frame,span) {
const from = uiTracerPoint(tracer.from,frame);
const to = uiTracerPoint(tracer.to,frame);
const width = uiSnap(frame.tile * TRACER.lineShare * (tracer.heavy ? TRACER.heavyScale :1),frame.dpr);
const at = function (share) { return { x:from.x + (to.x - from.x) * share,y:from.y + (to.y - from.y) * share }; };
const start = at(span.tail);
const end = at(span.head);
ctx.lineWidth = Math.max(width,TRACER.minPx);
ctx.beginPath();
ctx.moveTo(start.x,start.y);
ctx.lineTo(end.x,end.y);
ctx.stroke();
}
function uiTracerMark(ctx,tracer,frame,span) {
if (span.head < 1) return;
const to = uiTracerPoint(tracer.to,frame);
const size = Math.max(frame.tile * (tracer.hit ? TRACER.markShare :TRACER.missShare) * (1 - span.tail * TRACER.markShare),TRACER.markMinPx);
if (tracer.hit) ctx.fillRect(to.x - size / 2,to.y - size / 2,size,size);
else ctx.strokeRect(to.x - size / 2,to.y - size / 2,size,size);
}
function uiDrawTracer(tracer,frame) {
const age = frame.now - tracer.atMs;
if (age < 0 || age >= SHOT_MS) return;
const span = uiTracerSpan(age / SHOT_MS,frame.reducedMotion);
const ctx = frame.ctx;
ctx.save();
ctx.strokeStyle = frame.palette[tracer.color] || tracer.color;
ctx.fillStyle = ctx.strokeStyle;
ctx.lineCap = 'square';
uiTracerLine(ctx,tracer,frame,span);
uiTracerMark(ctx,tracer,frame,span);
ctx.restore();
}
function uiDrawTracers(frame) {
uiTracers = uiTracers.filter(function (tracer) { return frame.now < tracer.atMs + SHOT_MS; });
uiTracers.forEach(function (tracer) { uiDrawTracer(tracer,frame); });
}
function uiShotKind(shot) {
if (!shot.hit) return 'miss';
return shot.kill ? 'kill' :'hit';
}
function uiShotColourVar(kind) {
return 'var(--' + SHOT_COLOUR[kind] + ')';
}
function uiShotCells(from,to,shot) {
const kind = uiShotKind(shot);
const now = performance.now();
uiGridPainter(uiDrawTracers);
uiTracers = [...uiTracers,{ from,to,atMs:now,color:SHOT_COLOUR[kind],hit:shot.hit,heavy:Boolean(shot.heavy) }].slice(-TRACER.cap);
if (uiPrefersReducedMotion()) return;
uiShotSeed += 1;
uiGridBurst({
kind:SHOT_BURST[kind].kind,count:SHOT_BURST[kind].count,seed:uiShotSeed,atMs:now + SHOT_MS * SHOT_FLIGHT,
origin:{ col:to.col + SHOT_CELL_CENTRE,row:to.row + SHOT_CELL_CENTRE },
});
}
function uiShotCentre(node) {
const rect = node.getBoundingClientRect();
return { x:rect.left + rect.width / 2,y:rect.top + rect.height / 2 };
}
function uiShotLayer() {
const layer = uiEl('div',{ className:SHOT_LAYER_CLASS,attrs:{ 'aria-hidden':'true' } });
Object.assign(layer.style,{ position:'fixed',left:'0',top:'0',width:'100%',height:'100%',pointerEvents:'none',zIndex:SHOT_Z,overflow:'hidden' });
document.body.appendChild(layer);
return layer;
}
function uiShotLine(from,to,look) {
const length = Math.hypot(to.x - from.x,to.y - from.y);
const line = uiEl('div',{});
const thick = look.thick;
Object.assign(line.style,{
position:'absolute',left:from.x + 'px',top:from.y - thick / 2 + 'px',width:length + 'px',height:thick + 'px',
background:look.colour,transformOrigin:'0 50%',transform:'rotate(' + Math.atan2(to.y - from.y,to.x - from.x) + 'rad)',
});
return line;
}
function uiShotMark(to,look) {
const mark = uiEl('div',{});
const outline = look.hit ? 'none' :'2px solid ' + look.colour;
Object.assign(mark.style,{
position:'absolute',left:to.x - SHOT_MARK_PX / 2 + 'px',top:to.y - SHOT_MARK_PX / 2 + 'px',width:SHOT_MARK_PX + 'px',height:SHOT_MARK_PX + 'px',
background:look.hit ? look.colour :'transparent',border:outline,boxSizing:'border-box',
});
return mark;
}
function uiShotAnimate(line,mark) {
if (typeof line.animate !== 'function') return;
const lineFrames = [{ transform:line.style.transform + ' scaleX(0)',opacity:1,offset:0 },{ transform:line.style.transform + ' scaleX(1)',opacity:1,offset:SHOT_FLIGHT },{ transform:line.style.transform + ' scaleX(1)',opacity:0,offset:1 }];
const markFrames = [{ opacity:0,offset:0 },{ opacity:1,offset:SHOT_FLIGHT },{ opacity:0,offset:1 }];
line.animate(lineFrames,{ duration:SHOT_MS,easing:'linear' });
mark.animate(markFrames,{ duration:SHOT_MS,easing:'linear' });
}
function uiShotNodes(fromNode,toNode,shot) {
if (!fromNode || !toNode || typeof document === 'undefined') return;
const from = uiShotCentre(fromNode);
const to = uiShotCentre(toNode);
const look = { hit:shot.hit,colour:uiShotColourVar(uiShotKind(shot)),thick:shot.heavy ? SHOT_HEAVY_PX :SHOT_LINE_PX };
const layer = uiShotLayer();
const line = uiShotLine(from,to,look);
const mark = uiShotMark(to,look);
layer.append(line,mark);
if (!uiPrefersReducedMotion()) uiShotAnimate(line,mark);
window.setTimeout(function () { layer.remove(); },SHOT_MS + SHOT_GRACE_MS);
}

function uiShotSelectors(fromSelector,toSelectors,shot) {
if (typeof document === 'undefined' || !document.querySelector) return;
const fromNode = document.querySelector(fromSelector);
toSelectors.forEach(function (selector) { uiShotNodes(fromNode,document.querySelector(selector),shot); });
}

export { SHOT_MS, uiShotCells, uiShotNodes, uiShotSelectors };

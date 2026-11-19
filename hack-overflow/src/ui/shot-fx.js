import { TRACER_FLIGHT_MS,headingOf } from '../game/foe-motion.js';
import { uiGridBurst, uiGridPainter } from './grid-draw-fx.js';
import { uiKickStage, uiStageShake } from './grid-stage-shake.js';
import { uiEl, uiPrefersReducedMotion } from './dom.js';

const SHOT_MS = 240;
const SHOT_FLIGHT = TRACER_FLIGHT_MS / SHOT_MS;
const SHOT_COLOUR = { hit:'bright',kill:'amber',miss:'dim' };
const SHOT_BURST = {
hit:[{ kind:'spark-hit',count:5 },{ kind:'ember',count:2 }],
kill:[{ kind:'spark-hit',count:11 },{ kind:'ember',count:3 }],
miss:[{ kind:'fizz',count:5 }],
};
const SHOT_LAYER_CLASS = 'shot-fx-layer';
const SHOT_Z = '60';
const SHOT_LINE_PX = 3;
const SHOT_HEAVY_PX = 6;
const SHOT_MARK_PX = 16;
const SHOT_GRACE_MS = 60;
const SHOT_CELL_CENTRE = 0.5;
const MUZZLE = { count:4,arc:0.5 };

const TRAIL_NEAR = 0.3;
const TRAIL_MID = 0.6;
const BLOCK_GAP = 1.5;
const TRACER = {
flight:SHOT_FLIGHT,drain:0.12,minPx:2,markMinPx:12,lineShare:0.07,heavyScale:1.8,markShare:0.5,missShare:0.3,cap:8,
boltTiles:0.8,heavyTiles:1.3,startTiles:0.45,endTiles:0.12,headShare:0.06,steps:[TRAIL_NEAR,TRAIL_MID,1],glint:{ bar:0.16,shrink:0.6 },
};
const FOE_SHOT = { ms:100,flight:0.7,boltTiles:0.6 };
const GRID_TRAIL = { hit:'amber',kill:'amber',miss:'dim',foe:'red' };
const FOE_KIND = 'foe';

let uiShotSeed = 0;
let uiTracers = [];

function uiSnap(value,dpr) {
return Math.max(Math.round(value * dpr),1) / dpr;
}
function uiTracerPoint(cell,frame) {
return { x:(cell.col + SHOT_CELL_CENTRE - frame.camera.col) * frame.tile,y:(cell.row + SHOT_CELL_CENTRE - frame.camera.row) * frame.tile };
}
function uiTracerPath(tracer,frame) {
const from = uiTracerPoint(tracer.from,frame);
const to = uiTracerPoint(tracer.to,frame);
const length = Math.hypot(to.x - from.x,to.y - from.y) || 1;
const unit = { x:(to.x - from.x) / length,y:(to.y - from.y) / length };
const lead = Math.min(frame.tile * TRACER.startTiles,length * SHOT_CELL_CENTRE);
const stop = Math.max(length - frame.tile * TRACER.endTiles,lead);
return { start:{ x:from.x + unit.x * lead,y:from.y + unit.y * lead },end:{ x:from.x + unit.x * stop,y:from.y + unit.y * stop },unit,span:stop - lead };
}
function uiTracerSpan(tracer,clock) {
if (clock.still) return { head:1,tail:0 };
const flown = Math.min(clock.age / (tracer.ms * tracer.flight),1);
const head = flown * flown;
const drain = Math.max(clock.age / tracer.ms - tracer.flight,0) / TRACER.drain;
const tail = Math.max(head - clock.bolt / Math.max(clock.path,1),0);
return { head,tail:Math.min(tail + (1 - tail) * Math.min(drain,1),head) };
}
function uiPointAt(path,share) {
return { x:path.start.x + (path.end.x - path.start.x) * share,y:path.start.y + (path.end.y - path.start.y) * share };
}
function uiBoltWidth(tracer,frame) {
return Math.max(uiSnap(frame.tile * TRACER.lineShare * (tracer.heavy ? TRACER.heavyScale :1),frame.dpr),TRACER.minPx);
}
function uiBoltTrail(ctx,tracer,view) {
const { path,span,frame } = view;
const from = uiPointAt(path,span.tail);
const to = uiPointAt(path,span.head);
ctx.lineWidth = uiBoltWidth(tracer,frame);
ctx.strokeStyle = frame.palette[tracer.trail] || tracer.trail;
TRACER.steps.forEach(function (alpha,step) {
const share = TRACER.steps.length;
ctx.globalAlpha = alpha;
ctx.beginPath();
ctx.moveTo(from.x + (to.x - from.x) * step / share,from.y + (to.y - from.y) * step / share);
ctx.lineTo(from.x + (to.x - from.x) * (step + 1) / share,from.y + (to.y - from.y) * (step + 1) / share);
ctx.stroke();
});
ctx.globalAlpha = 1;
}
function uiBoltHead(ctx,tracer,view) {
const { path,span,frame } = view;
const size = Math.max(uiSnap(frame.tile * TRACER.headShare,frame.dpr),TRACER.minPx);
const blocks = tracer.heavy ? 2 :1;
ctx.fillStyle = frame.palette[tracer.color] || tracer.color;
for (let block = 0;block < blocks;block += 1) {
const at = uiPointAt(path,span.head);
ctx.fillRect(at.x - path.unit.x * block * size * BLOCK_GAP - size / 2,at.y - path.unit.y * block * size * BLOCK_GAP - size / 2,size,size);
}
}
function uiTracerMark(ctx,tracer,view) {
const { path,span,frame } = view;
const left = span.still ? 1 :1 - Math.min(Math.max((span.age / tracer.ms - tracer.flight) / (1 - tracer.flight),0),1);
if (!tracer.mark || left <= 0 || span.head < 1) return;
const size = Math.max(frame.tile * (tracer.hit ? TRACER.markShare :TRACER.missShare) * (1 - (1 - left) * TRACER.glint.shrink),TRACER.markMinPx);
const bar = Math.max(uiSnap(size * TRACER.glint.bar,frame.dpr),TRACER.minPx);
ctx.globalAlpha = left;
ctx.fillStyle = frame.palette[tracer.color] || tracer.color;
if (!tracer.hit) {
ctx.strokeStyle = ctx.fillStyle;
ctx.strokeRect(path.end.x - size / 2,path.end.y - size / 2,size,size);
return;
}
ctx.fillRect(path.end.x - size / 2,path.end.y - bar / 2,size,bar);
ctx.fillRect(path.end.x - bar / 2,path.end.y - size / 2,bar,size);
}
function uiDrawTracer(tracer,frame) {
const age = frame.now - tracer.atMs;
if (age < 0 || age >= tracer.ms) return;
const path = uiTracerPath(tracer,frame);
const bolt = frame.tile * tracer.boltTiles;
const span = { ...uiTracerSpan(tracer,{ age,path:path.span,bolt,still:frame.reducedMotion }),age,still:frame.reducedMotion };
const view = { path,span,frame };
const ctx = frame.ctx;
ctx.save();
if (span.head > span.tail) {
uiBoltTrail(ctx,tracer,view);
uiBoltHead(ctx,tracer,view);
}
uiTracerMark(ctx,tracer,view);
ctx.restore();
}
function uiDrawTracers(frame) {
uiTracers = uiTracers.filter(function (tracer) { return frame.now < tracer.atMs + tracer.ms; });
uiTracers.forEach(function (tracer) { uiDrawTracer(tracer,frame); });
uiStageShake(frame.ctx.canvas,frame);
}
function uiShotKind(shot) {
if (!shot.hit) return 'miss';
return shot.kill ? 'kill' :'hit';
}
function uiShotColourVar(kind) {
return 'var(--' + SHOT_COLOUR[kind] + ')';
}
function uiShotBoltOf(kind,spec) {
return {
from:spec.from,to:spec.to,atMs:spec.atMs,color:SHOT_COLOUR[kind],trail:GRID_TRAIL[kind],hit:kind !== 'miss',heavy:Boolean(spec.heavy),
ms:SHOT_MS,flight:TRACER.flight,boltTiles:spec.heavy ? TRACER.heavyTiles :TRACER.boltTiles,mark:true,
};
}
function uiAddTracer(tracer) {
uiGridPainter(uiDrawTracers);
uiTracers = [...uiTracers,tracer].slice(-TRACER.cap);
}
function uiShotAim(from,to) {
const length = Math.hypot(to.col - from.col,to.row - from.row) || 1;
return { x:(to.col - from.col) / length,y:(to.row - from.row) / length };
}
function uiShotSparks(spec,kind) {
const aim = uiShotAim(spec.from,spec.to);
const origin = { col:spec.to.col + SHOT_CELL_CENTRE,row:spec.to.row + SHOT_CELL_CENTRE };
SHOT_BURST[kind].forEach(function (burst) {
uiShotSeed += 1;
uiGridBurst({ ...burst,seed:uiShotSeed,atMs:spec.atMs + SHOT_MS * SHOT_FLIGHT,origin,heading:headingOf(aim) });
});
}
function uiShotMuzzle(spec) {
const aim = uiShotAim(spec.from,spec.to);
const lead = TRACER.startTiles;
uiShotSeed += 1;
uiGridBurst({
kind:'spark-hit',count:MUZZLE.count,arc:MUZZLE.arc,seed:uiShotSeed,atMs:spec.atMs,heading:headingOf(aim),
origin:{ col:spec.from.col + SHOT_CELL_CENTRE + aim.x * lead,row:spec.from.row + SHOT_CELL_CENTRE + aim.y * lead },
});
}
function uiShotCells(from,to,shot) {
const kind = uiShotKind(shot);
const spec = { from,to,atMs:performance.now(),heavy:shot.heavy };
uiAddTracer(uiShotBoltOf(kind,spec));
if (uiPrefersReducedMotion()) return;
uiShotSparks(spec,kind);
uiShotMuzzle(spec);
if (shot.kill || shot.heavy) uiKickStage('kill',spec.atMs + SHOT_MS * SHOT_FLIGHT);
}
function uiFoeShot(from,to) {
uiAddTracer({
from,to,atMs:performance.now(),color:'bright',trail:GRID_TRAIL[FOE_KIND],hit:true,heavy:false,
ms:FOE_SHOT.ms,flight:FOE_SHOT.flight,boltTiles:FOE_SHOT.boltTiles,mark:false,
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

export { SHOT_MS, uiShotCells, uiFoeShot, uiShotNodes, uiShotSelectors };

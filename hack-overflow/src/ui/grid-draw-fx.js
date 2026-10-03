import { spawnParticles, updateParticles } from '../game/particles.js';


const UI_FX_SHAPE = { plusBar:0.34,ringLine:0.07 };

let uiGridPool = [];

function uiGridBurst(emission) {
uiGridPool = spawnParticles(uiGridPool,emission);
}
function uiSnapPx(value,dpr) {
return Math.max(Math.round(value * dpr),1) / dpr;
}
function uiSnapEdge(value,dpr) {
return Math.round(value * dpr) / dpr;
}
function uiParticleBox(particle,view) {
const size = uiSnapPx(particle.size * view.unit,view.dpr);
const centreX = (particle.col - view.left) * view.unit;
const centreY = (particle.row - view.top) * view.unit;
return { x:uiSnapEdge(centreX - size / 2,view.dpr),y:uiSnapEdge(centreY - size / 2,view.dpr),size };
}
function uiFillSquare(ctx,box) {
ctx.fillRect(box.x,box.y,box.size,box.size);
}
function uiFillPlus(ctx,box,view) {
const bar = Math.min(uiSnapPx(box.size * UI_FX_SHAPE.plusBar,view.dpr),box.size);
const inset = uiSnapEdge((box.size - bar) / 2,view.dpr);
ctx.fillRect(box.x,box.y + inset,box.size,bar);
ctx.fillRect(box.x + inset,box.y,bar,box.size);
}
function uiStrokeRing(ctx,box,view) {
const line = uiSnapPx(view.unit * UI_FX_SHAPE.ringLine,view.dpr);
ctx.lineWidth = line;
ctx.strokeRect(box.x + line / 2,box.y + line / 2,Math.max(box.size - line,0),Math.max(box.size - line,0));
}
const UI_FX_PAINTERS = { square:uiFillSquare,plus:uiFillPlus,ring:uiStrokeRing };
function uiDrawParticle(ctx,particle,view) {
if (particle.alpha <= 0) return;
const colour = view.palette[particle.color] || particle.color;
ctx.globalAlpha = particle.alpha;
ctx.fillStyle = colour;
ctx.strokeStyle = colour;
UI_FX_PAINTERS[particle.shape](ctx,uiParticleBox(particle,view),view);
}
function uiDrawParticles(ctx,particles,view) {
ctx.save();
particles.forEach(function (particle) { uiDrawParticle(ctx,particle,view); });
ctx.restore();
}
function uiDrawFx(frame) {
if (frame.reducedMotion) uiGridPool = [];
if (uiGridPool.length === 0) return;
uiGridPool = updateParticles(uiGridPool,frame.now);
const view = { left:frame.camera.col,top:frame.camera.row,unit:frame.tile,dpr:frame.dpr,palette:frame.palette };
uiDrawParticles(frame.ctx,uiGridPool,view);
}

export { uiDrawFx, uiGridBurst, uiDrawParticles };

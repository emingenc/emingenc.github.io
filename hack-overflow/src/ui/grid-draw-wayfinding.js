import { markerFor, pulseAt, targetCell } from '../game/wayfinding.js';


const UI_WAY = { arrowTiles:0.7,minArrowPx:22,outlinePx:3,ringPx:3,ringGrow:0.12,pulseGrow:0.18,alphaFloor:0.65 };
const HALF_TILE = 0.5;
const UI_ARROW_TIP = 0.6;
const UI_ARROW_BACK = 0.5;
const UI_ARROW_WING = 0.55;

function uiArrowPath(ctx,size) {
ctx.beginPath();
ctx.moveTo(size * UI_ARROW_TIP,0);
ctx.lineTo(-size * UI_ARROW_BACK,size * UI_ARROW_WING);
ctx.lineTo(-size * UI_ARROW_BACK * UI_ARROW_BACK,0);
ctx.lineTo(-size * UI_ARROW_BACK,-size * UI_ARROW_WING);
ctx.closePath();
}
function uiPulseAlpha(pulse) {
return UI_WAY.alphaFloor + (1 - UI_WAY.alphaFloor) * pulse;
}
function uiDrawArrow(frame,marker,pulse) {
const ctx = frame.ctx;
const size = Math.max(frame.tile * UI_WAY.arrowTiles,UI_WAY.minArrowPx) * (1 + UI_WAY.pulseGrow * pulse);
ctx.save();
ctx.translate(marker.col * frame.tile,marker.row * frame.tile);
ctx.rotate(marker.angle);
ctx.globalAlpha = uiPulseAlpha(pulse);
uiArrowPath(ctx,size);
ctx.lineJoin = 'round';
ctx.lineWidth = UI_WAY.outlinePx;
ctx.strokeStyle = frame.palette.bg;
ctx.stroke();
ctx.fillStyle = frame.palette.amber;
ctx.fill();
ctx.restore();
}
function uiDrawRing(frame,marker,pulse) {
const ctx = frame.ctx;
const reach = frame.tile * (HALF_TILE + UI_WAY.ringGrow * pulse);
ctx.save();
ctx.globalAlpha = uiPulseAlpha(pulse);
ctx.lineWidth = UI_WAY.ringPx;
ctx.strokeStyle = frame.palette.amber;
ctx.strokeRect(marker.col * frame.tile - reach,marker.row * frame.tile - reach,reach * 2,reach * 2);
ctx.restore();
}
function uiDrawWayfinding(frame) {
const marker = markerFor(targetCell(frame.world,frame.targetId),{ camera:frame.camera,cols:frame.view.cols,rows:frame.view.rows });
if (marker.kind === 'none') return;
const pulse = pulseAt(frame.now,frame.reducedMotion);
if (marker.kind === 'edge') uiDrawArrow(frame,marker,pulse);
else uiDrawRing(frame,marker,pulse);
}

export { uiDrawWayfinding };

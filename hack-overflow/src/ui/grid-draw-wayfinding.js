import { markerFor, pulseAt, targetCell } from '../game/wayfinding.js';


const UI_WAY = { ringPx:3,ringGrow:0.12,alphaFloor:0.65 };
const HALF_TILE = 0.5;

function uiPulseAlpha(pulse) {
return UI_WAY.alphaFloor + (1 - UI_WAY.alphaFloor) * pulse;
}
function uiDrawRing(frame,marker,pulse) {
const ctx = frame.ctx;
const reach = frame.tile * (HALF_TILE + UI_WAY.ringGrow * pulse) + UI_WAY.ringPx / 2 + 1;
ctx.save();
ctx.globalAlpha = uiPulseAlpha(pulse);
ctx.lineWidth = UI_WAY.ringPx;
ctx.strokeStyle = frame.palette.amber;
ctx.strokeRect(marker.col * frame.tile - reach,marker.row * frame.tile - reach,reach * 2,reach * 2);
ctx.restore();
}
function uiDrawWayfinding(frame) {
const marker = markerFor(targetCell(frame.world,frame.targetId),{ camera:frame.camera,cols:frame.view.cols,rows:frame.view.rows,inset:frame.view.inset });
if (marker.kind === 'none') return;
uiDrawRing(frame,marker,pulseAt(frame.now,frame.reducedMotion));
}

export { uiDrawWayfinding };

import { HALF,MAP_FX,mapBandAlpha,mapBandEdges,mapDashOffset,mapRevealMs,mapRingAlpha,mapRingProgress,mapRingScale } from '../game/map-fx-math.js';
import { uiPrefersReducedMotion } from './dom.js';
import { uiMapLayoutOf } from './map-marks.js';

const UI_MAP_FX_DASH = [MAP_FX.dashPx,MAP_FX.dashPx];
const UI_MAP_FX_SOLID = [];
const UI_MAP_FX_RING_WIDTH = 2.5;
const UI_MAP_FX_AVATAR_RATIO = 0.32;
const UI_MAP_FX_MIN_RADIUS = 3;
const UI_MAP_FX_OBJECTIVE_RATIO = 1.3;
const UI_MAP_FX_OBJECTIVE_MIN = 5;
const UI_MAP_FX_OBJECTIVE_GAP = 4;
const UI_MAP_FX_BRACKET_ALPHA = 0.85;
const UI_MAP_FX_BRACKET_WIDTH = 1;
const UI_MAP_FX_TAU = Math.PI * 2;

let uiMapFxState = null;
let uiMapFxOpenedAt = null;

function uiMapFxSnapshot(canvas) {
const base = document.createElement('canvas');
base.width = canvas.width;
base.height = canvas.height;
base.getContext('2d').drawImage(canvas,0,0);
return base;
}
function uiMapFxBase(state,elapsed) {
const { ctx,canvas,base } = state;
if (elapsed >= mapRevealMs()) {
ctx.drawImage(base,0,0);
return;
}
for (let index = 0; index < MAP_FX.bands; index += 1) {
const edge = mapBandEdges(index,canvas.width);
ctx.globalAlpha = mapBandAlpha(index,elapsed);
ctx.drawImage(base,edge.left,0,edge.right - edge.left,canvas.height,edge.left,0,edge.right - edge.left,canvas.height);
}
ctx.globalAlpha = 1;
}
function uiMapFxCentre(layout,cell) {
return { x:layout.left + (cell.col + HALF) * layout.tile,y:layout.top + (cell.row + HALF) * layout.tile };
}
function uiMapFxRings(state,now) {
const { ctx,layout,marks } = state;
const centre = uiMapFxCentre(layout,marks.avatar);
const radius = Math.max(UI_MAP_FX_MIN_RADIUS,layout.tile * UI_MAP_FX_AVATAR_RATIO);
ctx.strokeStyle = state.colors.cyan;
ctx.lineWidth = UI_MAP_FX_RING_WIDTH;
for (let index = 0; index < MAP_FX.ringCount; index += 1) {
const progress = mapRingProgress(now,index);
ctx.globalAlpha = mapRingAlpha(progress);
ctx.beginPath();
ctx.arc(centre.x,centre.y,radius * mapRingScale(progress),0,UI_MAP_FX_TAU);
ctx.stroke();
}
ctx.globalAlpha = 1;
}
function uiMapFxBracket(state,now) {
const { ctx,layout,marks } = state;
if (!marks.objective) return;
const centre = uiMapFxCentre(layout,marks.objective);
const half = Math.max(UI_MAP_FX_OBJECTIVE_MIN,layout.tile * UI_MAP_FX_OBJECTIVE_RATIO) + UI_MAP_FX_OBJECTIVE_GAP;
const side = half * 2;
ctx.strokeStyle = state.colors.bright;
ctx.globalAlpha = UI_MAP_FX_BRACKET_ALPHA;
ctx.lineWidth = UI_MAP_FX_BRACKET_WIDTH;
ctx.setLineDash(UI_MAP_FX_DASH);
ctx.lineDashOffset = -mapDashOffset(now);
ctx.strokeRect(centre.x - half,centre.y - half,side,side);
ctx.setLineDash(UI_MAP_FX_SOLID);
ctx.globalAlpha = 1;
}
function uiMapFxFrame(state,now) {
const { ctx,canvas } = state;
ctx.setTransform(1,0,0,1,0,0);
ctx.clearRect(0,0,canvas.width,canvas.height);
uiMapFxBase(state,now - state.startedAt);
ctx.setTransform(state.dpr,0,0,state.dpr,0,0);
uiMapFxRings(state,now);
uiMapFxBracket(state,now);
state.raf = window.requestAnimationFrame(function (next) { uiMapFxFrame(state,next); });
}
function uiMapFxStop() {
if (uiMapFxState && uiMapFxState.raf) window.cancelAnimationFrame(uiMapFxState.raf);
uiMapFxState = null;
}
function uiMapFxLeave() {
uiMapFxStop();
uiMapFxOpenedAt = null;
}
function uiMapFxColors(canvas) {
const style = window.getComputedStyle(canvas);
return { cyan:style.getPropertyValue('--cyan').trim() || '#19f0c8',bright:style.getPropertyValue('--bright').trim() || '#ffffff' };
}
function uiMapFxStart(canvas,marks) {
uiMapFxStop();
const layout = uiMapLayoutOf(canvas);
if (!layout || !canvas.width || uiPrefersReducedMotion()) return;
uiMapFxOpenedAt ??= performance.now() + MAP_FX.revealDelayMs;
const state = { canvas,ctx:canvas.getContext('2d'),base:uiMapFxSnapshot(canvas),layout,marks,startedAt:uiMapFxOpenedAt,dpr:window.devicePixelRatio || 1,colors:uiMapFxColors(canvas),raf:0 };
uiMapFxState = state;
uiMapFxFrame(state,performance.now());
}

export { uiMapFxStart,uiMapFxStop,uiMapFxLeave };

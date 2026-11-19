import { tileSizeFor } from '../game/viewport.js';
import { retryDue,retrySpecifier,shouldDrawFrame } from '../game/frame-pace.js';
import { uiEl } from './dom.js';
import { uiWalkTick } from './grid-walk.js';
import { uiDoorOpenness } from './grid-doors.js';
import { uiStageLabel, uiCreateHint, uiCreateNearPlate } from './grid-hint.js';

let uiFrame = null;
let uiFrameLoading = null;
let uiFrameFailedAt = -Infinity;
let uiFrameFailures = 0;
function uiImportGridFrame() {
return uiFrameFailures === 0 ? import('./grid-frame.js') :import(retrySpecifier('./grid-frame.js',uiFrameFailures));
}
function uiPrefetchGridFrame() {
uiFrameLoading ||= uiImportGridFrame().then(function (module) {
uiFrame = module;
return module;
},function (error) {
uiFrameLoading = null;
uiFrameFailures += 1;
uiFrameFailedAt = performance.now();
throw error;
});
return uiFrameLoading;
}
function uiLoadGridFrame(app) {
uiPrefetchGridFrame().then(function () { uiFrameArrived(app); }).catch(function () {});
}
function uiDrawFrame(app,now) {
if (uiFrame) uiFrame.uiDrawFrame(app,now);
else if (!uiFrameLoading && retryDue(uiFrameFailedAt,now)) uiLoadGridFrame(app);
}
function uiFrameArrived(app) {
const stage = app.game.stage;
if (!stage || !stage.tile) return;
uiFrame.uiWarmFor(stage,app.game.world);
if (app.screen === 'grid') uiDrawFrame(app,performance.now());
}
const UI_PALETTE_NAMES = ['bg','panel','border','primary','bright','cyan','magenta','amber','red','violet','text','dim'];
function uiReadPalette(node) {
const style = window.getComputedStyle(node);
return Object.fromEntries(UI_PALETTE_NAMES.map(function (name) { return [name,style.getPropertyValue('--' + name).trim()]; }));
}
function uiAgrees(pixels,cssSize,dpr) {
return Math.abs(pixels - cssSize * dpr) <= 1;
}
function uiCanvasPixels(entry,dpr) {
const box = entry.devicePixelContentBoxSize && entry.devicePixelContentBoxSize[0];
const css = entry.contentRect;
if (box && uiAgrees(box.inlineSize,css.width,dpr) && uiAgrees(box.blockSize,css.height,dpr)) return { width:box.inlineSize,height:box.blockSize };
return { width:Math.round(css.width * dpr),height:Math.round(css.height * dpr) };
}
function uiResizeStage(app,entry) {
const stage = app.game.stage;
const dpr = window.devicePixelRatio || 1;
const pixels = uiCanvasPixels(entry,dpr);
if (pixels.width === 0 || pixels.height === 0) return;
stage.canvas.width = pixels.width;
stage.canvas.height = pixels.height;
stage.ctx.setTransform(dpr,0,0,dpr,0,0);
stage.ctx.imageSmoothingEnabled = false;
const size = { width:pixels.width / dpr,height:pixels.height / dpr,dpr,tile:tileSizeFor(pixels.width / dpr) };
if (size.width !== stage.width || size.height !== stage.height || size.tile !== stage.tile) stage.follow = null;
Object.assign(stage,size);
if (!stage.palette) stage.palette = uiReadPalette(stage.node);
if (uiFrame) uiFrame.uiWarmFor(stage,app.game.world);
if (app.screen === 'grid') uiDrawFrame(app,performance.now());
}
function uiLastEntry(entries) {
return entries[entries.length - 1];
}
function uiObserveSize(resizer,canvas) {
try {
resizer.observe(canvas,{ box:'device-pixel-content-box' });
} catch {
resizer.observe(canvas);
}
}
function uiObserveStage(app,stage) {
stage.resizer = new ResizeObserver(function (entries) { uiResizeStage(app,uiLastEntry(entries)); });
uiObserveSize(stage.resizer,stage.canvas);
stage.watcher = new IntersectionObserver(function (entries) {
app.game.stageVisible = uiLastEntry(entries).isIntersecting;
uiSyncGridLoop(app,app.screen === 'grid');
});
stage.watcher.observe(stage.node);
}
const UI_ACTIVITY_EVENTS = ['keydown','pointerdown','touchstart','wheel'];
function uiWatchInput(stage) {
if (typeof window.addEventListener !== 'function') return;
const wake = function () { stage.pace.activeAt = performance.now(); };
UI_ACTIVITY_EVENTS.forEach(function (name) { window.addEventListener(name,wake,{ capture:true,passive:true }); });
}
function uiCreateStage(app) {
const canvas = uiEl('canvas',{ className:'grid-canvas',attrs:{ 'aria-hidden':'true' } });
const hint = uiCreateHint();
const near = uiCreateNearPlate();
const node = uiEl('div',{
className:'grid-stage',
attrs:{ tabindex:'0',role:'application','aria-label':uiStageLabel(),'data-focus-key':'grid-stage' },
children:[canvas,hint,near.node],
});
const stage = {
node,canvas,hint,near,ctx:canvas.getContext('2d',{ alpha:false }),raf:0,width:0,height:0,tile:0,dpr:1,palette:null,follow:null,
bake:null,blits:null,pace:{ activeAt:performance.now(),lastDrawAt:0,busy:false },doorOpenness:null,
};
stage.doorOpenness = function (id) { return uiDoorOpenness(app,id); };
app.game.stage = stage;
uiLoadGridFrame(app);
uiWatchInput(stage);
uiObserveStage(app,stage);
return stage;
}
function uiGridStage(app) {
return (app.game.stage || uiCreateStage(app)).node;
}
function uiLoopShouldRun(app,active) {
const stage = app.game.stage;
return active && stage.node.isConnected && !document.hidden && app.game.stageVisible && !app.menuOpen;
}
function uiSyncGridLoop(app,active) {
const stage = app.game.stage;
if (!stage) return;
const run = uiLoopShouldRun(app,active);
if (run && !stage.raf) {
stage.pace.activeAt = performance.now();
stage.raf = window.requestAnimationFrame(function (now) { uiGridTick(app,now); });
}
if (!run && stage.raf) {
window.cancelAnimationFrame(stage.raf);
stage.raf = 0;
}
}
function uiGridTick(app,now) {
const stage = app.game.stage;
stage.raf = window.requestAnimationFrame(function (next) { uiGridTick(app,next); });
uiWalkTick(app,now);
if (app.screen !== 'grid' || !stage.raf) return;
if (shouldDrawFrame(stage.pace,now)) uiDrawFrame(app,now);
}
export { uiGridStage, uiSyncGridLoop, uiPrefetchGridFrame };

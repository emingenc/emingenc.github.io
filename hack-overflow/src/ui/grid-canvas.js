import { MAX_LEVEL } from '../game/progress.js';
import { tileSizeFor } from '../game/viewport.js';
import { uiEl, uiPrefersReducedMotion } from './dom.js';
import { uiGameDebug } from './game-state.js';
import { uiWalkTick, uiAvatarPose } from './grid-walk.js';
import { uiCameraTick } from './grid-camera.js';
import { uiDoorOpenness } from './grid-doors.js';
import { uiDrawTiles } from './grid-draw-tiles.js';
import { uiDrawAvatar } from './grid-draw-avatar.js';
import { uiDrawFx } from './grid-draw-fx.js';
import { uiDrawWayfinding } from './grid-draw-wayfinding.js';
import { uiCreateHint, uiCreateNearPlate, uiSyncHint, uiSyncNearPlate } from './grid-hint.js';

const UI_STAGE_LABEL = 'The Grid. Arrow keys walk, Enter interacts, T opens travel.';
const UI_PALETTE_NAMES = ['bg','panel','border','primary','bright','cyan','magenta','amber','red','text','dim'];
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
function uiCreateStage(app) {
const canvas = uiEl('canvas',{ className:'grid-canvas',attrs:{ 'aria-hidden':'true' } });
const hint = uiCreateHint();
const near = uiCreateNearPlate();
const node = uiEl('div',{
className:'grid-stage',
attrs:{ tabindex:'0',role:'application','aria-label':UI_STAGE_LABEL,'data-focus-key':'grid-stage' },
children:[canvas,hint,near.node],
});
const stage = { node,canvas,hint,near,ctx:canvas.getContext('2d'),raf:0,width:0,height:0,tile:0,dpr:1,palette:null,follow:null };
app.game.stage = stage;
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
if (run && !stage.raf) stage.raf = window.requestAnimationFrame(function (now) { uiGridTick(app,now); });
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
uiDrawFrame(app,now);
}
function uiFrameFor(app,now) {
const game = app.game;
const stage = game.stage;
const view = { cols:stage.width / stage.tile,rows:stage.height / stage.tile };
const camera = uiCameraTick(app,now);
const avatar = uiAvatarPose(app,now);
game.view = { camera,tile:stage.tile,cols:view.cols,rows:view.rows,width:stage.width,height:stage.height,avatar };
return {
ctx:stage.ctx,world:game.world,progress:game.progress,save:game.save,camera,tile:stage.tile,view,avatar,now,
doorOpenness:function (id) { return uiDoorOpenness(app,id); },reducedMotion:uiPrefersReducedMotion(),
rootRank:game.progress.level >= MAX_LEVEL,targetId:game.objectiveTarget,palette:stage.palette,width:stage.width,height:stage.height,dpr:stage.dpr,
};
}
function uiDrawFrame(app,now) {
if (!app.game.stage.tile) return;
const frame = uiFrameFor(app,now);
uiDrawTiles(frame);
uiDrawAvatar(frame);
uiDrawFx(frame);
uiDrawWayfinding(frame);
uiSyncHint(app.game);
uiSyncNearPlate(app.game);
uiGameDebug().frames += 1;
}

export { uiGridStage, uiSyncGridLoop };

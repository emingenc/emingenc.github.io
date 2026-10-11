import { hasBeat,withBeat } from '../game/ext/ops.js';
import { bentFinalBeat } from '../game/finale/root-review.js';
import { uiEl,uiPrefersReducedMotion } from './dom.js';
import { uiRenderApp,uiRenderKeepingFocus } from './app.js';
import { uiCommitExt } from './ext-storage.js';
import { uiSectorAt } from './grid-draw-tiles.js';
import { uiLinkStyles } from './lazy-style.js';
import { uiDrawMap } from './map-draw.js';
import { uiOpenEnding } from './screen-ending.js';
import { uiStoryClosed,uiStoryFinal } from './story-dialogue.js';

const FLIP_MS = 300;
const UNSEAL_GROUPS = 4;
const HALT_SHEET = 'styles/lazy/halt.css';
const PALETTE_NAMES = ['bg','panel','border','primary','bright','text','dim','cyan','magenta','amber','red'];
const ACCENTS = ['primary','bright','cyan','magenta','amber','red'];

function uiHaltGroupAdd(groups,region,spot) {
const group = groups.get(region) || { region,cells:[],distance:Infinity };
group.cells.push(spot.cell);
group.distance = Math.min(group.distance,spot.distance);
groups.set(region,group);
}
function uiHaltGroups(world) {
const groups = new Map();
for (let index = 0; index < world.cols * world.rows; index += 1) {
const cell = { col:index % world.cols,row:Math.floor(index / world.cols) };
const region = uiSectorAt(world,cell);
if (region) uiHaltGroupAdd(groups,region,{ cell,distance:Math.abs(cell.col - world.kernel.col) + Math.abs(cell.row - world.kernel.row) });
}
return [...groups.values()].sort((first,second) => first.distance - second.distance);
}
function uiSizeCanvas(canvas) {
const dpr = window.devicePixelRatio || 1;
const width = canvas.clientWidth;
const height = canvas.clientHeight;
canvas.width = Math.round(width * dpr);
canvas.height = Math.round(height * dpr);
const ctx = canvas.getContext('2d');
ctx.setTransform(dpr,0,0,dpr,0,0);
return { ctx,width,height };
}
function uiReadPalette(canvas) {
const style = window.getComputedStyle(canvas);
return Object.fromEntries(PALETTE_NAMES.map((name) => [name,style.getPropertyValue('--' + name).trim()]));
}
function uiTinted(palette,color) {
return { ...palette,...Object.fromEntries(ACCENTS.map((name) => [name,color])) };
}
function uiCellRect(layout,cell) {
return [layout.left + cell.col * layout.tile,layout.top + cell.row * layout.tile,layout.tile,layout.tile];
}
function uiFlipGroup(view,layout,group) {
view.ctx.save();
view.ctx.beginPath();
group.cells.forEach((cell) => view.ctx.rect(...uiCellRect(layout,cell)));
view.ctx.clip();
uiDrawMap(view);
view.ctx.restore();
}
function uiUnsealCells(view,layout,count) {
view.ctx.fillStyle = view.palette.bright;
view.world.encrypted.forEach(function (entry,index) {
if (index % UNSEAL_GROUPS < count) view.ctx.fillRect(...uiCellRect(layout,entry));
});
}
function uiPaintHalt(canvas,scene) {
const sized = uiSizeCanvas(canvas);
if (!sized.width || !sized.height) return;
const base = uiReadPalette(canvas);
const view = { ...sized,world:scene.world,progress:scene.progress,save:scene.save,avatar:scene.avatar };
const green = { ...view,palette:uiTinted(base,base.primary) };
if (scene.flipped >= scene.groups.length) {
const whole = uiDrawMap(green);
if (whole) uiUnsealCells(green,whole,scene.unsealed);
return;
}
const layout = uiDrawMap({ ...view,palette:uiTinted(base,base.red) });
if (!layout) return;
scene.groups.slice(0,scene.flipped).forEach((group) => uiFlipGroup(green,layout,group));
uiUnsealCells(green,layout,scene.unsealed);
}
function uiDrawHaltedMap(canvas,state) {
const sized = uiSizeCanvas(canvas);
if (!sized.width || !sized.height) return;
const base = uiReadPalette(canvas);
uiDrawMap({ ...sized,palette:uiTinted(base,base.primary),world:state.world,progress:state.progress,save:state.save,avatar:state.avatar });
}

function uiUnsealed(app) {
const flow = app.story && app.story.flow;
return flow ? Math.min(UNSEAL_GROUPS,flow.line) :0;
}
function uiRenderHalt(app) {
const { halt } = app.game.review;
const done = halt.flipped >= halt.groups.length;
return uiEl('section',{
className:'screen screen-card halt-screen',
attrs:{ 'data-screen':'review','data-mode':'halt','data-flipped':String(halt.flipped) },
children:[
uiEl('h1',{ className:'halt-title',text:done ? 'ROOT HALTED' :'ROOT STOPPING' }),
uiEl('div',{ className:'halt-canvas-wrap',children:[uiEl('canvas',{ className:'halt-canvas',attrs:{ 'aria-hidden':'true' } })] }),
uiEl('p',{ className:'halt-status',attrs:{ role:'status' },text:'Sectors green: ' + halt.flipped + ' of ' + halt.groups.length }),
],
});
}
function uiSyncHalt(app,active,root) {
const review = app.game.review;
if (!active || !review || review.mode !== 'halt') return;
const canvas = root.querySelector('.halt-canvas');
if (!canvas || typeof canvas.getContext !== 'function') return;
const { world,progress,save,avatar } = app.game;
uiPaintHalt(canvas,{ world,progress,save,avatar:avatar.pos,groups:review.halt.groups,flipped:review.halt.flipped,unsealed:uiUnsealed(app) });
}

function uiHaltStale(app,review) {
return app.game.review !== review || app.screen !== 'review';
}
function uiHaltEnd(app) {
app.game.review = null;
app.game.reviveAt = null;
uiOpenEnding(app);
uiRenderApp(app);
}
function uiHaltStory(app,review) {
uiStoryFinal(app,bentFinalBeat());
uiRenderKeepingFocus(app);
uiStoryClosed(app).then(function () {
if (!uiHaltStale(app,review)) uiHaltEnd(app);
});
}
function uiHaltNext(app,review) {
const { halt } = review;
if (uiHaltStale(app,review)) return;
if (halt.flipped >= halt.groups.length) {
uiHaltStory(app,review);
return;
}
window.setTimeout(function () {
if (uiHaltStale(app,review)) return;
halt.flipped += 1;
uiRenderKeepingFocus(app);
uiHaltNext(app,review);
},FLIP_MS);
}
async function uiHaltRoot(app) {
const game = app.game;
const { review } = game;
if (!hasBeat(game.ext,'halted')) uiCommitExt(app,withBeat(game.ext,'halted'));
review.mode = 'halt';
review.halt = { groups:uiHaltGroups(game.world),flipped:0 };
await uiLinkStyles([HALT_SHEET]);
if (uiPrefersReducedMotion()) review.halt.flipped = review.halt.groups.length;
uiRenderKeepingFocus(app);
uiHaltNext(app,review);
}

export { uiHaltGroups,uiPaintHalt,uiDrawHaltedMap,uiRenderHalt,uiSyncHalt,uiHaltRoot };

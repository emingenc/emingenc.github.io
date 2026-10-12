import { trailAt,trailLost } from '../game/cast/patch.js';
import { hurtHp } from '../game/hp.js';
import { heartsLost } from '../game/finale/ordeal.js';
import { WAVES,region,waveFront,waveHearts,waveSteps,waveTouches } from '../game/finale/ordeal-waves.js';
import { cellAt } from '../game/world.js';
import { uiPrefersReducedMotion } from './dom.js';
import { ensureFight,uiHurt } from './grid-actors.js';
import { uiCastSleep } from './grid-cast-act.js';
import { uiOnGrid } from './grid-ordeal-sheet.js';
import { uiPaintCastArt } from './grid-cast-sprites.js';

const FLOOD_ALPHA = 0.32;
const FRONT_ALPHA = 0.7;
const DRAG_MS = 700;
const BESIDE = Object.freeze([{ col:-1,row:0 },{ col:1,row:0 },{ col:0,row:-1 },{ col:0,row:1 }]);

function uiSpotOf(cell,frame) {
return { left:(cell.col - frame.camera.col) * frame.tile,top:(cell.row - frame.camera.row) * frame.tile };
}
function uiCovered(flood) {
return flood.dir === 1 ? { from:flood.area.fromCol,to:flood.front } :{ from:flood.front,to:flood.area.toCol };
}
function uiPaintFlood(ctx,frame,flood) {
const { area } = flood;
const covered = uiCovered(flood);
const rows = area.maxRow - area.minRow + 1;
const origin = uiSpotOf({ col:covered.from,row:area.minRow },frame);
const front = uiSpotOf({ col:flood.front,row:area.minRow },frame);
ctx.save();
ctx.fillStyle = frame.palette.red;
ctx.globalAlpha = FLOOD_ALPHA;
ctx.fillRect(origin.left,origin.top,(covered.to - covered.from + 1) * frame.tile,rows * frame.tile);
ctx.globalAlpha = FRONT_ALPHA;
ctx.fillRect(front.left,front.top,frame.tile,rows * frame.tile);
ctx.restore();
}
function uiPaintDrag(ctx,frame,drag) {
const along = drag.ms > 0 ? Math.min(1,Math.max(0,(frame.now - drag.at) / drag.ms)) :1;
if (along >= 1) return;
const cell = { col:drag.from.col + (drag.to.col - drag.from.col) * along,row:drag.from.row + (drag.to.row - drag.from.row) * along };
ctx.save();
ctx.globalAlpha = 1 - along;
uiPaintCastArt(ctx,frame,{ name:'patch',...uiSpotOf(cell,frame) });
ctx.restore();
}
function uiDrawOrdeal(ctx,app,frame) {
const flood = app.game.ordealFlood;
if (!flood) return;
if (flood.drag) uiPaintDrag(ctx,frame,flood.drag);
if (flood.front !== null) uiPaintFlood(ctx,frame,flood);
}
function uiFloodStart(game) {
const cast = game.drawCast;
game.ordealFlood = { area:region(game.avatar.pos),wave:0,dir:1,front:null,drag:null,cast };
game.drawCast = function (ctx,app,frame) {
if (cast) cast(ctx,app,frame);
uiDrawOrdeal(ctx,app,frame);
};
}
function uiFloodStop(game) {
const flood = game.ordealFlood;
if (!flood) return;
game.drawCast = flood.cast;
game.ordealFlood = null;
if (game.cast) game.cast.dragged = false;
}
function uiBeside(game,hero) {
const open = BESIDE.map((step) => ({ col:hero.col + step.col,row:hero.row + step.row })).find((cell) => {
const entry = cellAt(game.world,cell);
return Boolean(entry) && entry.kind === 'floor';
});
return open || { ...hero };
}
function uiFloodSeat(game) {
const cast = game.cast;
if (!cast || cast.role !== 'follow') return false;
if (!cast.trail || trailLost(cast.trail,game.avatar.pos)) cast.trail = trailAt(uiBeside(game,game.avatar.pos));
return true;
}
function uiFloodLive(game) {
const flood = game.ordealFlood;
if (!flood) return;
Object.assign(flood,{ wave:WAVES.length,dir:1,front:flood.area.toCol });
}
function uiFloodHurt(app,count) {
const fight = ensureFight(app.game);
const lost = heartsLost(fight.hp.hearts,count);
if (lost > 0) fight.hp = hurtHp(fight.hp,lost).hp;
return lost;
}
function uiFloodTouch(app,wave) {
const lost = waveHearts(wave,ensureFight(app.game).hp.hearts);
if (lost > 0) uiHurt(app,lost,'flood');
}
function uiStandMs(wave,fronts,reduced) {
if (fronts.next) return fronts.next.atMs - fronts.front.atMs;
return reduced ? 0 :WAVES[wave - 1].stepMs;
}
async function uiFloodWave(app,wave) {
const game = app.game;
const flood = game.ordealFlood;
const reduced = uiPrefersReducedMotion();
Object.assign(flood,{ wave,dir:WAVES[wave - 1].dir,front:null });
let touched = false;
for (let step = 0; step < waveSteps(wave,flood.area,reduced); step += 1) {
const front = waveFront(wave,step,flood.area,reduced);
flood.front = front.col;
if (app.screen !== 'grid') await uiOnGrid(app); 
if (!touched && waveTouches(front,game.avatar.pos,flood.area,reduced)) {
touched = true;
uiFloodTouch(app,wave);
}
const next = waveFront(wave,step + 1,flood.area,reduced);
await uiCastSleep(app,uiStandMs(wave,{ front,next },reduced));
}
}
async function uiFloodDragOff(app) {
const game = app.game;
const flood = game.ordealFlood;
const trail = game.cast.trail;
const from = trail ? { col:trail.col,row:trail.row } :{ ...game.avatar.pos };
const edge = flood.dir === 1 ? flood.area.toCol + 1 :flood.area.fromCol - 1;
const ms = uiPrefersReducedMotion() ? 0 :DRAG_MS;
flood.drag = { from,to:{ col:edge,row:from.row },at:performance.now(),ms };
game.cast.trail = null;
game.cast.dragged = true;
await uiCastSleep(app,ms);
flood.drag = null;
}

export { uiFloodStart,uiFloodStop,uiFloodSeat,uiFloodLive,uiFloodHurt,uiFloodWave,uiFloodDragOff,uiDrawOrdeal };

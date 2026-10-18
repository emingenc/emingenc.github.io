import { PATCH_CELL,trailAt,trailLost,trailPose } from '../game/cast/patch.js';
import { hurtHp } from '../game/hp.js';
import { heartsLost } from '../game/finale/ordeal.js';
import { WAVES,region,waveFront,waveHearts,waveSteps,waveTouches } from '../game/finale/ordeal-waves.js';
import { cellAt } from '../game/world.js';
import { uiAnnounce,uiPrefersReducedMotion } from './dom.js';
import { ensureFight,uiHurt } from './grid-actors.js';
import { uiCastSleep } from './grid-cast-act.js';
import { uiOnGrid } from './grid-ordeal-sheet.js';
import { uiPaintCastArt } from './grid-cast-sprites.js';

const FLOOD_ALPHA = 0.28;
const FRONT_ALPHA = 0.7;
const SPECK_ALPHA = 0.6;
const DRAG_MS = 700;
const HIT_MS = 900;
const FLASH_MS = 250;
const SAY_MS = 1800;
const SAY_REDUCED_MS = 1200;
const TILE_INSET_PX = 1;
const SPECK_EVERY = 6;
const HASH_COL = 73856093;
const HASH_ROW = 19349663;
const SPECK_SPAN = 100;
const SPECK_COL_SHIFT = 3;
const SPECK_ROW_SHIFT = 11;
const HALF = 0.5;
const SPECK_TILES = 0.18;
const RISE_TILES = 0.6;
const TEXT_TILES = 0.3;
const TEXT_MIN_PX = 10;
const BUBBLE_MIN_PX = 12;
const BUBBLE_MAX_LINES = 2;
const LINE_EM = 1.25;
const ELLIPSIS = '…';
const GLYPH_EM = 0.6;
const PAD_EM = 0.6;
const EDGE_PX = 4;
const BUBBLE_GAP_TILES = 0.12;
const WHITE = '#ffffff';
const BESIDE = Object.freeze([{ col:-1,row:0 },{ col:1,row:0 },{ col:0,row:-1 },{ col:0,row:1 }]);
const AROUND = Object.freeze([-1,0,1].flatMap((row) => [-1,0,1].map((col) => ({ col,row }))).filter((step) => step.col !== 0 || step.row !== 0));

function uiSpotOf(cell,frame) {
return { left:(cell.col - frame.camera.col) * frame.tile,top:(cell.row - frame.camera.row) * frame.tile };
}
function uiCovered(flood) {
return flood.dir === 1 ? { from:flood.area.fromCol,to:flood.front } :{ from:flood.front,to:flood.area.toCol };
}
function uiPaintTile(ctx,frame,cell) {
const spot = uiSpotOf(cell,frame);
const side = frame.tile - TILE_INSET_PX * 2;
ctx.fillRect(spot.left + TILE_INSET_PX,spot.top + TILE_INSET_PX,side,side);
}
function uiSeed(cell) {
return Math.imul(cell.col + 1,HASH_COL) ^ Math.imul(cell.row + 1,HASH_ROW);
}
function uiPaintSpeck(ctx,frame,cell) {
const seed = uiSeed(cell) >>> 0;
if (seed % SPECK_EVERY !== 0) return;
const spot = uiSpotOf(cell,frame);
const size = frame.tile * SPECK_TILES;
const room = frame.tile - size - TILE_INSET_PX * 2;
const across = ((seed >>> SPECK_COL_SHIFT) % SPECK_SPAN) / SPECK_SPAN;
const down = ((seed >>> SPECK_ROW_SHIFT) % SPECK_SPAN) / SPECK_SPAN;
ctx.fillRect(spot.left + TILE_INSET_PX + across * room,spot.top + TILE_INSET_PX + down * room,size,size);
}
function uiCoveredCells(flood) {
const { area } = flood;
const covered = uiCovered(flood);
const cells = [];
for (let col = covered.from; col <= covered.to; col += 1) {
for (let row = area.minRow; row <= area.maxRow; row += 1) cells.push({ col,row });
}
return cells;
}
function uiPaintFlood(ctx,frame,flood) {
const cells = uiCoveredCells(flood);
ctx.save();
ctx.fillStyle = frame.palette.red;
cells.forEach((cell) => {
ctx.globalAlpha = cell.col === flood.front ? FRONT_ALPHA :FLOOD_ALPHA;
uiPaintTile(ctx,frame,cell);
});
ctx.fillStyle = frame.palette.bright;
ctx.globalAlpha = SPECK_ALPHA;
cells.filter((cell) => cell.col !== flood.front).forEach((cell) => uiPaintSpeck(ctx,frame,cell));
ctx.restore();
}
function uiTextSize(frame) {
return Math.max(TEXT_MIN_PX,Math.round(frame.tile * TEXT_TILES));
}
function uiPaintLabel(ctx,frame,label) {
const size = uiTextSize(frame);
const width = label.text.length * size * GLYPH_EM + size * PAD_EM;
ctx.fillStyle = frame.palette.bg;
ctx.fillRect(label.x - width / 2,label.y - size - size * PAD_EM / 2,width,size + size * PAD_EM);
ctx.font = 'bold ' + size + 'px monospace';
ctx.textAlign = 'center';
ctx.textBaseline = 'bottom';
ctx.fillStyle = frame.palette.bright;
ctx.fillText(label.text,label.x,label.y);
}
function uiHitText(lost) {
if (lost <= 0) return 'HIT';
return '-' + lost + (lost === 1 ? ' HEART' :' HEARTS');
}
function uiPaintHit(ctx,app,frame) {
const hit = app.game.ordealFlood.hit;
const age = frame.now - hit.at;
if (age < 0 || age >= HIT_MS) return;
const hero = app.game.avatar.pos;
const spot = uiSpotOf(hero,frame);
const fade = frame.reducedMotion ? 1 :1 - age / HIT_MS;
ctx.save();
ctx.fillStyle = frame.palette.bright;
ctx.globalAlpha = FRONT_ALPHA * fade;
AROUND.forEach((step) => uiPaintTile(ctx,frame,{ col:hero.col + step.col,row:hero.row + step.row }));
if (frame.reducedMotion || age < FLASH_MS) {
ctx.fillStyle = WHITE;
ctx.globalAlpha = frame.reducedMotion ? FRONT_ALPHA :1 - age / FLASH_MS;
uiPaintTile(ctx,frame,hero);
}
ctx.globalAlpha = 1;
const rise = frame.reducedMotion ? 0 :frame.tile * RISE_TILES * (age / HIT_MS);
uiPaintLabel(ctx,frame,{ text:uiHitText(hit.lost),x:spot.left + frame.tile / 2,y:spot.top - rise });
ctx.restore();
}
function uiSayCell(app,frame,flood) {
const hero = app.game.avatar.pos;
if (flood.bubble.at !== 'patch') return hero;
const cast = app.game.cast;
if (flood.drag) return flood.drag.from;
if (flood.patchLast) return flood.patchLast;
if (flood.patchAt === 'bench' && cast && !cast.dragged) return flood.bench;
if (flood.patchAt === 'follow' && cast && cast.trail) return trailPose(cast.trail,{ now:frame.now,still:frame.reducedMotion });
return hero;
}
function uiBubbleSize(frame) {
return Math.max(BUBBLE_MIN_PX,uiTextSize(frame));
}
function uiFitText(text,cap) {
return text.length <= cap ? text :text.slice(0,Math.max(0,cap - 1)) + ELLIPSIS;
}
function uiBreakWords(text,firstCap,restCap) {
const lines = [''];
text.split(' ').forEach((word) => {
const last = lines.length - 1;
const joined = lines[last] ? lines[last] + ' ' + word :word;
if (joined.length <= (last === 0 ? firstCap :restCap) || !lines[last]) lines[last] = joined;
else lines.push(word);
});
return lines;
}
function uiBubbleLines(frame,bubble,size) {
const cap = Math.max(1,Math.floor((frame.width - EDGE_PX * 2 - size * PAD_EM * 2) / (size * GLYPH_EM)));
const firstCap = Math.max(1,cap - bubble.who.length - 1);
const lines = uiBreakWords(bubble.text,firstCap,cap);
const rest = lines.slice(1).join(' ');
return [uiFitText(lines[0],firstCap),...(rest ? [uiFitText(rest,cap)] :[])].slice(0,BUBBLE_MAX_LINES);
}
function uiBubbleBox(frame,bubble,spot) {
const size = uiBubbleSize(frame);
const pad = size * PAD_EM;
const lines = uiBubbleLines(frame,bubble,size);
const chars = Math.max(bubble.who.length + 1 + lines[0].length,...lines.map((line) => line.length));
const width = chars * size * GLYPH_EM + pad * 2;
const height = lines.length * size * LINE_EM + pad * 2;
const left = Math.max(EDGE_PX,Math.min(frame.width - width - EDGE_PX,spot.left + frame.tile * HALF - width * HALF));
const top = Math.max(EDGE_PX,Math.min(frame.height - height - EDGE_PX,spot.top - height - frame.tile * BUBBLE_GAP_TILES));
return { left,top,width,height,size,pad,lines };
}
function uiPaintBubble(ctx,app,frame) {
const flood = app.game.ordealFlood;
const bubble = flood.bubble;
const box = uiBubbleBox(frame,bubble,uiSpotOf(uiSayCell(app,frame,flood),frame));
const label = bubble.who + ' ';
const rowAt = (index) => box.top + box.pad + box.size * LINE_EM * (index + HALF);
ctx.save();
ctx.globalAlpha = 1;
ctx.fillStyle = frame.palette.panel;
ctx.fillRect(box.left,box.top,box.width,box.height);
ctx.strokeStyle = frame.palette.primary;
ctx.lineWidth = 1;
ctx.strokeRect(box.left + HALF,box.top + HALF,box.width - 1,box.height - 1);
ctx.font = 'bold ' + box.size + 'px monospace';
ctx.textAlign = 'left';
ctx.textBaseline = 'middle';
ctx.fillStyle = frame.palette.magenta;
ctx.fillText(label,box.left + box.pad,rowAt(0));
ctx.fillStyle = frame.palette.text;
ctx.fillText(box.lines[0],box.left + box.pad + label.length * box.size * GLYPH_EM,rowAt(0));
box.lines.slice(1).forEach((line,index) => ctx.fillText(line,box.left + box.pad,rowAt(index + 1)));
ctx.restore();
}
function uiTrailCols(drag,area,along) {
const reach = Math.round(drag.from.col + (drag.to.col - drag.from.col) * along);
return { from:Math.max(area.fromCol,Math.min(drag.from.col,reach)),to:Math.min(area.toCol,Math.max(drag.from.col,reach)) };
}
function uiPaintDrag(ctx,frame,flood) {
const drag = flood.drag;
const along = drag.ms > 0 ? Math.min(1,Math.max(0,(frame.now - drag.at) / drag.ms)) :1;
if (along >= 1) return;
const cols = uiTrailCols(drag,flood.area,along);
ctx.save();
ctx.fillStyle = frame.palette.red;
ctx.globalAlpha = FRONT_ALPHA;
for (let col = cols.from; col <= cols.to; col += 1) uiPaintTile(ctx,frame,{ col,row:drag.from.row });
const cell = { col:drag.from.col + (drag.to.col - drag.from.col) * along,row:drag.from.row + (drag.to.row - drag.from.row) * along };
ctx.globalAlpha = 1 - along;
uiPaintCastArt(ctx,frame,{ name:'patch',...uiSpotOf(cell,frame) });
ctx.restore();
}
function uiDrawOrdeal(ctx,app,frame) {
const flood = app.game.ordealFlood;
if (!flood) return;
if (flood.front !== null) uiPaintFlood(ctx,frame,flood);
if (flood.drag) uiPaintDrag(ctx,frame,flood);
if (flood.hit) uiPaintHit(ctx,app,frame);
if (flood.bubble) uiPaintBubble(ctx,app,frame);
}
function uiFloodStart(game) {
const cast = game.drawCast;
game.ordealFlood = { area:region(game.avatar.pos),wave:0,dir:1,front:null,drag:null,cast,hit:null,bubble:null,patchAt:'follow',bench:null,patchLast:null };
game.drawCast = function (ctx,app,frame) {
if (cast) cast(ctx,app,frame);
uiDrawOrdeal(ctx,app,frame);
};
}
function uiFloodStop(game) {
const flood = game.ordealFlood;
if (!flood) return;
game.drawCast = flood.cast;
flood.bubble = null;
flood.hit = null;
flood.patchLast = null;
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
function uiBenchSeat(area) {
return { col:Math.min(area.toCol,Math.max(area.fromCol,PATCH_CELL.col)),row:Math.min(area.maxRow,Math.max(area.minRow,PATCH_CELL.row)) };
}
function uiFloodSeat(game) {
const cast = game.cast;
if (!cast) return false;
const bench = cast.role === 'talk' || cast.role === 'busy' || cast.role === 'none';
if (game.ordealFlood) Object.assign(game.ordealFlood,{ patchAt:bench ? 'bench' :'follow',bench:bench ? uiBenchSeat(game.ordealFlood.area) :null });
if (bench) return true;
if (cast.role !== 'follow') return false;
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
app.game.ordealFlood.hit = { at:performance.now(),lost };
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
const at = trail ? { col:trail.col,row:trail.row } :{ ...game.avatar.pos };
const from = flood.patchAt === 'bench' ? { ...flood.bench } :at;
const edge = flood.dir === 1 ? flood.area.toCol + 1 :flood.area.fromCol - 1;
const ms = uiPrefersReducedMotion() ? 0 :DRAG_MS;
flood.drag = { from,to:{ col:edge,row:from.row },at:performance.now(),ms };
flood.patchLast = { ...from };
game.cast.trail = null;
game.cast.dragged = true;
await uiCastSleep(app,ms);
flood.drag = null;
}

async function uiFloodSay(app,line) {
const flood = app.game.ordealFlood;
if (!flood) return;
const bubble = { who:line.who,text:line.text,at:line.at,since:performance.now() };
flood.bubble = bubble;
uiAnnounce(line.who + ': ' + line.text);
await uiCastSleep(app,line.ms ?? (uiPrefersReducedMotion() ? SAY_REDUCED_MS :SAY_MS));
if (flood.bubble === bubble) flood.bubble = null;
}

export { uiFloodSay,uiFloodStart,uiFloodStop,uiFloodSeat,uiFloodLive,uiFloodHurt,uiFloodWave,uiFloodDragOff,uiDrawOrdeal };

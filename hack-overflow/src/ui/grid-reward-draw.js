import { BLOCK_CELLS,TRIM_CELLS } from '../game/finale/reward-cells.js';
import { drawerReady } from '../game/finale/refactor.js';
import { blockDelayMs,sweepLook,sweepWarning } from '../game/reward-motion.js';
import { uiGridBurst } from './grid-draw-fx.js';
import { uiSpotOf } from './grid-spot.js';

const EDGES = Object.freeze({ live:'#00e5ff',ref:'#35d07f',swept:'#b41e3c' });
const FILLS = Object.freeze({ live:'#0d1f2b',ref:'#0f3a26',swept:'#2b0d14' });
const TEXT = '#e8f1f5';
const TRIM = '#00e5ff';
const INSET_TILES = 0.1;
const EDGE_TILES = 0.08;
const FONT_TILES = 0.42;
const FONT_FACE = 'px VT323, monospace';
const MIDDLE = 0.5;
const TRIM_TILES = 0.06;
const TIMER = '#ff4d6d';
const TIMER_TRACK = '#3a1a22';
const TIMER_TILES = 0.16;
const TIMER_AT = 0.76;
const TIMER_FONT_TILES = 0.22;
const TIMER_TEXT_AT = 0.2;
const PINNED = 1;
const FLASH_ALPHA = 0.85;
const FIZZ = Object.freeze({ kind:'fizz',count:6 });

function uiPaintBlock(ctx,frame,place) {
const { spot,shown } = place;
const left = spot.left + place.dx;
const inset = frame.tile * INSET_TILES;
const size = frame.tile - 2 * inset;
const edge = Math.max(1,Math.round(frame.tile * EDGE_TILES));
ctx.fillStyle = EDGES[shown];
ctx.fillRect(left + inset,spot.top + inset,size,size);
ctx.fillStyle = FILLS[shown];
ctx.fillRect(left + inset + edge,spot.top + inset + edge,size - 2 * edge,size - 2 * edge);
ctx.fillStyle = TEXT;
ctx.font = Math.round(frame.tile * FONT_TILES) + FONT_FACE;
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';
ctx.fillText(String(place.block.n),left + frame.tile * MIDDLE,spot.top + frame.tile * MIDDLE);
}
function uiShownOf(entry,now) {
return now >= entry.flipAt ? entry.target :entry.from;
}
function uiStartChange(entry,change) {
const { at,block,frame } = change;
entry.from = uiShownOf(entry,frame.now);
entry.target = block.state;
entry.flipAt = frame.reducedMotion ? 0 :frame.now + blockDelayMs({ at,to:block.state });
entry.hitAt = block.state === 'swept' && !frame.reducedMotion ? frame.now :null;
const spot = entry.hitAt === null ? null :BLOCK_CELLS[at];
if (spot) uiGridBurst({ ...FIZZ,origin:{ col:spot.col + MIDDLE,row:spot.row + MIDDLE },atMs:frame.now,seed:Math.floor(frame.now) + at });
}
function uiLookOf(state,change) {
if (!state.looks) state.looks = [];
const { at,block } = change;
if (!state.looks[at]) state.looks[at] = { from:block.state,target:block.state,flipAt:0,hitAt:null };
const entry = state.looks[at];
if (entry.target !== block.state) uiStartChange(entry,change);
return entry;
}
function uiPaintHit(ctx,frame,place) {
const look = sweepLook(frame.now - place.hitAt);
if (!look) return uiPaintBlock(ctx,frame,place);
const cx = place.spot.left + frame.tile * MIDDLE + look.jitter;
const cy = place.spot.top + frame.tile * MIDDLE;
ctx.save();
ctx.translate(cx,cy);
ctx.scale(look.scale,look.scale);
ctx.translate(-cx,-cy);
uiPaintBlock(ctx,frame,{ ...place,dx:place.dx + look.jitter });
ctx.restore();
ctx.globalAlpha = look.flash * FLASH_ALPHA;
ctx.fillStyle = TEXT;
const inset = frame.tile * INSET_TILES;
ctx.fillRect(place.spot.left + inset + look.jitter,place.spot.top + inset,frame.tile - 2 * inset,frame.tile - 2 * inset);
ctx.globalAlpha = 1;
}
function uiPaintBlocks(ctx,frame,view) {
view.state.run.blocks.forEach(function (block,at) {
const spot = uiSpotOf(BLOCK_CELLS[at],frame);
if (!spot) return;
const entry = uiLookOf(view.state,{ at,block,frame });
const shown = uiShownOf(entry,frame.now);
const place = { spot,block,shown,dx:at === view.warn.at ? view.warn.shake :0,hitAt:entry.hitAt };
if (shown === 'swept' && entry.hitAt !== null) uiPaintHit(ctx,frame,place);
else uiPaintBlock(ctx,frame,place);
});
}
function uiNextSweep(reward) {
return reward.blocks.findLastIndex((block) => block.state === 'live' && block.n > PINNED);
}
function uiTimerShare(frame,clock) {
if (frame.reducedMotion || !(clock.every > 0)) return 1;
return Math.min(1,Math.max(0,(clock.at - frame.now) / clock.every));
}
function uiPaintTimer(ctx,frame,place) {
const { spot,share,blink } = place;
const inset = frame.tile * INSET_TILES;
const size = frame.tile - 2 * inset;
const high = Math.max(2,Math.round(frame.tile * TIMER_TILES));
ctx.fillStyle = TIMER_TRACK;
ctx.fillRect(spot.left + inset,spot.top + frame.tile * TIMER_AT,size,high);
ctx.fillStyle = TIMER;
ctx.globalAlpha = blink;
ctx.fillRect(spot.left + inset,spot.top + frame.tile * TIMER_AT,size * share,high);
ctx.globalAlpha = 1;
ctx.fillStyle = TEXT;
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';
ctx.font = Math.round(frame.tile * TIMER_FONT_TILES) + FONT_FACE;
ctx.fillText('GC',spot.left + frame.tile * MIDDLE,spot.top + frame.tile * TIMER_TEXT_AT);
}
function uiPaintSweepClock(ctx,frame,view) {
const spot = view.warn.at >= 0 ? uiSpotOf(BLOCK_CELLS[view.warn.at],frame) :null;
if (spot) uiPaintTimer(ctx,frame,{ spot,share:uiTimerShare(frame,view.state.clock),blink:view.warn.blink });
}
function uiWarnOf(frame,state) {
const at = uiNextSweep(state.run);
const calm = { at,blink:1,shake:0 };
if (!state.clock || frame.reducedMotion || at < 0) return calm;
return { at,...sweepWarning(uiTimerShare(frame,state.clock),frame.now) };
}
function uiPaintRun(ctx,frame,state) {
const view = { state,warn:uiWarnOf(frame,state) };
uiPaintBlocks(ctx,frame,view);
if (state.clock) uiPaintSweepClock(ctx,frame,view);
}
function uiPaintTrim(ctx,frame) {
const edge = Math.max(2,Math.round(frame.tile * TRIM_TILES));
ctx.strokeStyle = TRIM;
ctx.lineWidth = edge;
TRIM_CELLS.map((cell) => uiSpotOf(cell,frame)).filter(Boolean).forEach(function (spot) {
ctx.strokeRect(spot.left + edge / 2,spot.top + edge / 2,frame.tile - edge,frame.tile - edge);
});
}

function uiPaintReward(ctx,app,frame) {
const game = app.game;
const state = game.reward && game.reward.gen === game.gen ? game.reward : null;
if (!state) return;
if (state.run) uiPaintRun(ctx,frame,state);
if (!state.run && drawerReady(game.progress.won,game.ext,game.save)) uiPaintTrim(ctx,frame);
}

export { uiPaintReward };

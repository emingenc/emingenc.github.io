import { VALUE_CELLS } from '../game/fusion/mono-deque-cells.js';
import { MONO_DEQUE } from '../game/fusion/mono-deque.js';
import { uiFloorSpot,uiPaintCross } from './grid-fusion-floor.js';
import { FONT_FACE,INSET_TILES,MIDDLE,TEXT,uiPaintLabel,uiPaintRow } from './grid-fusion-tiles.js';

const LOOKS = Object.freeze({
next:Object.freeze({ edge:'#00e5ff',fill:'#0d1f2b' }),kept:Object.freeze({ edge:'#ffb300',fill:'#2b210d' }),
idle:Object.freeze({ edge:'#3a4a55',fill:'#10171c' }),spent:Object.freeze({ edge:'#222b31',fill:'#0b0f12' }),
});
const GHOSTS = Object.freeze({ pop:'#ff4d6d',expire:'#ffb300' });
const LINK = '#ffb300';
const LANE_TEXT = '#9fb4bd';
const LANE_DIM = '#4a5a65';
const GHOST_MS = 450;
const CHIP_TOP = 0.3;
const CHIP_TILES = 0.44;
const CHIP_FONT_TILES = 0.34;
const EDGE_CHIP_TILES = 0.06;
const END_FONT_TILES = 0.2;
const END_AT = 0.87;
const EMPTY_FONT_TILES = 0.3;
const LINK_TILES = 0.04;
const LINK_FIRST = 0.2;
const LINK_STEP = 0.15;
const LINK_ALPHA = 0.7;
const GHOST_ALPHA = 0.8;

let uiMemory = null;

function uiLookOf(run,at) {
const held = run.deque.indexOf(at);
if (held >= 0) return { ...LOOKS.kept,mark:held === 0 ? 'F' :held === run.deque.length - 1 ? 'B' :'' };
if (at === run.t && !run.pushed && run.status === 'running') return { ...LOOKS.next,mark:'x' };
return { ...LOOKS[at > run.t ? 'idle' :'spent'],mark:'' };
}
function uiLaneCell(place) {
return { col:VALUE_CELLS[0].col + place,row:VALUE_CELLS[0].row + 1 };
}
function sameList(one,two) {
return one.length === two.length && one.every((value,at) => value === two[at]);
}
function uiRemoval(prev,run,puzzle) {
if (prev.length === 0) return '';
const stale = prev[0] <= run.t - puzzle.k;
const frontGone = sameList(prev.slice(1),run.deque);
const backGone = sameList(prev.slice(0,-1),run.deque);
if (frontGone && (stale || !backGone)) return 'expire';
return backGone ? 'pop' :'';
}
function uiGhostOf(prev,run,place) {
const { puzzle,frame } = place;
const kind = frame.reducedMotion ? '' :uiRemoval(prev,run,puzzle);
if (!kind) return null;
const at = kind === 'pop' ? prev.length - 1 :0;
return { kind,slot:kind === 'pop' ? at :-1,value:puzzle.nums[prev[at]],since:frame.now };
}
function uiNoteMoves(run,place) {
if (!uiMemory || run.moves < uiMemory.moves) uiMemory = { moves:run.moves,deque:[...run.deque],ghost:null };
else if (run.moves > uiMemory.moves) {
uiMemory = { moves:run.moves,deque:[...run.deque],ghost:uiGhostOf(uiMemory.deque,run,place) || uiMemory.ghost };
}
return uiMemory.ghost;
}
function uiPaintChip(ctx,frame,place) {
const { spot,value,edge,fill,ink } = place;
const inset = frame.tile * INSET_TILES;
const border = Math.max(1,Math.round(frame.tile * EDGE_CHIP_TILES));
const top = spot.top + frame.tile * CHIP_TOP;
const high = frame.tile * CHIP_TILES;
ctx.fillStyle = edge;
ctx.fillRect(spot.left + inset,top,frame.tile - 2 * inset,high);
ctx.fillStyle = fill;
ctx.fillRect(spot.left + inset + border,top + border,frame.tile - 2 * inset - 2 * border,high - 2 * border);
ctx.fillStyle = ink;
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';
ctx.font = Math.round(frame.tile * CHIP_FONT_TILES) + FONT_FACE;
ctx.fillText(String(value),spot.left + frame.tile * MIDDLE,top + high / 2);
}
function uiPaintLink(ctx,frame,place) {
const { from,to,level } = place;
const thick = Math.max(1,Math.round(frame.tile * LINK_TILES));
const fromX = from.left + frame.tile * MIDDLE;
const toX = to.left + frame.tile * MIDDLE;
const fromY = from.top + frame.tile * (1 - INSET_TILES);
const toY = to.top + frame.tile * CHIP_TOP;
const bendY = fromY + (toY - fromY) * (LINK_FIRST + LINK_STEP * level);
const before = ctx.globalAlpha;
ctx.globalAlpha = before * LINK_ALPHA;
ctx.fillStyle = LINK;
ctx.fillRect(fromX - thick / 2,fromY,thick,bendY - fromY + thick);
ctx.fillRect(Math.min(fromX,toX) - thick / 2,bendY,Math.abs(fromX - toX) + thick,thick);
ctx.fillRect(toX - thick / 2,bendY,thick,toY - bendY);
ctx.globalAlpha = before;
}
function uiPaintEnd(ctx,frame,place) {
uiPaintLabel(ctx,frame,{ spot:place.spot,text:place.text,color:LANE_TEXT,size:END_FONT_TILES,at:END_AT });
}
function uiPaintHeld(ctx,frame,place) {
const { run,puzzle,at } = place;
const spot = uiFloorSpot(uiLaneCell(at),frame);
if (!spot) return;
const stream = at < VALUE_CELLS.length && run.deque[at] < VALUE_CELLS.length ? uiFloorSpot(VALUE_CELLS[run.deque[at]],frame) :null;
if (stream) uiPaintLink(ctx,frame,{ from:stream,to:spot,level:at });
uiPaintChip(ctx,frame,{ spot,value:puzzle.nums[run.deque[at]],edge:LOOKS.kept.edge,fill:LOOKS.kept.fill,ink:TEXT });
if (at === 0) uiPaintEnd(ctx,frame,{ spot,text:'FRONT' });
else if (at === run.deque.length - 1) uiPaintEnd(ctx,frame,{ spot,text:'BACK' });
}
function uiPaintEmpty(ctx,frame) {
const spot = uiFloorSpot(uiLaneCell(0),frame);
if (!spot) return;
ctx.fillStyle = LANE_DIM;
ctx.textAlign = 'left';
ctx.textBaseline = 'middle';
ctx.font = Math.round(frame.tile * EMPTY_FONT_TILES) + FONT_FACE;
ctx.fillText('DEQUE EMPTY',spot.left + frame.tile * INSET_TILES,spot.top + frame.tile * MIDDLE,Math.max(1,frame.width - spot.left));
}
function uiPaintGhost(ctx,frame,ghost) {
const age = frame.now - ghost.since;
const spot = age >= 0 && age < GHOST_MS ? uiFloorSpot(uiLaneCell(ghost.slot),frame) :null;
if (!spot) return;
const before = ctx.globalAlpha;
ctx.globalAlpha = before * GHOST_ALPHA * (1 - age / GHOST_MS);
uiPaintChip(ctx,frame,{ spot,value:ghost.value,edge:GHOSTS[ghost.kind],fill:LOOKS.spent.fill,ink:GHOSTS[ghost.kind] });
uiPaintCross(ctx,{ left:spot.left + frame.tile * INSET_TILES,top:spot.top + frame.tile * CHIP_TOP,size:frame.tile * CHIP_TILES,color:GHOSTS[ghost.kind] });
ctx.globalAlpha = before;
}
function uiPaintLane(ctx,frame,place) {
const { run,puzzle } = place;
const ghost = uiNoteMoves(run,{ puzzle,frame });
if (run.deque.length === 0) uiPaintEmpty(ctx,frame);
run.deque.forEach((_,at) => uiPaintHeld(ctx,frame,{ run,puzzle,at }));
if (ghost) uiPaintGhost(ctx,frame,ghost);
}

function uiPaintMonoDeque(ctx,frame,...args) {
const [run,puzzle = MONO_DEQUE] = args;
uiPaintRow(ctx,frame,{ values:puzzle.nums,cells:VALUE_CELLS,lookOf:(at) => uiLookOf(run,at) });
if (frame.floor === true) uiPaintLane(ctx,frame,{ run,puzzle });
}

export { uiPaintMonoDeque };

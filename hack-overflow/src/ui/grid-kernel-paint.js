import { floodedOf,ghostCells,nextOf } from '../game/finale/roadback.js';
import { uiSpotOf } from './grid-spot.js';

const FLOOD_FILL = 'rgba(180,30,60,0.55)';
const NEXT_EDGE = '#ff5577';
const GHOST_EDGE = '#00e5ff';
const OUTLINE_TILES = 0.06;
const CLONE_FILL = '#0d1f2b';
const CLONE_EDGE = '#3b8ea5';
const TAGGED_EDGE = '#00e5ff';
const CODE_FILL = '#e8f1f5';
const INSET_TILES = 0.1;
const EDGE_TILES = 0.08;
const FONT_TILES = 0.42;
const FONT_FACE = 'px VT323, monospace';
const MIDDLE = 0.5;

function uiOutline(ctx,frame,mark) {
const spot = uiSpotOf(mark.cell,frame);
if (!spot) return;
const edge = Math.max(2,Math.round(frame.tile * OUTLINE_TILES));
ctx.strokeStyle = mark.color;
ctx.lineWidth = edge;
ctx.strokeRect(spot.left + edge / 2,spot.top + edge / 2,frame.tile - edge,frame.tile - edge);
}
function uiPaintFlood(ctx,frame,road) {
ctx.fillStyle = FLOOD_FILL;
floodedOf(road.chase).forEach(function (cell) {
const spot = uiSpotOf(cell,frame);
if (spot) ctx.fillRect(spot.left,spot.top,frame.tile,frame.tile);
});
uiOutline(ctx,frame,{ cell:nextOf(road.chase),color:NEXT_EDGE });
if (road.ghost) ghostCells(road.ghost).forEach((cell) => uiOutline(ctx,frame,{ cell,color:GHOST_EDGE }));
}
function uiPaintBox(ctx,frame,spot) {
const inset = frame.tile * INSET_TILES;
return { left:spot.left + inset,top:spot.top + inset,size:frame.tile - 2 * inset };
}
function uiPaintClone(ctx,frame,clone) {
const spot = uiSpotOf(clone,frame);
if (!spot) return;
const box = uiPaintBox(ctx,frame,spot);
const edge = Math.max(1,Math.round(frame.tile * EDGE_TILES));
ctx.fillStyle = clone.tagged ? TAGGED_EDGE :CLONE_EDGE;
ctx.fillRect(box.left,box.top,box.size,box.size);
ctx.fillStyle = CLONE_FILL;
ctx.fillRect(box.left + edge,box.top + edge,box.size - 2 * edge,box.size - 2 * edge);
ctx.fillStyle = CODE_FILL;
ctx.font = Math.round(frame.tile * FONT_TILES) + FONT_FACE;
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';
ctx.fillText(clone.code,box.left + box.size * MIDDLE,box.top + box.size * MIDDLE);
}
function uiKernelPaint(app) {
return function (ctx,frame) {
const game = app.game;
if (game.roadback && game.roadback.chase) uiPaintFlood(ctx,frame,game.roadback);
const phase = game.kernel && game.kernel.active ? game.kernel.phase :null;
if (!phase) return;
phase.clones.filter((clone) => clone.hp > 0).forEach((clone) => uiPaintClone(ctx,frame,{ ...clone,tagged:phase.tagged.includes(clone.id) }));
};
}

export { uiKernelPaint };

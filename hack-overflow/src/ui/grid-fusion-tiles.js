import { uiFloorSpot } from './grid-fusion-floor.js';
import { uiSpotOf } from './grid-spot.js';

const TEXT = '#e8f1f5';
const INSET_TILES = 0.1;
const EDGE_TILES = 0.08;
const FONT_TILES = 0.42;
const MARK_TILES = 0.26;
const FONT_FACE = 'px VT323, monospace';
const MIDDLE = 0.5;
const MARK_AT = 0.2;

function uiPaintTile(ctx,frame,place) {
const { spot,text,look } = place;
const inset = frame.tile * INSET_TILES;
const size = frame.tile - 2 * inset;
const edge = Math.max(1,Math.round(frame.tile * EDGE_TILES));
ctx.fillStyle = look.edge;
ctx.fillRect(spot.left + inset,spot.top + inset,size,size);
ctx.fillStyle = look.fill;
ctx.fillRect(spot.left + inset + edge,spot.top + inset + edge,size - 2 * edge,size - 2 * edge);
ctx.fillStyle = TEXT;
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';
ctx.font = Math.round(frame.tile * FONT_TILES) + FONT_FACE;
ctx.fillText(text,spot.left + frame.tile * MIDDLE,spot.top + frame.tile * MIDDLE);
if (!look.mark) return;
ctx.font = Math.round(frame.tile * MARK_TILES) + FONT_FACE;
ctx.fillText(look.mark,spot.left + frame.tile * MIDDLE,spot.top + frame.tile * MARK_AT);
}
function uiPaintRow(ctx,frame,row) {
const { values,cells,lookOf } = row;
Array.from(values).forEach(function (value,at) {
const spot = at < cells.length ? uiSpotOf(cells[at],frame) :null;
if (spot) uiPaintTile(ctx,frame,{ spot,text:String(value),look:lookOf(at) });
});
}
function uiPaintLabel(ctx,frame,place) {
ctx.fillStyle = place.color;
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';
ctx.font = Math.round(frame.tile * place.size) + FONT_FACE;
ctx.fillText(place.text,place.spot.left + frame.tile * MIDDLE,place.spot.top + frame.tile * place.at);
}
function uiUnder(cells,at,frame) {
const cell = cells[at];
return cell ? uiFloorSpot({ col:cell.col,row:cell.row + 1 },frame) :null;
}

export { FONT_FACE,INSET_TILES,MIDDLE,TEXT,uiPaintLabel,uiPaintRow,uiPaintTile,uiUnder };

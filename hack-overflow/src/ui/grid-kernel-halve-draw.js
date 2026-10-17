import { HALVE,isGrey } from '../game/finale/halve.js';
import { uiSpotOf } from './grid-spot.js';

const FIRST_COL = 21;
const COLS = 11;
const FIRST_ROW = 14;
const PER_ROW = 64;
const UI_HALVE_FILLS = Object.freeze({ dead:'#10171c',live:'#13404b',grey:'#7a5a00',greyLive:'#ffb300',cursor:'#e8f1f5' });
const LIVE_EDGE = '#00e5ff';
const TEXT = '#e8f1f5';
const MARK_TEXT = '#ffb300';
const NUMBER_TOP = 0.04;
const NUMBER_TILES = 0.36;
const BAR_TOP = 0.46;
const BAR_TILES = 0.34;
const MARK_AT = 0.9;
const GREY_AT = 0.63;
const MARK_FONT_TILES = 0.26;
const GREY_FONT_TILES = 0.34;
const SLICE_FILL = 0.78;
const EDGE_TILES = 0.04;
const EDGE_RUN = 4;
const CAP_TILES = 0.05;
const FONT_FACE = 'px VT323, monospace';
const MIDDLE = 0.5;

function uiEntryCell(entry) {
return { col:FIRST_COL + Math.floor((entry % PER_ROW) * COLS / PER_ROW),row:FIRST_ROW + Math.floor(entry / PER_ROW) };
}
function uiEntryOrigin(frame,entry) {
const sliceWidth = COLS * frame.tile / PER_ROW;
return { left:(FIRST_COL - frame.camera.col) * frame.tile + (entry % PER_ROW) * sliceWidth,top:(FIRST_ROW + Math.floor(entry / PER_ROW) - frame.camera.row) * frame.tile,sliceWidth };
}
function uiSliceFill(look) {
if (look.cursor) return UI_HALVE_FILLS.cursor;
if (look.grey) return look.live ? UI_HALVE_FILLS.greyLive :UI_HALVE_FILLS.grey;
return look.live ? UI_HALVE_FILLS.live :UI_HALVE_FILLS.dead;
}
function uiPaintSlice(ctx,frame,place) {
const { origin,look } = place;
ctx.fillStyle = uiSliceFill(look);
const width = Math.max(1,origin.sliceWidth * SLICE_FILL);
ctx.fillRect(origin.left,origin.top + frame.tile * BAR_TOP,width,frame.tile * BAR_TILES);
if (!look.live) return;
ctx.fillStyle = LIVE_EDGE;
ctx.fillRect(origin.left,origin.top + frame.tile * BAR_TOP,width,Math.max(1,Math.round(frame.tile * CAP_TILES)));
}
function uiPaintText(ctx,frame,mark) {
ctx.fillStyle = mark.color;
ctx.font = Math.round(frame.tile * mark.size) + FONT_FACE;
ctx.textAlign = mark.align || 'center';
ctx.textBaseline = 'middle';
ctx.fillText(mark.text,mark.left,mark.top);
}
function uiPaintNumber(ctx,frame,place) {
const { origin,entry } = place;
const column = entry % PER_ROW;
const align = column < EDGE_RUN ? 'left' :(column >= PER_ROW - EDGE_RUN ? 'right' :'center');
const edge = align === 'right' ? origin.sliceWidth : 0;
uiPaintText(ctx,frame,{ text:String(entry),color:TEXT,size:NUMBER_TILES,align,left:origin.left + edge + (align === 'center' ? origin.sliceWidth * MIDDLE :0),top:origin.top + frame.tile * (NUMBER_TOP + NUMBER_TILES * MIDDLE) });
}
function uiPaintMarks(ctx,frame,place) {
const { origin,look,entry } = place;
const center = origin.left + origin.sliceWidth * MIDDLE;
if (look.grey) uiPaintText(ctx,frame,{ text:'?',color:look.live ? TEXT :MARK_TEXT,size:GREY_FONT_TILES,left:center,top:origin.top + frame.tile * GREY_AT });
if (look.skipped) uiPaintText(ctx,frame,{ text:'^',color:MARK_TEXT,size:MARK_FONT_TILES,left:center,top:origin.top + frame.tile * MARK_AT });
if (look.cursor) uiPaintNumber(ctx,frame,{ origin,entry });
}
function uiPaintEntry(ctx,frame,place) {
const spot = uiSpotOf(uiEntryCell(place.entry),frame);
if (!spot) return;
const origin = uiEntryOrigin(frame,place.entry);
uiPaintSlice(ctx,frame,{ origin,look:place.look });
uiPaintMarks(ctx,frame,{ origin,look:place.look,entry:place.entry });
}
function uiEdgeRun(ctx,frame,run) {
const first = uiEntryOrigin(frame,run.first);
const last = uiEntryOrigin(frame,run.last);
if (!uiSpotOf(uiEntryCell(run.first),frame) && !uiSpotOf(uiEntryCell(run.last),frame)) return;
const edge = Math.max(1,Math.round(frame.tile * EDGE_TILES));
ctx.strokeStyle = LIVE_EDGE;
ctx.lineWidth = edge;
ctx.strokeRect(first.left,first.top + frame.tile * BAR_TOP - edge,last.left + last.sliceWidth * SLICE_FILL - first.left,frame.tile * BAR_TILES + 2 * edge);
}
function uiPaintEdges(ctx,frame,halve) {
for (let row = 0; row < HALVE.size / PER_ROW; row += 1) {
const first = Math.max(halve.lo,row * PER_ROW);
const last = Math.min(halve.hi,row * PER_ROW + PER_ROW - 1);
if (first <= last) uiEdgeRun(ctx,frame,{ first,last });
}
}

function uiPaintHalve(ctx,frame,phase,cursor) {
const halve = phase.halve;
if (!halve) return;
for (let entry = 0; entry < HALVE.size; entry += 1) {
const live = entry >= halve.lo && entry <= halve.hi;
uiPaintEntry(ctx,frame,{ entry,look:{ live,grey:isGrey(entry),cursor:entry === cursor,skipped:entry === halve.last } });
}
uiPaintEdges(ctx,frame,halve);
}

export { UI_HALVE_FILLS,uiPaintHalve };

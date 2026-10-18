import { runView } from '../game/power/volley.js';
import { answerFor } from '../game/rooms/shield.js';
import { uiSpotOf } from './grid-spot.js';

const LANE_PLACE = Object.freeze({ col:21,row:17,wide:7 });
const STACK_PLACE = Object.freeze({ col:21,row:18,wide:3 });
const STACK_CAPACITY = 5;
const READ_COLOR = '#3a4a52';
const NOW_COLOR = '#00e5ff';
const LATER_COLOR = '#8a9aa3';
const LABEL_COLOR = '#9fb4bd';
const FAINT_COLOR = 'rgba(159,180,189,0.45)';
const PANEL_FILL = 'rgba(6,12,18,0.92)';
const PANEL_ROWS = 2;
const BLOCK_FILL = '#0d1f2b';
const BLOCK_EDGE = '#3b8ea5';
const TOP_EDGE = '#00e5ff';
const TOP_COLOR = '#e8f1f5';
const BELOW_COLOR = '#9fb4bd';
const INSET_TILES = 0.1;
const EDGE_TILES = 0.06;
const GLYPH_TILES = 0.46;
const LABEL_TILES = 0.3;
const LANE_TOP_TILES = 0.04;
const LANE_HIGH_TILES = 0.62;
const LABEL_TOP_TILES = 0.7;
const LABEL_WIDE_CELLS = 2.5;
const FONT_FACE = 'px VT323, monospace';
const MIDDLE = 0.5;
const CENTER = 'center';

const VOLLEY_PLACE = Object.freeze({ ...LANE_PLACE });

function anchorOf(frame,place) {
for (let step = 0; step < place.wide; step += 1) {
const spot = uiSpotOf({ col:place.col + step,row:place.row },frame);
if (spot) return { left:spot.left - step * frame.tile,top:spot.top };
}
return null;
}
function inside(frame,box) {
return box.left >= 0 && box.top >= 0 && box.left + box.width <= frame.width && box.top + box.height <= frame.height;
}
function setFont(ctx,frame,tiles) {
ctx.font = Math.round(frame.tile * tiles) + FONT_FACE;
ctx.textAlign = CENTER;
ctx.textBaseline = 'middle';
}
function paintText(ctx,frame,box) {
if (!inside(frame,box)) return;
ctx.fillStyle = box.color;
ctx.fillText(box.text,box.left + box.width * MIDDLE,box.top + box.height * MIDDLE,box.width);
}
function colorOf(index,at) {
if (index < at) return READ_COLOR;
return index === at ? NOW_COLOR :LATER_COLOR;
}
function glyphBox(frame,anchor,slot) {
const { index,count } = slot;
const wide = LANE_PLACE.wide * frame.tile / count;
return { left:anchor.left + index * wide,top:anchor.top + frame.tile * LANE_TOP_TILES,width:wide,height:frame.tile * LANE_HIGH_TILES };
}
function paintNowBox(ctx,frame,box) {
if (!inside(frame,box)) return;
const edge = Math.max(1,Math.round(frame.tile * EDGE_TILES));
ctx.strokeStyle = NOW_COLOR;
ctx.lineWidth = edge;
ctx.strokeRect(box.left + edge / 2,box.top + edge / 2,box.width - edge,box.height - edge);
}
function paintVerb(ctx,frame,place) {
const { run,view,anchor } = place;
const verb = run.state.status === 'running' ? answerFor(run.state).toUpperCase() :'';
if (!verb) return;
const count = view.lane.length;
const cell = glyphBox(frame,anchor,{ index:Math.min(view.at,count - 1),count });
const wide = cell.width * LABEL_WIDE_CELLS;
const box = { left:cell.left + (cell.width - wide) * MIDDLE,top:cell.top + frame.tile * LABEL_TOP_TILES,width:wide,height:frame.tile * LABEL_TILES };
setFont(ctx,frame,LABEL_TILES);
paintText(ctx,frame,{ ...box,text:verb,color:LABEL_COLOR });
}
function paintPanel(ctx,frame) {
const anchor = anchorOf(frame,LANE_PLACE);
if (!anchor) return;
const box = { left:anchor.left,top:anchor.top,width:LANE_PLACE.wide * frame.tile,height:PANEL_ROWS * frame.tile };
if (!inside(frame,box)) return;
ctx.fillStyle = PANEL_FILL;
ctx.fillRect(box.left,box.top,box.width,box.height);
}
function paintLane(ctx,frame,run) {
const view = runView(run);
const anchor = anchorOf(frame,LANE_PLACE);
if (!anchor || !view.lane) return;
setFont(ctx,frame,GLYPH_TILES);
[...view.lane].forEach((glyph,index) => {
const box = glyphBox(frame,anchor,{ index,count:view.lane.length });
paintText(ctx,frame,{ ...box,text:glyph,color:colorOf(index,view.at) });
if (index === view.at) paintNowBox(ctx,frame,box);
});
paintVerb(ctx,frame,{ run,view,anchor });
}
function paintBlock(ctx,frame,block) {
const { box,bracket,top } = block;
if (!inside(frame,box)) return;
const edge = Math.max(1,Math.round(frame.tile * EDGE_TILES));
ctx.fillStyle = top ? TOP_EDGE :BLOCK_EDGE;
ctx.fillRect(box.left,box.top,box.width,box.height);
ctx.fillStyle = BLOCK_FILL;
ctx.fillRect(box.left + edge,box.top + edge,box.width - 2 * edge,box.height - 2 * edge);
paintText(ctx,frame,{ ...box,text:bracket,color:top ? TOP_COLOR :BELOW_COLOR });
}
function blockBox(frame,anchor,slot) {
const { index,size } = slot;
const inset = frame.tile * INSET_TILES;
const wide = STACK_PLACE.wide * frame.tile / size;
return { left:anchor.left + index * wide + inset,top:anchor.top + inset,width:wide - 2 * inset,height:frame.tile - 2 * inset };
}
function paintEmpty(ctx,frame,anchor) {
setFont(ctx,frame,LABEL_TILES);
paintText(ctx,frame,{ left:anchor.left,top:anchor.top,width:STACK_PLACE.wide * frame.tile,height:frame.tile,text:'STACK',color:FAINT_COLOR });
}
function paintStack(ctx,frame,run) {
const frames = [...runView(run).stack];
const anchor = anchorOf(frame,STACK_PLACE);
if (!anchor) return;
if (frames.length === 0) return paintEmpty(ctx,frame,anchor);
const size = Math.max(STACK_CAPACITY,frames.length);
setFont(ctx,frame,GLYPH_TILES);
frames.forEach((bracket,index) => {
paintBlock(ctx,frame,{ box:blockBox(frame,anchor,{ index,size }),bracket,top:index === frames.length - 1 });
});
}

function uiPaintVolley(ctx,frame,phase) {
if (!phase.volley) return;
paintPanel(ctx,frame);
paintLane(ctx,frame,phase.volley);
paintStack(ctx,frame,phase.volley);
}

export { VOLLEY_PLACE,uiPaintVolley };

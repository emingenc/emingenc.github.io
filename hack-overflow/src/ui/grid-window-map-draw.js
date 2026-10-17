import { LETTER_CELLS } from '../game/fusion/window-map-cells.js';
import { WINDOW_MAP } from '../game/fusion/window-map.js';
import { uiSpotOf } from './grid-spot.js';

const EDGES = Object.freeze({ window:'#00e5ff',best:'#7dff7a',idle:'#3a4a55' });
const FILLS = Object.freeze({ window:'#0d1f2b',best:'#10261a',idle:'#10171c' });
const TEXT = '#e8f1f5';
const INSET_TILES = 0.1;
const EDGE_TILES = 0.08;
const FONT_TILES = 0.42;
const MARK_TILES = 0.26;
const FONT_FACE = 'px VT323, monospace';
const MIDDLE = 0.5;
const MARK_AT = 0.2;

function uiInSpan(span,at) {
return Boolean(span) && at >= span.from && at < span.to;
}
function uiRoleOf(run,at) {
const window = { from:run.tail,to:run.head };
const open = at === window.from ? '[' :'';
const close = at === window.to - 1 ? ']' :'';
if (uiInSpan(window,at)) return { role:'window',mark:open + close };
return { role:uiInSpan(run.best,at) ? 'best' :'idle',mark:'' };
}
function uiPaintLetter(ctx,frame,place) {
const { spot,letter,look } = place;
const inset = frame.tile * INSET_TILES;
const size = frame.tile - 2 * inset;
const edge = Math.max(1,Math.round(frame.tile * EDGE_TILES));
ctx.fillStyle = EDGES[look.role];
ctx.fillRect(spot.left + inset,spot.top + inset,size,size);
ctx.fillStyle = FILLS[look.role];
ctx.fillRect(spot.left + inset + edge,spot.top + inset + edge,size - 2 * edge,size - 2 * edge);
ctx.fillStyle = TEXT;
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';
ctx.font = Math.round(frame.tile * FONT_TILES) + FONT_FACE;
ctx.fillText(letter,spot.left + frame.tile * MIDDLE,spot.top + frame.tile * MIDDLE);
if (!look.mark) return;
ctx.font = Math.round(frame.tile * MARK_TILES) + FONT_FACE;
ctx.fillText(look.mark,spot.left + frame.tile * MIDDLE,spot.top + frame.tile * MARK_AT);
}

function uiPaintWindowMap(ctx,frame,run) {
[...WINDOW_MAP.text].forEach(function (letter,at) {
const spot = uiSpotOf(LETTER_CELLS[at],frame);
if (spot) uiPaintLetter(ctx,frame,{ spot,letter,look:uiRoleOf(run,at) });
});
}

export { uiPaintWindowMap };

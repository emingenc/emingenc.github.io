import { VALUE_CELLS } from '../game/fusion/mono-deque-cells.js';
import { MONO_DEQUE } from '../game/fusion/mono-deque.js';
import { uiSpotOf } from './grid-spot.js';

const EDGES = Object.freeze({ next:'#00e5ff',kept:'#ffb300',idle:'#3a4a55',spent:'#222b31' });
const FILLS = Object.freeze({ next:'#0d1f2b',kept:'#2b210d',idle:'#10171c',spent:'#0b0f12' });
const TEXT = '#e8f1f5';
const INSET_TILES = 0.1;
const EDGE_TILES = 0.08;
const FONT_TILES = 0.42;
const MARK_TILES = 0.26;
const FONT_FACE = 'px VT323, monospace';
const MIDDLE = 0.5;
const MARK_AT = 0.2;

function uiRoleOf(run,at) {
const held = run.deque.indexOf(at);
if (held >= 0) return { role:'kept',mark:held === 0 ? 'F' :held === run.deque.length - 1 ? 'B' :'' };
if (at === run.t && !run.pushed && run.status === 'running') return { role:'next',mark:'x' };
return { role:at > run.t ? 'idle' :'spent',mark:'' };
}
function uiPaintValue(ctx,frame,place) {
const { spot,value,look } = place;
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
ctx.fillText(String(value),spot.left + frame.tile * MIDDLE,spot.top + frame.tile * MIDDLE);
if (!look.mark) return;
ctx.font = Math.round(frame.tile * MARK_TILES) + FONT_FACE;
ctx.fillText(look.mark,spot.left + frame.tile * MIDDLE,spot.top + frame.tile * MARK_AT);
}

function uiPaintMonoDeque(ctx,frame,run) {
MONO_DEQUE.nums.forEach(function (value,at) {
const spot = uiSpotOf(VALUE_CELLS[at],frame);
if (spot) uiPaintValue(ctx,frame,{ spot,value,look:uiRoleOf(run,at) });
});
}

export { uiPaintMonoDeque };

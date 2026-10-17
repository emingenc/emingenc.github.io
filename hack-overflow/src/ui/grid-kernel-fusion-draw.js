import { dequeValues } from '../game/fusion/mono-deque.js';
import { VALUE_CELLS as LOOP_CELLS } from '../game/fusion/loop-pinch-cells.js';
import { VALUE_CELLS as DEQUE_CELLS } from '../game/fusion/mono-deque-cells.js';
import { uiPaintLoopPinch } from './grid-loop-pinch-draw.js';
import { uiPaintMonoDeque } from './grid-mono-deque-draw.js';
import { uiSpotOf } from './grid-spot.js';

const LOOP_PHASE = 4;
const DEQUE_PHASE = 5;
const TEXT = '#9fb4bd';
const LABEL_TILES = 0.3;
const FONT_FACE = 'px VT323, monospace';
const SEPARATOR = ' . ';

function triplesLabel(run) {
return 'FOUND ' + run.found.length + (run.found.length === 1 ? ' triple' :' triples');
}
function windowOf(run,puzzle) {
const last = Math.min(run.t,puzzle.nums.length - 1);
return puzzle.nums.slice(Math.max(0,last - puzzle.k + 1),last + 1);
}
function dequeLabel(run,puzzle) {
const held = dequeValues(run,puzzle);
return 'DEQUE ' + (held.length > 0 ? held.join(' ') :'empty') + SEPARATOR + 'WINDOW ' + puzzle.k + ': ' + windowOf(run,puzzle).join(' ');
}
function paintLabel(ctx,frame,place) {
const { cells,text } = place;
const spot = cells.map((cell) => uiSpotOf(cell,frame)).find(Boolean);
if (!spot) return;
ctx.fillStyle = TEXT;
ctx.textAlign = 'left';
ctx.textBaseline = 'bottom';
ctx.font = Math.round(frame.tile * LABEL_TILES) + FONT_FACE;
ctx.fillText(text,Math.max(0,spot.left),spot.top,Math.max(1,frame.width - Math.max(0,spot.left)));
}

function uiPaintFusion(ctx,frame,fusionPhase) {
const { n,run,puzzle } = fusionPhase;
if (n === LOOP_PHASE) {
uiPaintLoopPinch(ctx,frame,run,puzzle);
paintLabel(ctx,frame,{ cells:LOOP_CELLS,text:triplesLabel(run) });
} else if (n === DEQUE_PHASE) {
uiPaintMonoDeque(ctx,frame,run,puzzle);
paintLabel(ctx,frame,{ cells:DEQUE_CELLS,text:dequeLabel(run,puzzle) });
}
}

export { uiPaintFusion };

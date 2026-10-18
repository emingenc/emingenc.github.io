import { LETTER_CELLS } from '../game/fusion/window-map-cells.js';
import { WINDOW_MAP } from '../game/fusion/window-map.js';
import { uiPaintTag } from './grid-fusion-floor.js';
import { INSET_TILES,uiPaintLabel,uiPaintRow,uiUnder } from './grid-fusion-tiles.js';

const LOOKS = Object.freeze({
window:Object.freeze({ edge:'#00e5ff',fill:'#0d1f2b' }),best:Object.freeze({ edge:'#7dff7a',fill:'#10261a' }),idle:Object.freeze({ edge:'#3a4a55',fill:'#10171c' }),
});
const TAG_COLOR = '#00e5ff';
const BEST_COLOR = '#7dff7a';
const BEST_FONT_TILES = 0.22;
const BEST_TEXT_AT = 0.8;
const BEST_LINE_AT = 0.93;
const BEST_LINE_TILES = 0.05;

function uiInSpan(span,at) {
return Boolean(span) && at >= span.from && at < span.to;
}
function uiLookOf(run,at) {
const window = { from:run.tail,to:run.head };
const open = at === window.from ? '[' :'';
const close = at === window.to - 1 ? ']' :'';
if (uiInSpan(window,at)) return { ...LOOKS.window,mark:open + close };
return { ...LOOKS[uiInSpan(run.best,at) ? 'best' :'idle'],mark:'' };
}
function uiEndsOf(run) {
if (run.head <= run.tail) return [{ at:run.tail,text:'TAIL' }];
if (run.head - run.tail === 1) return [{ at:run.tail,text:'T/H' }];
return [{ at:run.tail,text:'TAIL' },{ at:run.head - 1,text:'HEAD' }];
}
function uiPaintBestLine(ctx,frame,best) {
const thick = Math.max(1,Math.round(frame.tile * BEST_LINE_TILES));
const inset = frame.tile * INSET_TILES;
ctx.fillStyle = BEST_COLOR;
for (let at = best.from;at < best.to;at += 1) {
const spot = uiUnder(LETTER_CELLS,at,frame);
if (spot) ctx.fillRect(spot.left + (at === best.from ? inset :0),spot.top + frame.tile * BEST_LINE_AT,frame.tile - (at === best.from ? inset :0) - (at === best.to - 1 ? inset :0),thick);
}
}
function uiPaintBestText(ctx,frame,best) {
const middle = Math.floor((best.from + best.to - 1) / 2);
const spot = uiUnder(LETTER_CELLS,middle,frame);
if (!spot) return;
uiPaintLabel(ctx,frame,{ spot,text:'BEST',color:BEST_COLOR,size:BEST_FONT_TILES,at:BEST_TEXT_AT });
}
function uiPaintUnder(ctx,frame,run) {
uiEndsOf(run).forEach(function (end) {
const spot = uiUnder(LETTER_CELLS,end.at,frame);
if (spot) uiPaintTag(ctx,frame,{ spot,text:end.text,color:TAG_COLOR,bob:true });
});
if (!run.best) return;
uiPaintBestLine(ctx,frame,run.best);
uiPaintBestText(ctx,frame,run.best);
}

function uiPaintWindowMap(ctx,frame,run) {
uiPaintRow(ctx,frame,{ values:[...WINDOW_MAP.text],cells:LETTER_CELLS,lookOf:(at) => uiLookOf(run,at) });
if (frame.floor === true) uiPaintUnder(ctx,frame,run);
}

export { uiPaintWindowMap };

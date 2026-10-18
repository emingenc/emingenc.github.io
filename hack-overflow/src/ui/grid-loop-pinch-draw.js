import { VALUE_CELLS } from '../game/fusion/loop-pinch-cells.js';
import { LOOP_PINCH } from '../game/fusion/loop-pinch.js';
import { uiPaintTag } from './grid-fusion-floor.js';
import { uiPaintLabel,uiPaintRow,uiUnder } from './grid-fusion-tiles.js';

const LOOKS = Object.freeze({
i:Object.freeze({ edge:'#00e5ff',fill:'#0d1f2b' }),pincer:Object.freeze({ edge:'#ffb300',fill:'#2b210d' }),idle:Object.freeze({ edge:'#3a4a55',fill:'#10171c' }),
});
const TAG_COLORS = Object.freeze({ i:'#00e5ff',pincer:'#ffb300' });
const MET_TEXT = '#9fb4bd';
const MET_FONT_TILES = 0.22;
const MET_AT = 0.8;
const SHARED_SHIFT = 0.24;
const SHARED_TILES = 0.44;

function uiLookOf(run,at) {
if (at === run.i) return { ...LOOKS.i,mark:'i' };
if (run.l < run.r && at === run.l) return { ...LOOKS.pincer,mark:'L' };
return run.l < run.r && at === run.r ? { ...LOOKS.pincer,mark:'R' } :{ ...LOOKS.idle,mark:'' };
}
function uiTagsOf(run) {
const met = run.l >= run.r;
const shared = run.l === run.r;
return [
{ at:run.i,text:'i',color:TAG_COLORS.i,bob:true },
{ at:run.l,text:'L',color:TAG_COLORS.pincer,dim:met,bob:!met,...(shared ? { shift:-SHARED_SHIFT,width:SHARED_TILES } :{}) },
{ at:run.r,text:'R',color:TAG_COLORS.pincer,dim:met,bob:!met,...(shared ? { shift:SHARED_SHIFT,width:SHARED_TILES } :{}) },
];
}
function uiPaintMet(ctx,frame,run) {
const spot = uiUnder(VALUE_CELLS,run.l,frame);
if (!spot) return;
uiPaintLabel(ctx,frame,{ spot,text:'MET',color:MET_TEXT,size:MET_FONT_TILES,at:MET_AT });
}
function uiPaintTags(ctx,frame,run) {
if (run.status !== 'running') return;
uiTagsOf(run).forEach(function (tag) {
const spot = uiUnder(VALUE_CELLS,tag.at,frame);
if (spot) uiPaintTag(ctx,frame,{ ...tag,spot });
});
if (run.l >= run.r) uiPaintMet(ctx,frame,run);
}

function uiPaintLoopPinch(ctx,frame,...args) {
const [run,puzzle = LOOP_PINCH] = args;
uiPaintRow(ctx,frame,{ values:puzzle.nums,cells:VALUE_CELLS,lookOf:(at) => uiLookOf(run,at) });
if (frame.floor === true) uiPaintTags(ctx,frame,run);
}

export { uiPaintLoopPinch };

import { BLOCK_CELLS,TRIM_CELLS } from '../game/finale/reward-cells.js';
import { drawerReady } from '../game/finale/refactor.js';
import { uiSpotOf } from './grid-spot.js';

const EDGES = Object.freeze({ live:'#00e5ff',ref:'#35d07f',swept:'#b41e3c' });
const FILLS = Object.freeze({ live:'#0d1f2b',ref:'#0f3a26',swept:'#2b0d14' });
const TEXT = '#e8f1f5';
const TRIM = '#00e5ff';
const INSET_TILES = 0.1;
const EDGE_TILES = 0.08;
const FONT_TILES = 0.42;
const FONT_FACE = 'px VT323, monospace';
const MIDDLE = 0.5;
const TRIM_TILES = 0.06;

function uiPaintBlock(ctx,frame,place) {
const { spot,block } = place;
const inset = frame.tile * INSET_TILES;
const size = frame.tile - 2 * inset;
const edge = Math.max(1,Math.round(frame.tile * EDGE_TILES));
ctx.fillStyle = EDGES[block.state];
ctx.fillRect(spot.left + inset,spot.top + inset,size,size);
ctx.fillStyle = FILLS[block.state];
ctx.fillRect(spot.left + inset + edge,spot.top + inset + edge,size - 2 * edge,size - 2 * edge);
ctx.fillStyle = TEXT;
ctx.font = Math.round(frame.tile * FONT_TILES) + FONT_FACE;
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';
ctx.fillText(String(block.n),spot.left + frame.tile * MIDDLE,spot.top + frame.tile * MIDDLE);
}
function uiPaintBlocks(ctx,frame,reward) {
reward.blocks.forEach(function (block,at) {
const spot = uiSpotOf(BLOCK_CELLS[at],frame);
if (spot) uiPaintBlock(ctx,frame,{ spot,block });
});
}
function uiPaintTrim(ctx,frame) {
const edge = Math.max(2,Math.round(frame.tile * TRIM_TILES));
ctx.strokeStyle = TRIM;
ctx.lineWidth = edge;
TRIM_CELLS.map((cell) => uiSpotOf(cell,frame)).filter(Boolean).forEach(function (spot) {
ctx.strokeRect(spot.left + edge / 2,spot.top + edge / 2,frame.tile - edge,frame.tile - edge);
});
}

function uiPaintReward(ctx,app,frame) {
const game = app.game;
const state = game.reward && game.reward.gen === game.gen ? game.reward : null;
if (!state) return;
if (state.run) uiPaintBlocks(ctx,frame,state.run);
if (!state.run && drawerReady(game.progress.won,game.ext,game.save)) uiPaintTrim(ctx,frame);
}

export { uiPaintReward };

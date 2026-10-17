import { uiChainCellsOf,uiChainOwed } from './grid-chain.js';
import { uiCosmeticWatch } from './cosmetic-pay.js';
import { uiPaintBit,uiPaintRows } from './grid-chain-bit.js';

const MARK = ['.ccc.','c...c','....c','...c.','..c..','.....','..c..'];
const MARK_ART = { rows:MARK,ink:{ c:'amber' } };
const MARK_SHADOW = { rows:MARK,ink:{ c:'bg' } };
const MARK_TILES = 0.4;
const MARK_LEFT_TILES = 0.58;
const MARK_TOP_TILES = 0.04;

function uiPaintMark(ctx,frame,cell) {
const pixel = Math.max(1,Math.round((frame.tile * MARK_TILES) / MARK[0].length));
const left = (cell.col - frame.camera.col) * frame.tile + frame.tile * MARK_LEFT_TILES;
const top = (cell.row - frame.camera.row) * frame.tile + frame.tile * MARK_TOP_TILES;
if (left + pixel * MARK[0].length < 0 || top + pixel * MARK.length < 0 || left > frame.width || top > frame.height) return;
uiPaintRows(ctx,MARK_SHADOW,{ palette:frame.palette,pixel,left:left + pixel,top:top + pixel });
uiPaintRows(ctx,MARK_ART,{ palette:frame.palette,pixel,left,top });
}
function uiPaintChain(ctx,app,frame) {
uiChainOwed(app.game).forEach((step) => uiChainCellsOf(step).forEach((cell) => uiPaintMark(ctx,frame,cell)));
uiCosmeticWatch(app);
uiPaintBit(ctx,app,frame);
}

export { uiPaintChain };

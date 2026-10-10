import { mitesView } from '../game/mites.js';
import { pulseAt } from '../game/wayfinding.js';

const SPIDER_ART = ['.x.x.x.','x.xxx.x','..xex..','x.xxx.x','.x...x.'];
const ARROW_ART = ['..x..','...x.','xxxxx','...x.','..x..'];
const ART_TILES = 0.8;
const CHEVRON_TILES = 0.4;
const BOB_TILES = 0.04;
const BOB_MS = 260;
const LANE_ALPHA = 0.14;
const DANGER_ALPHA_LOW = 0.2;
const DANGER_ALPHA_SWING = 0.25;
const PIP_TILES = 0.14;
const PIP_GAP_TILES = 0.06;
const PIP_TOP_TILES = 0.04;
const HALF = 0.5;

function uiSpotOf(cell,frame) {
return { left:(cell.col - frame.camera.col) * frame.tile,top:(cell.row - frame.camera.row) * frame.tile };
}
function uiInView(spot,frame) {
return spot.left + frame.tile > 0 && spot.top + frame.tile > 0 && spot.left < frame.width && spot.top < frame.height;
}
function uiFillCell(ctx,frame,spot) {
ctx.fillRect(spot.left,spot.top,frame.tile,frame.tile);
}
function uiDrawLane(ctx,frame,mite) {
ctx.globalAlpha = LANE_ALPHA;
ctx.fillStyle = frame.palette.dim;
mite.lane.forEach(function (cell) {
const spot = uiSpotOf(cell,frame);
if (uiInView(spot,frame)) uiFillCell(ctx,frame,spot);
});
ctx.globalAlpha = 1;
}
function uiMoves(mite) {
return mite.next.col !== mite.col || mite.next.row !== mite.row;
}
function uiRotated(glyph,turn) {
const last = ARROW_ART.length - 1;
if (turn.col !== 0) return { col:turn.col > 0 ? glyph.col :last - glyph.col,row:glyph.row };
return { col:glyph.row,row:turn.row > 0 ? glyph.col :last - glyph.col };
}
function uiDrawChevron(ctx,frame,mite) {
const spot = uiSpotOf(mite.next,frame);
if (!uiMoves(mite) || !uiInView(spot,frame)) return;
const pulse = pulseAt(frame.now,frame.reducedMotion);
ctx.fillStyle = frame.palette.red;
ctx.globalAlpha = DANGER_ALPHA_LOW + DANGER_ALPHA_SWING * pulse;
uiFillCell(ctx,frame,spot);
ctx.globalAlpha = 1;
const pixel = (frame.tile * CHEVRON_TILES) / ARROW_ART.length;
const inset = (frame.tile - pixel * ARROW_ART.length) * HALF;
const turn = { col:mite.next.col - mite.col,row:mite.next.row - mite.row };
ARROW_ART.forEach(function (line,row) {
[...line].forEach(function (glyph,col) {
if (glyph === '.') return;
const at = uiRotated({ col,row },turn);
ctx.fillRect(spot.left + inset + at.col * pixel,spot.top + inset + at.row * pixel,pixel,pixel);
});
});
}
function uiBobOf(frame) {
return frame.reducedMotion ? 0 :Math.sin(frame.now / BOB_MS) * BOB_TILES * frame.tile;
}
function uiDrawSpider(ctx,frame,mite) {
const spot = uiSpotOf(mite,frame);
const pixel = (frame.tile * ART_TILES) / SPIDER_ART[0].length;
const left = spot.left + (frame.tile - pixel * SPIDER_ART[0].length) * HALF;
const top = spot.top + uiBobOf(frame) + (frame.tile - pixel * SPIDER_ART.length) * HALF;
const colour = mite.maxHp > 1 ? frame.palette.cyan :frame.palette.amber;
SPIDER_ART.forEach(function (line,row) {
[...line].forEach(function (glyph,col) {
if (glyph === '.') return;
ctx.fillStyle = glyph === 'e' ? frame.palette.bg :colour;
ctx.fillRect(left + col * pixel,top + row * pixel,pixel,pixel);
});
});
}
function uiDrawPips(ctx,frame,mite) {
if (mite.maxHp < 2) return;
const spot = uiSpotOf(mite,frame);
const size = frame.tile * PIP_TILES;
const step = size + frame.tile * PIP_GAP_TILES;
const left = spot.left + (frame.tile - step * mite.hp + frame.tile * PIP_GAP_TILES) * HALF;
ctx.fillStyle = frame.palette.text;
for (let pip = 0;pip < mite.hp;pip++) ctx.fillRect(left + pip * step,spot.top + frame.tile * PIP_TOP_TILES,size,size);
}
function uiDrawMite(ctx,frame,mite) {
uiDrawLane(ctx,frame,mite);
uiDrawChevron(ctx,frame,mite);
if (!uiInView(uiSpotOf(mite,frame),frame)) return;
uiDrawSpider(ctx,frame,mite);
uiDrawPips(ctx,frame,mite);
}
function uiDrawMites(ctx,app,frame) {
const mites = app.game.fight?.mites;
if (!mites) return;
mitesView(mites).filter((mite) => mite.hp > 0).forEach(function (mite) { uiDrawMite(ctx,frame,mite); });
}

export { uiDrawMites };

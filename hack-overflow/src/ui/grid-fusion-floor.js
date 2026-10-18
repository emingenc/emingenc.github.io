import { uiSpotOf } from './grid-spot.js';

const FLOOR_FIRST_COL = 17;
const FLOOR_LAST_COL = 31;
const PAD_GLOW = Object.freeze({ edge:'#00e5ff',fill:'#0d1f2b',low:0.45,high:1,period:300 });
const CHECK = '#35d07f';
const BUS = '#2c4a57';
const DOT = '#00e5ff';
const NAME = '#9fb4bd';
const GLYPH = '#e8f1f5';
const TAG_INK = '#071014';
const FONT_FACE = 'px VT323, monospace';
const MIDDLE = 0.5;
const PAD_INSET_TILES = 0.06;
const PAD_EDGE_TILES = 0.1;
const GLYPH_TILES = 0.55;
const NAME_TILES = 0.3;
const NAME_PAIR_AT = [0.42,0.8];
const NAME_ONE_AT = 0.72;
const NAME_WIDE_TILES = 1.9;
const NAME_SHORT = 8;
const CHECK_SHORT = [[0.3,0.52],[0.36,0.6],[0.43,0.68]];
const CHECK_LONG = [[0.5,0.6],[0.57,0.52],[0.64,0.44],[0.71,0.36]];
const CHECK_DOT_TILES = 0.1;
const BUS_TILES = 0.06;
const DOT_TILES = 0.22;
const DOT_MS = 1600;
const TAG_POINT_TOP = 0.04;
const TAG_POINT_TILES = 0.18;
const TAG_POINT_WIDE = 0.3;
const TAG_STEPS = 4;
const TAG_BODY_TOP = 0.22;
const TAG_BODY_TILES = 0.44;
const TAG_FONT_TILES = 0.32;
const TAG_PAD_TILES = 0.16;
const TAG_MIN_TILES = 0.5;
const TAG_MAX_TILES = 0.94;
const TAG_DIM_ALPHA = 0.4;
const TAG_BOB_MS = 220;
const TAG_BOB_TILES = 0.03;
const CROSS_STEPS = 5;
const CROSS_DOT = 0.18;

function uiFloorSpot(cell,frame) {
return cell.col >= FLOOR_FIRST_COL && cell.col <= FLOOR_LAST_COL ? uiSpotOf(cell,frame) :null;
}
function tagWidth(ctx,frame,text) {
ctx.font = Math.round(frame.tile * TAG_FONT_TILES) + FONT_FACE;
const wanted = ctx.measureText(text).width + frame.tile * TAG_PAD_TILES;
return Math.min(frame.tile * TAG_MAX_TILES,Math.max(frame.tile * TAG_MIN_TILES,wanted));
}
function tagPointer(ctx,frame,place) {
const { spot,centre,color } = place;
const bob = frame.reducedMotion || !place.bob ? 0 :Math.sin(frame.now / TAG_BOB_MS) * TAG_BOB_TILES * frame.tile;
const high = frame.tile * TAG_POINT_TILES / TAG_STEPS;
ctx.fillStyle = color;
for (let step = 0;step < TAG_STEPS;step += 1) {
const wide = frame.tile * TAG_POINT_WIDE * (step + 1) / TAG_STEPS;
ctx.fillRect(centre - wide / 2,spot.top + frame.tile * TAG_POINT_TOP + bob + step * high,wide,high);
}
}
function uiPaintTag(ctx,frame,place) {
const { spot,text,color } = place;
const wide = place.width ? frame.tile * place.width :tagWidth(ctx,frame,text);
const centre = spot.left + frame.tile * (MIDDLE + (place.shift || 0));
const before = ctx.globalAlpha;
if (place.dim) ctx.globalAlpha = before * TAG_DIM_ALPHA;
tagPointer(ctx,frame,{ spot,centre,color,bob:place.bob });
ctx.fillStyle = color;
ctx.fillRect(centre - wide / 2,spot.top + frame.tile * TAG_BODY_TOP,wide,frame.tile * TAG_BODY_TILES);
ctx.fillStyle = TAG_INK;
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';
ctx.font = Math.round(frame.tile * TAG_FONT_TILES) + FONT_FACE;
ctx.fillText(text,centre,spot.top + frame.tile * (TAG_BODY_TOP + TAG_BODY_TILES / 2));
ctx.globalAlpha = before;
}
function uiPaintCross(ctx,place) {
const { left,top,size,color } = place;
const dot = Math.max(1,Math.round(size * CROSS_DOT));
ctx.fillStyle = color;
for (let step = 0;step < CROSS_STEPS;step += 1) {
const share = step / (CROSS_STEPS - 1);
ctx.fillRect(left + (size - dot) * share,top + (size - dot) * share,dot,dot);
ctx.fillRect(left + (size - dot) * share,top + (size - dot) * (1 - share),dot,dot);
}
}

function glowAlpha(frame) {
if (frame.reducedMotion) return PAD_GLOW.high;
return PAD_GLOW.low + (PAD_GLOW.high - PAD_GLOW.low) * (Math.sin(frame.now / PAD_GLOW.period) + 1) / 2;
}
function paintCheck(ctx,frame,spot) {
const dot = Math.max(2,Math.round(frame.tile * CHECK_DOT_TILES));
ctx.fillStyle = CHECK;
[...CHECK_SHORT,...CHECK_LONG].forEach(function (point) {
ctx.fillRect(spot.left + frame.tile * point[0] - dot / 2,spot.top + frame.tile * point[1] - dot / 2,dot,dot);
});
}
function paintGlyph(ctx,frame,place) {
const { spot,status } = place;
if (status === 'cleared') {
paintCheck(ctx,frame,spot);
return;
}
ctx.fillStyle = GLYPH;
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';
ctx.font = Math.round(frame.tile * GLYPH_TILES) + FONT_FACE;
ctx.fillText('>',spot.left + frame.tile * MIDDLE,spot.top + frame.tile * MIDDLE);
}
function nameLines(name) {
if (name.length <= NAME_SHORT) return [name];
const middle = name.length / 2;
const breaks = [...name].map((char,at) => (char === ' ' || char === '-' ? at :-1)).filter((at) => at >= 0);
const best = breaks.sort((one,two) => Math.abs(one - middle) - Math.abs(two - middle))[0];
if (best === undefined) return [name.slice(0,Math.ceil(middle)),name.slice(Math.ceil(middle))];
return [name.slice(0,name[best] === '-' ? best + 1 :best),name.slice(best + 1)];
}
function paintName(ctx,frame,plate) {
const spot = uiFloorSpot({ col:plate.pad.col,row:plate.pad.row - 1 },frame);
if (!spot) return;
const lines = nameLines(plate.name);
ctx.fillStyle = NAME;
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';
ctx.font = Math.round(frame.tile * NAME_TILES) + FONT_FACE;
lines.forEach(function (line,at) {
const share = lines.length === 1 ? NAME_ONE_AT :NAME_PAIR_AT[at];
ctx.fillText(line,spot.left + frame.tile * MIDDLE,spot.top + frame.tile * share,frame.tile * NAME_WIDE_TILES);
});
}
function paintPad(ctx,frame,plate) {
const spot = uiFloorSpot(plate.pad,frame);
if (!spot) return;
const inset = frame.tile * PAD_INSET_TILES;
const size = frame.tile - 2 * inset;
const edge = Math.max(2,Math.round(frame.tile * PAD_EDGE_TILES));
const before = ctx.globalAlpha;
ctx.globalAlpha = before * glowAlpha(frame);
ctx.fillStyle = PAD_GLOW.edge;
ctx.fillRect(spot.left + inset,spot.top + inset,size,size);
ctx.globalAlpha = before;
ctx.fillStyle = PAD_GLOW.fill;
ctx.fillRect(spot.left + inset + edge,spot.top + inset + edge,size - 2 * edge,size - 2 * edge);
paintGlyph(ctx,frame,{ spot,status:plate.status });
paintName(ctx,frame,plate);
}

function busCells(from,to) {
const cells = [];
const across = Math.sign(to.col - from.col);
for (let col = from.col;col !== to.col;col += across) cells.push({ col,row:from.row });
const down = Math.sign(to.row - from.row);
for (let row = from.row;row !== to.row;row += down) cells.push({ col:to.col,row });
cells.push({ col:to.col,row:to.row });
return cells;
}
function paintBusPiece(ctx,frame,pair) {
const [one,two] = pair.map((cell) => ({ cell,spot:uiFloorSpot(cell,frame) }));
if (!one.spot || !two.spot) return;
const thick = Math.max(1,Math.round(frame.tile * BUS_TILES));
const left = Math.min(one.spot.left,two.spot.left) + frame.tile * MIDDLE - thick / 2;
const top = Math.min(one.spot.top,two.spot.top) + frame.tile * MIDDLE - thick / 2;
ctx.fillRect(left,top,Math.abs(one.spot.left - two.spot.left) + thick,Math.abs(one.spot.top - two.spot.top) + thick);
}
function paintDot(ctx,frame,cells) {
const along = (frame.now / DOT_MS % 1) * (cells.length - 1);
const at = Math.floor(along);
const [one,two] = [cells[at],cells[Math.min(at + 1,cells.length - 1)]];
const atCol = one.col + MIDDLE + (two.col - one.col) * (along - at);
const atRow = one.row + MIDDLE + (two.row - one.row) * (along - at);
if (!uiFloorSpot({ col:Math.floor(atCol),row:Math.floor(atRow) },frame)) return;
const size = frame.tile * DOT_TILES;
ctx.fillStyle = DOT;
ctx.fillRect((atCol - frame.camera.col) * frame.tile - size / 2,(atRow - frame.camera.row) * frame.tile - size / 2,size,size);
}
function paintBus(ctx,frame,plate) {
const cells = busCells(plate.pad,plate.rowStart);
ctx.fillStyle = BUS;
cells.slice(1).forEach((cell,at) => paintBusPiece(ctx,frame,[cells[at],cell]));
if (!frame.reducedMotion && cells.length > 1) paintDot(ctx,frame,cells);
}

function uiPaintFusionFloor(ctx,frame,plates) {
plates.filter((plate) => plate.status === 'playing').forEach((plate) => paintBus(ctx,frame,plate));
plates.filter((plate) => plate.status === 'new' || plate.status === 'cleared').forEach((plate) => paintPad(ctx,frame,plate));
}

export { PAD_GLOW,uiFloorSpot,uiPaintCross,uiPaintFusionFloor,uiPaintTag };

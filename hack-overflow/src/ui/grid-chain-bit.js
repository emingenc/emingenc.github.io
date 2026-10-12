import { hasCosmetic } from '../game/ext/badge-ops.js';

const BODY = { rows:['.bbbbb.','bbbbbbb','bkbbbkb','bbbbbbb','.b...b.'],ink:{ b:'cyan',k:'bg' } };
const BIT_MARKS = Object.freeze({
'bit-visor':{ rows:['.......','.......','vvvvvvv','.......','.......'],ink:{ v:'amber' } },
'bit-patch-pin':{ rows:['.......','.......','.......','.pt....','.......'],ink:{ p:'magenta',t:'text' } },
});
const SIDE_TILES = 0.62;
const LIFT_TILES = 0.25;
const BIT_TILES = 0.5;
const BOB_TILES = 0.04;
const BOB_MS = 420;

function uiPaintRows(ctx,art,spot) {
art.rows.forEach(function (line,row) {
[...line].forEach(function (glyph,col) {
if (!Object.hasOwn(art.ink,glyph)) return;
ctx.fillStyle = spot.palette[art.ink[glyph]];
ctx.fillRect(spot.left + col * spot.pixel,spot.top + row * spot.pixel,spot.pixel,spot.pixel);
});
});
}
function uiBitWears(ext) {
return Object.keys(BIT_MARKS).filter((id) => hasCosmetic(ext,id));
}
function uiPaintBit(ctx,app,frame) {
const wears = uiBitWears(app.game.ext);
if (wears.length === 0) return;
const pixel = Math.max(1,Math.round((frame.tile * BIT_TILES) / BODY.rows[0].length));
const bob = frame.reducedMotion ? 0 :Math.sin(frame.now / BOB_MS) * BOB_TILES * frame.tile;
const spot = {
palette:frame.palette,pixel,
left:(frame.avatar.col - frame.camera.col + SIDE_TILES) * frame.tile,
top:(frame.avatar.row - frame.camera.row) * frame.tile - LIFT_TILES * frame.tile + bob,
};
uiPaintRows(ctx,BODY,spot);
wears.forEach((id) => uiPaintRows(ctx,BIT_MARKS[id],spot));
}

export { BIT_MARKS,uiBitWears,uiPaintBit,uiPaintRows };

const MITE_ART = ['..sss..','.sssss.','sbebebs','.sssss.','x.x.x.x'];
const ART_TILES = 0.8;
const MARK_TILES = 0.2;
const MARK_BAR_TILES = 0.06;
const MARK_INSET_TILES = 0.06;
const HALF = 0.5;
const COLOURS = { s:'primary',b:'cyan',e:'bg',x:'dim' };
const SHELL = MITE_ART.flatMap((line,row) => [...line].map((glyph,col) => ({ glyph,col,row }))).filter((one) => one.glyph !== '.');

function uiDrawShell(ctx,frame,spot) {
const pixel = (frame.tile * ART_TILES) / MITE_ART[0].length;
const left = spot.left + (frame.tile - pixel * MITE_ART[0].length) * HALF;
const top = spot.top + (frame.tile - pixel * MITE_ART.length) * HALF;
SHELL.forEach(function (one) {
ctx.fillStyle = frame.palette[COLOURS[one.glyph]];
ctx.fillRect(left + one.col * pixel,top + one.row * pixel,pixel,pixel);
});
}
function uiDrawCorner(ctx,frame,spot) {
const corner = spot.corner;
const arm = frame.tile * MARK_TILES;
const bar = frame.tile * MARK_BAR_TILES;
const inset = frame.tile * MARK_INSET_TILES;
const flat = spot.left + (corner.right ? frame.tile - inset - arm :inset);
const upright = spot.left + (corner.right ? frame.tile - inset - bar :inset);
ctx.fillRect(flat,spot.top + (corner.low ? frame.tile - inset - bar :inset),arm,bar);
ctx.fillRect(upright,spot.top + (corner.low ? frame.tile - inset - arm :inset),bar,arm);
}
function uiDrawMarks(ctx,frame,spot) {
ctx.fillStyle = frame.palette.magenta;
[{ right:false,low:false },{ right:true,low:false },{ right:false,low:true },{ right:true,low:true }].forEach(function (corner) { uiDrawCorner(ctx,frame,{ ...spot,corner }); });
}
function uiDrawArmored(ctx,frame,spot) {
const actor = spot.actor;
if (!actor.awake) return;
const cell = { left:(actor.col - frame.camera.col) * frame.tile,top:(actor.row - frame.camera.row) * frame.tile };
uiDrawShell(ctx,frame,cell);
if (actor.tagged) uiDrawMarks(ctx,frame,cell);
}

export { uiDrawArmored };

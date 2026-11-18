const HALF = 0.5;

function uiFillGlyphs(ctx,rows,spec) {
rows.forEach(function (line,row) {
[...line].forEach(function (glyph,col) {
if (glyph === '.') return;
ctx.fillStyle = spec.ink(glyph);
ctx.fillRect(spec.left + col * spec.pixel,spec.top + row * spec.pixel,spec.pixel,spec.pixel);
});
});
}

function uiFillCentred(ctx,rows,spec) {
const pixel = (spec.tile * spec.share) / rows[0].length;
const left = spec.left + (spec.tile - pixel * rows[0].length) * HALF;
const top = spec.top + (spec.tile - pixel * rows.length) * HALF;
uiFillGlyphs(ctx,rows,{ left,top,pixel,ink:spec.ink });
}

function uiEyedInk(eye,body) {
return function (glyph) { return glyph === 'e' ? eye :body; };
}
function uiBobAt(frame,ms,tiles) {
return frame.reducedMotion ? 0 :Math.sin(frame.now / ms) * tiles * frame.tile;
}

export { uiBobAt,uiEyedInk,uiFillCentred,uiFillGlyphs };

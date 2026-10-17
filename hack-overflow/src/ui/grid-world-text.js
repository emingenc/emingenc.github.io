const FACE = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
const TEXT_RENDERING = 'optimizeSpeed';
const OUTLINE_PX = 3;
const NOTCH_PX = 2;
const EDGE_PX = 2;

function uiWorldFont(size) {
return '700 ' + size + 'px ' + FACE;
}
function uiTextWidth(ctx,text,font) {
ctx.font = font;
return ctx.measureText(text).width;
}
function uiOutlinedText(ctx,frame,spec) {
ctx.font = spec.font;
ctx.textRendering = TEXT_RENDERING;
ctx.textAlign = spec.align || 'center';
ctx.textBaseline = 'middle';
ctx.lineWidth = OUTLINE_PX;
ctx.strokeStyle = frame.palette.bg;
ctx.strokeText(spec.text,spec.x,spec.y);
ctx.fillStyle = frame.palette[spec.ink] || spec.ink;
ctx.fillText(spec.text,spec.x,spec.y);
}
function uiNotched(ctx,box,inset) {
ctx.fillRect(box.left + inset + NOTCH_PX,box.top + inset,box.width - 2 * (inset + NOTCH_PX),box.height - 2 * inset);
ctx.fillRect(box.left + inset,box.top + inset + NOTCH_PX,box.width - 2 * inset,box.height - 2 * (inset + NOTCH_PX));
}
function uiNotchedBox(ctx,frame,box) {
ctx.globalAlpha = 1;
ctx.fillStyle = frame.palette[box.edge] || box.edge;
uiNotched(ctx,box,0);
ctx.fillStyle = frame.palette[box.fill] || box.fill;
uiNotched(ctx,box,EDGE_PX);
}
function uiBoxesMeet(one,other) {
return one.left < other.left + other.width && other.left < one.left + one.width && one.top < other.top + other.height && other.top < one.top + one.height;
}

export { uiWorldFont,uiTextWidth,uiOutlinedText,uiNotchedBox,uiBoxesMeet };

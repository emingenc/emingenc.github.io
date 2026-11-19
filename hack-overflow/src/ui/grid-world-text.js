import { uiBlitEntry,uiFontPx,uiMakeEntry } from './blit-cache.js';

const FACE = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
const TEXT_RENDERING = 'optimizeSpeed';
const OUTLINE_PX = 3;
const NOTCH_PX = 2;
const EDGE_PX = 2;
const LINE_EM = 1.4;

function uiWorldFont(size) {
return '700 ' + size + 'px ' + FACE;
}
function uiTextWidth(ctx,text,font) {
ctx.font = font;
return ctx.measureText(text).width;
}
function uiPaintOutlined(ctx,frame,spec) {
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
function uiOutlinedEntry(frame,spec) {
const width = frame.blits.measure(spec.font,spec.text) + 2 * OUTLINE_PX;
const entry = uiMakeEntry({ width,height:Math.ceil(uiFontPx(spec.font) * LINE_EM) + 2 * OUTLINE_PX,dpr:frame.dpr });
uiPaintOutlined(entry.ctx,frame,{ ...spec,align:'left',x:OUTLINE_PX,y:entry.height / 2 });
return entry;
}
function uiBlitOutlined(ctx,frame,spec) {
const key = ['o',spec.font,spec.ink,frame.palette.bg,frame.dpr,spec.text].join('|');
const entry = frame.blits.entry(key,function () { return uiOutlinedEntry(frame,spec); });
const left = spec.align === 'left' ? spec.x - OUTLINE_PX :spec.x - entry.width / 2;
uiBlitEntry(ctx,entry,{ x:left,y:spec.y - entry.height / 2 });
}
function uiOutlinedText(ctx,frame,spec) {
if (frame.blits) uiBlitOutlined(ctx,frame,spec);
else uiPaintOutlined(ctx,frame,spec);
}
function uiLabelEntry(frame,spec) {
const body = Math.ceil(uiFontPx(spec.font) * LINE_EM);
const width = frame.blits.measure(spec.font,spec.text) + spec.unit + 2 * OUTLINE_PX;
const entry = uiMakeEntry({ width,height:body + Math.ceil(spec.unit) + 2 * OUTLINE_PX,dpr:frame.dpr });
const ctx = entry.ctx;
ctx.font = spec.font;
ctx.textAlign = 'left';
ctx.textBaseline = 'middle';
ctx.fillStyle = frame.palette.bg;
ctx.fillText(spec.text,OUTLINE_PX + spec.unit,OUTLINE_PX + body / 2 + spec.unit);
ctx.fillStyle = frame.palette[spec.ink];
ctx.fillText(spec.text,OUTLINE_PX,OUTLINE_PX + body / 2);
entry.body = body;
return entry;
}
function uiBlitLabel(ctx,frame,spec) {
const key = ['l',spec.font,spec.ink,frame.palette.bg,frame.dpr,spec.unit,spec.text].join('|');
const entry = frame.blits.entry(key,function () { return uiLabelEntry(frame,spec); });
uiBlitEntry(ctx,entry,{ x:spec.left - OUTLINE_PX,y:spec.middle - OUTLINE_PX - entry.body / 2 });
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

export { uiWorldFont,uiTextWidth,uiOutlinedText,uiBlitLabel,uiNotchedBox,uiNotched,uiBoxesMeet };

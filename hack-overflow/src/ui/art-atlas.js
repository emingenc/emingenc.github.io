import { uiRamp,uiTintPixels } from './art-tint.js';


function uiFrameTable(json,image) {
return new Map(Object.entries(json.frames || {}).map(function ([name,frame]) { return [name,{ image,frame,px:json.px }]; }));
}
function uiStepSizes(from,to) {
const sizes = [];
for (let size = from; Math.round(size / 2) >= to; size = Math.round(size / 2)) sizes.push(Math.round(size / 2));
if (sizes[sizes.length - 1] !== to) sizes.push(to);
return sizes;
}
function uiNewCanvas(width,height) {
const canvas = document.createElement('canvas');
canvas.width = width;
canvas.height = height;
return canvas;
}
function uiStepDown(source,from,to) {
return uiStepSizes(from,to).reduce(function (canvas,size) {
const next = uiNewCanvas(size,size);
const ctx = next.getContext('2d');
ctx.imageSmoothingEnabled = true;
ctx.imageSmoothingQuality = 'high';
ctx.drawImage(canvas,0,0,canvas.width,canvas.height,0,0,size,size);
return next;
},source);
}
function uiPaintFrame(entry,ramp) {
const { image,frame } = entry;
const canvas = uiNewCanvas(frame.w,frame.h);
const ctx = canvas.getContext('2d');
ctx.drawImage(image,frame.x,frame.y,frame.w,frame.h,0,0,frame.w,frame.h);
if (ramp) {
const pixels = ctx.getImageData(0,0,frame.w,frame.h);
uiTintPixels(pixels.data,ramp);
ctx.putImageData(pixels,0,0);
}
return canvas;
}
function uiCacheKey(name,entry,spec) {
const { accent,devicePx,palette } = spec;
return entry.frame.tint ? [name,accent,devicePx,palette.bg,palette[accent],palette.text].join('|') :[name,devicePx].join('|');
}
function uiBuildFrame(entry,spec) {
const painted = uiPaintFrame(entry,entry.frame.tint ? uiRamp(spec.palette,spec.accent) :null);
return uiStepDown(painted,entry.frame.w,Math.round(spec.devicePx * entry.frame.w / entry.px));
}
function uiCreateAtlas(fallbackPalette) {
const frames = new Map();
const cache = new Map();
let palette = null;
function uiPalette(spec) {
if (spec.palette && spec.palette.bg) return spec.palette;
palette = palette || fallbackPalette();
return palette;
}
function uiAdd(json,image) {
uiFrameTable(json,image).forEach(function (entry,name) { frames.set(name,entry); });
cache.clear();
}
function uiCanvas(name,spec) {
const entry = frames.get(name);
if (!entry || !(spec.devicePx > 0)) return null;
const paint = entry.frame.tint ? { ...spec,palette:uiPalette(spec) } :spec;
const key = uiCacheKey(name,entry,paint);
if (!cache.has(key)) cache.set(key,uiBuildFrame(entry,paint));
return cache.get(key);
}
return { add:uiAdd,has:function (name) { return frames.has(name); },canvas:uiCanvas };
}

export { uiFrameTable,uiStepSizes,uiCreateAtlas };

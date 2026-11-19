import { uiRamp,uiTintPixels } from './art-tint.js';

const KEEP_SIZES = 2;

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
return Object.assign(document.createElement('canvas'),{ width,height });
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
const ctx = canvas.getContext('2d',ramp ? { willReadFrequently:true } :undefined);
ctx.drawImage(image,frame.x,frame.y,frame.w,frame.h,0,0,frame.w,frame.h);
if (ramp) {
const pixels = ctx.getImageData(0,0,frame.w,frame.h);
uiTintPixels(pixels.data,ramp);
ctx.putImageData(pixels,0,0);
}
return canvas;
}
function uiCacheKey(name,entry,spec) {
const { accent,palette } = spec;
return entry.frame.tint ? [name,accent,palette.bg,palette[accent],palette.text].join('|') :name + '|';
}
function uiBuildFrame(entry,spec) {
const painted = uiPaintFrame(entry,entry.frame.tint ? uiRamp(spec.palette,spec.accent) :null);
return uiStepDown(painted,entry.frame.w,Math.round(spec.devicePx * entry.frame.w / entry.px));
}
function uiDropName(bySize,name) {
bySize.forEach(function (cache) { [...cache.keys()].filter(function (key) { return key.startsWith(name + '|'); }).forEach(function (key) { cache.delete(key); }); });
}
function uiTouchSize(bySize,devicePx) {
const cache = bySize.get(devicePx) || new Map();
bySize.delete(devicePx);
bySize.set(devicePx,cache);
while (bySize.size > KEEP_SIZES) bySize.delete(bySize.keys().next().value);
return cache;
}
function uiPaletteOf(store,spec) {
if (spec.palette && spec.palette.bg) return spec.palette;
store.palette = store.palette || store.fallbackPalette();
return store.palette;
}
function uiAdd(store,json,image) {
uiFrameTable(json,image).forEach(function (entry,name) {
store.frames.set(name,entry);
uiDropName(store.bySize,name);
});
}
function uiList(store) {
return [...store.frames.entries()].map(function ([name,entry]) { return { name,tint:Boolean(entry.frame.tint) }; });
}
function uiSizeCache(store,devicePx) {
if (store.latest !== devicePx) {
uiTouchSize(store.bySize,devicePx);
store.latest = devicePx;
}
return store.bySize.get(devicePx);
}
function uiCanvas(store,name,spec) {
const entry = store.frames.get(name);
if (!entry || !(spec.devicePx > 0)) return null;
const paint = entry.frame.tint ? { ...spec,palette:uiPaletteOf(store,spec) } :spec;
const cache = uiSizeCache(store,spec.devicePx);
const key = uiCacheKey(name,entry,paint);
if (!cache.has(key)) cache.set(key,uiBuildFrame(entry,paint));
return cache.get(key);
}
function uiCreateAtlas(fallbackPalette) {
const store = { frames:new Map(),bySize:new Map(),latest:0,palette:null,fallbackPalette };
return {
add(json,image) { uiAdd(store,json,image); },
has(name) { return store.frames.has(name); },
canvas(name,spec) { return uiCanvas(store,name,spec); },
list() { return uiList(store); },
sizes() { return [...store.bySize.keys()]; },
};
}

export { uiFrameTable,uiStepSizes,uiCreateAtlas };

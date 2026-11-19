const BLIT_CAP = 96;
const SCRATCH_PX = 1;
const FONT_SIZE_PATTERN = /(\d+(?:\.\d+)?)px/;
const FALLBACK_FONT_PX = 16;

function uiFontPx(font) {
const match = FONT_SIZE_PATTERN.exec(font);
return match ? Number(match[1]) :FALLBACK_FONT_PX;
}
function uiNewBitmap(width,height) {
return Object.assign(document.createElement('canvas'),{ width,height });
}
function uiMakeEntry(size) {
const canvas = uiNewBitmap(Math.ceil(size.width * size.dpr),Math.ceil(size.height * size.dpr));
const ctx = canvas.getContext('2d');
ctx.setTransform(size.dpr,0,0,size.dpr,0,0);
return { canvas,ctx,width:canvas.width / size.dpr,height:canvas.height / size.dpr,dpr:size.dpr };
}
function uiCreateBlits() {
const entries = new Map();
let scratch = null;
const clear = function () { entries.clear(); };
if (typeof document !== 'undefined' && document.fonts && document.fonts.addEventListener) document.fonts.addEventListener('loadingdone',clear);
return {
entry(key,build) {
if (!entries.has(key)) {
if (entries.size >= BLIT_CAP) entries.clear();
entries.set(key,build());
}
return entries.get(key);
},
measure(font,text) {
scratch = scratch || uiNewBitmap(SCRATCH_PX,SCRATCH_PX).getContext('2d');
scratch.font = font;
return scratch.measureText(text).width;
},
size() { return entries.size; },
};
}
function uiBlitEntry(ctx,entry,spot) {
const snap = function (value) { return Math.round(value * entry.dpr) / entry.dpr; };
ctx.drawImage(entry.canvas,snap(spot.x),snap(spot.y),entry.width,entry.height);
}

export { BLIT_CAP,uiFontPx,uiMakeEntry,uiCreateBlits,uiBlitEntry };

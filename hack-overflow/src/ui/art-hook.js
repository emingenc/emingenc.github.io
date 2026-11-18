let uiArtSource = null;
let uiArtVersion = 0;

function uiSetArt(source) {
uiArtSource = source;
uiArtVersion += 1;
}
function uiArtRevision() {
return uiArtVersion;
}
function uiArtCanvas(name,spec) {
return uiArtSource ? uiArtSource.canvas(name,spec) || null :null;
}
function uiDrawArt(ctx,name,box) {
const device = Math.round(box.size * box.dpr);
const canvas = uiArtCanvas(name,{ accent:box.accent,devicePx:device,palette:box.palette });
if (!canvas) return false;
const size = box.size * canvas.width / device;
const smooth = ctx.imageSmoothingEnabled;
ctx.imageSmoothingEnabled = true;
ctx.drawImage(canvas,box.left - (size - box.size) / 2,box.top - (size - box.size) / 2,size,size);
ctx.imageSmoothingEnabled = smooth;
return true;
}

export { uiSetArt,uiArtRevision,uiArtCanvas,uiDrawArt };

const UI_MAP_RING = { ratio:1.3,minHalf:5,width:2,armRatio:0.7,swatchHalf:5 };

function uiDrawBrackets(ctx,ring) {
const thick = UI_MAP_RING.width;
const arm = Math.max(thick + 1,Math.round(ring.half * UI_MAP_RING.armRatio));
[-1,1].forEach(function (across) {
[-1,1].forEach(function (down) {
const corner = { left:ring.cx + across * ring.half,top:ring.cy + down * ring.half };
const left = across < 0 ? corner.left :corner.left - arm;
const top = down < 0 ? corner.top :corner.top - arm;
ctx.fillStyle = ring.color;
ctx.fillRect(left,corner.top - (down < 0 ? 0 :thick),arm,thick);
ctx.fillRect(corner.left - (across < 0 ? 0 :thick),top,thick,arm);
});
});
}
function uiDrawMapObjective(view,centre) {
if (!view.objective) return;
const tile = view.layout.tile;
const half = Math.max(UI_MAP_RING.minHalf,tile * UI_MAP_RING.ratio);
const cx = view.layout.left + (view.objective.col + centre) * tile;
const cy = view.layout.top + (view.objective.row + centre) * tile;
uiDrawBrackets(view.ctx,{ cx,cy,half,color:view.palette.bright });
}
function uiDrawRingSwatch(ctx,entry,palette) {
uiDrawBrackets(ctx,{ cx:entry.left + entry.size / 2,cy:entry.top + entry.size / 2,half:UI_MAP_RING.swatchHalf,color:palette.bright });
}

const uiMapLayouts = new WeakMap();
function uiMapLayoutRemember(canvas,layout) {
if (canvas) uiMapLayouts.set(canvas,layout);
}
function uiMapLayoutOf(canvas) {
return uiMapLayouts.get(canvas) || null;
}

export { uiDrawMapObjective,uiDrawRingSwatch,uiMapLayoutOf,uiMapLayoutRemember };

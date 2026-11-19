const BAKE_MARGIN = 2;
const BAKE_MAX_PIXELS = 24000000;

function bakeRegion(range,world,margin = BAKE_MARGIN) {
return {
col0:Math.max(range.col0 - margin,0),col1:Math.min(range.col1 + margin,world.cols - 1),
row0:Math.max(range.row0 - margin,0),row1:Math.min(range.row1 + margin,world.rows - 1),
};
}
function regionHolds(region,range) {
return region !== null && range.col0 >= region.col0 && range.col1 <= region.col1 && range.row0 >= region.row0 && range.row1 <= region.row1;
}
function regionPixels(region,scale) {
const left = Math.round(region.col0 * scale);
const top = Math.round(region.row0 * scale);
return { x:left,y:top,width:Math.round((region.col1 + 1) * scale) - left,height:Math.round((region.row1 + 1) * scale) - top };
}
function planBake(range,spec) {
for (const margin of [BAKE_MARGIN,0]) {
const region = bakeRegion(range,spec.world,margin);
const pixels = regionPixels(region,spec.scale);
if (pixels.width * pixels.height <= BAKE_MAX_PIXELS) return { region,pixels };
}
return null;
}

export { BAKE_MARGIN,BAKE_MAX_PIXELS,bakeRegion,regionHolds,regionPixels,planBake };

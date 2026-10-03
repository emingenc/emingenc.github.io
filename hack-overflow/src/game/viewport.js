const VIEWPORT = { spritePx:16,minTilesAcross:21,minScale:2 };
const CELL_CENTRE = 0.5;
function tileSizeFor(stageWidth) {
const scale = Math.floor((stageWidth || 0) / (VIEWPORT.spritePx * VIEWPORT.minTilesAcross));
return VIEWPORT.spritePx * Math.max(VIEWPORT.minScale,scale);
}
function cameraAxis(focus,span) {
if (span.map <= span.view) return (span.map - span.view) / 2;
return Math.min(Math.max(focus + CELL_CENTRE - span.view / 2,0),span.map - span.view);
}
function cameraFor(world,view) {
return {
col:cameraAxis(view.focus.col,{ map:world.cols,view:view.cols }),
row:cameraAxis(view.focus.row,{ map:world.rows,view:view.rows }),
};
}
function cellAtPoint(view,point) {
return { col:Math.floor(view.camera.col + point.left / view.tile),row:Math.floor(view.camera.row + point.top / view.tile) };
}
function visibleRange(camera,view) {
return {
col0:Math.floor(camera.col),col1:Math.ceil(camera.col + view.cols) - 1,
row0:Math.floor(camera.row),row1:Math.ceil(camera.row + view.rows) - 1,
};
}

export { VIEWPORT, tileSizeFor, cameraFor, cellAtPoint, visibleRange };

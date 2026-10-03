
const EDGE_INSET = 0.9;
const PULSE_MS = 900;
const PULSE_STILL = 0.5;
const HALF = 0.5;
const FULL_TURN = Math.PI * 2;

function targetCell(world,targetId) {
const thing = targetId ? world.things[targetId] :null;
return thing ? { col:thing.col,row:thing.row } :null;
}
function viewCentre(view) {
return { col:view.cols * HALF,row:view.rows * HALF };
}
function edgeScale(delta,view) {
const reachCol = view.cols * HALF - EDGE_INSET;
const reachRow = view.rows * HALF - EDGE_INSET;
const alongCol = delta.col === 0 ? Infinity :reachCol / Math.abs(delta.col);
const alongRow = delta.row === 0 ? Infinity :reachRow / Math.abs(delta.row);
return Math.min(alongCol,alongRow);
}
function markerFor(cell,view) {
if (!cell) return { kind:'none' };
const at = { col:cell.col + HALF - view.camera.col,row:cell.row + HALF - view.camera.row };
const centre = viewCentre(view);
const delta = { col:at.col - centre.col,row:at.row - centre.row };
const scale = edgeScale(delta,view);
if (scale >= 1) return { kind:'here',col:at.col,row:at.row };
return { kind:'edge',col:centre.col + delta.col * scale,row:centre.row + delta.row * scale,angle:Math.atan2(delta.row,delta.col) };
}
function pulseAt(now,reducedMotion) {
if (reducedMotion) return PULSE_STILL;
return (Math.sin(now / PULSE_MS * FULL_TURN) + 1) * HALF;
}

export { EDGE_INSET, targetCell, markerFor, pulseAt };

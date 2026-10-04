import { cameraFor } from './viewport.js';


const EDGE_INSET = 0.9;
const PULSE_MS = 900;
const PULSE_STILL = 0.5;
const HALF = 0.5;
const FULL_TURN = Math.PI * 2;
const CAMERA_MARGIN = 1;

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
function centreInView(at,view) {
return at.col >= 0 && at.col <= view.cols && at.row >= 0 && at.row <= view.rows;
}
function markerFor(cell,view) {
if (!cell) return { kind:'none' };
const at = { col:cell.col + HALF - view.camera.col,row:cell.row + HALF - view.camera.row };
const centre = viewCentre(view);
const delta = { col:at.col - centre.col,row:at.row - centre.row };
if (centreInView(at,view)) return { kind:'here',col:at.col,row:at.row };
const scale = edgeScale(delta,view);
return { kind:'edge',col:centre.col + delta.col * scale,row:centre.row + delta.row * scale,angle:Math.atan2(delta.row,delta.col) };
}
function keepAxis(camera,axis) {
const end = camera + axis.span;
if (axis.target + 1 <= camera || axis.target >= end) return camera;
const shift = Math.min(axis.target - camera,0) + Math.max(axis.target + 1 - end,0);
return Math.min(Math.max(camera + shift,axis.focus + 1 - axis.span),axis.focus);
}
function framedCamera(world,view,target) {
const padded = { cols:world.cols + CAMERA_MARGIN * 2,rows:world.rows + CAMERA_MARGIN * 2 };
const focus = { col:view.focus.col + CAMERA_MARGIN,row:view.focus.row + CAMERA_MARGIN };
const centred = cameraFor(padded,{ focus,cols:view.cols,rows:view.rows });
const camera = { col:centred.col - CAMERA_MARGIN,row:centred.row - CAMERA_MARGIN };
if (!target) return camera;
return {
col:keepAxis(camera.col,{ span:view.cols,target:target.col,focus:view.focus.col }),
row:keepAxis(camera.row,{ span:view.rows,target:target.row,focus:view.focus.row }),
};
}
function pulseAt(now,reducedMotion) {
if (reducedMotion) return PULSE_STILL;
return (Math.sin(now / PULSE_MS * FULL_TURN) + 1) * HALF;
}

export { CAMERA_MARGIN, EDGE_INSET, targetCell, markerFor, framedCamera, pulseAt };

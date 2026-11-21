import { cellKey } from '../game/path.js';
import { routeCells } from '../game/route-dots.js';


const UI_DOT = { radiusCells:0.12,alpha:0.85 };
const HALF_TILE = 0.5;
const FULL_TURN = Math.PI * 2;

function uiRouteKey(frame) {
return cellKey(frame.avatarCell) + '>' + frame.targetId + '|' + [...(frame.routeAvoid || [])].join(';');
}
function uiCachedCells(frame) {
const cache = frame.routeCache;
const key = uiRouteKey(frame);
if (cache.key === key && cache.progress === frame.progress) return cache.cells;
cache.key = key;
cache.progress = frame.progress;
cache.cells = routeCells(frame.world,frame.progress,{ from:frame.avatarCell,targetId:frame.targetId,avoid:frame.routeAvoid });
return cache.cells;
}
function uiCellInView(frame,cell) {
const camera = frame.camera;
return cell.col + 1 > camera.col && cell.col < camera.col + frame.view.cols && cell.row + 1 > camera.row && cell.row < camera.row + frame.view.rows;
}
function uiDrawDot(frame,cell) {
const ctx = frame.ctx;
ctx.beginPath();
ctx.arc((cell.col + HALF_TILE - frame.camera.col) * frame.tile,(cell.row + HALF_TILE - frame.camera.row) * frame.tile,frame.tile * UI_DOT.radiusCells,0,FULL_TURN);
ctx.fill();
}
function uiDrawRoute(frame) {
if (!frame.targetId || frame.walking) return;
const cells = uiCachedCells(frame).filter((cell) => uiCellInView(frame,cell));
if (cells.length === 0) return;
const ctx = frame.ctx;
ctx.save();
ctx.globalAlpha = UI_DOT.alpha;
ctx.fillStyle = frame.palette.amber;
cells.forEach((cell) => uiDrawDot(frame,cell));
ctx.restore();
}

export { uiDrawRoute };

import { uiSectorAt } from './grid-draw-tiles.js';

const REACH_PX = 22;
const MIN_REACH_TILES = 1.5;

function uiMapCellAt(world,layout,point) {
if (!layout) return null;
const col = Math.floor((point.x - layout.left) / layout.tile);
const row = Math.floor((point.y - layout.top) / layout.tile);
return col >= 0 && row >= 0 && col < world.cols && row < world.rows ? { col,row } :null;
}
function uiNearest(world,targets,spot) {
let best = null;
targets.forEach(function (target) {
const thing = world.things[target.id];
const gap = Math.hypot(thing.col - spot.cell.col,thing.row - spot.cell.row);
if (gap <= spot.reach && (!best || gap < best.gap)) best = { target,gap };
});
return best ? best.target :null;
}
function uiMapPick(world,targets,tap) {
const reach = Math.max(MIN_REACH_TILES,REACH_PX / tap.tile);
const near = uiNearest(world,targets,{ cell:tap.cell,reach });
if (near) return near;
const region = uiSectorAt(world,tap.cell);
return region ? targets.find((target) => target.sector === region) || null :null;
}

export { uiMapCellAt,uiMapPick };

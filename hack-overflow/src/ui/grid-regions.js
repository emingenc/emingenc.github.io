import { DIRS, cellToward } from '../game/move.js';
import { UI_GROUND } from './grid-draw-common.js';

const UI_WALKABLE = new Set(['floor','cache']);
const UI_FAMILY_SEEDS = new Set(['terminal','door','core','gate','barrier','rig']);

function uiIndexAt(world,cell) {
const inside = cell.col >= 0 && cell.col < world.cols && cell.row >= 0 && cell.row < world.rows;
return inside ? cell.row * world.cols + cell.col :-1;
}
function uiCellOf(world,index) {
return { col:index % world.cols,row:Math.floor(index / world.cols) };
}
function uiNeighbours(world,index) {
const cell = uiCellOf(world,index);
return Object.keys(DIRS).map(function (dir) { return uiIndexAt(world,cellToward(cell,dir)); }).filter(function (next) { return next >= 0; });
}
function uiIsWalkableAt(world,index) {
return index >= 0 && UI_WALKABLE.has(world.cells[index].kind);
}
function uiIsRockAt(world,index) {
return index < 0 || !UI_GROUND.has(world.cells[index].kind);
}
function uiIsDoorway(world,index) {
const cell = uiCellOf(world,index);
const rock = function (dir) { return uiIsRockAt(world,uiIndexAt(world,cellToward(cell,dir))); };
return (rock('up') && rock('down')) || (rock('left') && rock('right'));
}
function uiFill(world,fill) {
const cells = [fill.start];
fill.group[fill.start] = true;
for (let head = 0; head < cells.length; head += 1) {
uiNeighbours(world,cells[head]).forEach(function (next) {
if (fill.group[next] || !fill.member(next)) return;
fill.group[next] = true;
cells.push(next);
});
}
return cells;
}
function uiGroups(world,member) {
const group = new Array(world.cells.length).fill(false);
return world.cells.flatMap(function (entry,index) {
return group[index] || !member(index) ? [] :[uiFill(world,{ start:index,member,group })];
});
}
function uiOwnFamily(world,index) {
const entry = world.cells[index];
const thing = UI_FAMILY_SEEDS.has(entry.kind) ? world.things[entry.id] :null;
return thing && thing.family ? thing.family :null;
}
function uiMostCommon(families) {
const counts = new Map();
families.forEach(function (family) { counts.set(family,(counts.get(family) || 0) + 1); });
return [...counts.keys()].reduce(function (best,family) { return best === null || counts.get(family) > counts.get(best) ? family :best; },null);
}
function uiTouching(world,cells) {
const inside = new Set(cells);
return [...new Set(cells.flatMap(function (index) { return uiNeighbours(world,index); }))].filter(function (next) { return !inside.has(next); });
}
function uiGroupPlan(world,cells) {
const touching = uiTouching(world,cells);
const spawn = cells.includes(uiIndexAt(world,world.spawn));
const family = spawn ? null :uiMostCommon(touching.map(function (index) { return uiOwnFamily(world,index); }).filter(Boolean));
return { cells,family,settled:spawn || family !== null,walks:touching.filter(function (index) { return uiIsWalkableAt(world,index); }) };
}
function uiSettleGroups(groups,regions) {
let changed = true;
while (changed) {
changed = false;
groups.filter(function (group) { return !group.settled; }).forEach(function (group) {
const family = group.walks.map(function (index) { return regions[index]; }).find(Boolean);
if (!family) return;
Object.assign(group,{ family,settled:true });
group.cells.forEach(function (index) { regions[index] = family; });
changed = true;
});
}
}
function uiRegionsOf(world) {
const regions = world.cells.map(function (entry,index) { return uiOwnFamily(world,index); });
const doorway = world.cells.map(function (entry,index) { return uiIsWalkableAt(world,index) && uiIsDoorway(world,index); });
const rooms = uiGroups(world,function (index) { return uiIsWalkableAt(world,index) && !doorway[index]; });
const ways = uiGroups(world,function (index) { return doorway[index]; });
const groups = [...rooms,...ways].map(function (cells) { return uiGroupPlan(world,cells); });
groups.forEach(function (group) { group.cells.forEach(function (index) { regions[index] = group.family; }); });
uiSettleGroups(groups,regions);
return regions;
}

export { uiIndexAt,uiCellOf,uiRegionsOf };

import { cellToward } from './move.js';
import { isPassable, thingAt } from './world.js';

const NEIGHBOUR_ORDER = ['up','right','down','left'];
function cellKey(cell) {
return cell.col + ',' + cell.row;
}
function sameCell(one,other) {
return one.col === other.col && one.row === other.row;
}
function visit(search,cell,edge) {
const key = cellKey(edge.next);
if (search.trail.has(key) || !isPassable(search.world,search.progress,edge.next)) return;
search.trail.set(key,{ back:cellKey(cell),dir:edge.dir });
search.queue.push(edge.next);
}
function expand(search,cell) {
for (const dir of NEIGHBOUR_ORDER) {
const next = cellToward(cell,dir);
if (search.isGoal(next)) return { from:cell,dir };
visit(search,cell,{ next,dir });
}
return null;
}
function explore(search) {
if (!isPassable(search.world,search.progress,search.from)) return { trail:new Map(),hit:null };
Object.assign(search,{ trail:new Map([[cellKey(search.from),null]]),queue:[search.from] });
for (let head = 0; head < search.queue.length; head += 1) {
const hit = expand(search,search.queue[head]);
if (hit) return { trail:search.trail,hit };
}
return { trail:search.trail,hit:null };
}
function stepsTo(trail,cell) {
const dirs = [];
for (let step = trail.get(cellKey(cell)); step; step = trail.get(step.back)) dirs.push(step.dir);
return dirs.reverse();
}
function reachable(world,progress,from) {
return new Set(explore({ world,progress,from,isGoal:() => false }).trail.keys());
}
function findPath(world,progress,route) {
if (sameCell(route.from,route.to)) return [];
if (!thingAt(world,route.to) && !isPassable(world,progress,route.to)) return null;
const { trail,hit } = explore({ world,progress,from:route.from,isGoal:(cell) => sameCell(cell,route.to) });
return hit ? [...stepsTo(trail,hit.from),hit.dir] :null;
}

export { cellKey, reachable, findPath };

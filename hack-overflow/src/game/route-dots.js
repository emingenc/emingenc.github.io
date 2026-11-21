import { cellToward } from './move.js';
import { findPath } from './path.js';
import { targetCell } from './wayfinding.js';

function routeCells(world,progress,route) {
const to = targetCell(world,route.targetId);
const dirs = to ? findPath(world,progress,{ from:route.from,to,avoid:route.avoid }) :null;
if (!dirs) return [];
const cells = [];
let at = route.from;
for (const dir of dirs) {
at = cellToward(at,dir);
cells.push(at);
}
return cells.slice(0,-1);
}

export { routeCells };

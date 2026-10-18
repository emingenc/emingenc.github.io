import { BOLT_RANGE } from './actors.js';
import { cellToward } from './move.js';
import { dangerCells } from './mites.js';
import { cellKey, findPath } from './path.js';

const DRONE_REACH = BOLT_RANGE - 1;
const SWEEP_NEAR = 2;
const SIDES = [{ dc:0,dr:0 },{ dc:0,dr:-1 },{ dc:1,dr:0 },{ dc:0,dr:1 },{ dc:-1,dr:0 }];
const NAMES = { drone:'Drone',sentinel:'Sentinel',patrol:'Patrol',mite:'Mite' };
const FIGHT_HINT = 'A fight · ◆ wait';
const HINTS = { drone:FIGHT_HINT,sentinel:FIGHT_HINT,mite:'◆ wait · A zap up close',patrol:'◆ wait' };
const MOVING_KINDS = new Set(['mite','patrol']);

function kindOf(foe) {
return foe.kind ?? 'drone';
}
function isDangerous(foe,calm) {
return foe.hp > 0 && foe.awake && !foe.harmless && !(calm && kindOf(foe) === 'drone') && !foe.calm;
}
function squareAround(foe,reach) {
const cells = [];
for (let dc = -reach; dc <= reach; dc += 1) {
for (let dr = -reach; dr <= reach; dr += 1) cells.push({ col:foe.col + dc,row:foe.row + dr });
}
return cells;
}
function crossAround(foe) {
return SIDES.map((side) => ({ col:foe.col + side.dc,row:foe.row + side.dr }));
}
function laneNext(patrol) {
const ahead = patrol.at + patrol.dir;
const index = ahead >= 0 && ahead < patrol.lane.length ? ahead :patrol.at - patrol.dir;
return patrol.lane[index];
}
function patrolCells(patrol) {
const own = { col:patrol.col,row:patrol.row };
if (patrol.beat > SWEEP_NEAR || patrol.lane.length < 2) return [own];
return [own,laneNext(patrol)];
}
const REACH = {
drone:(foe) => squareAround(foe,DRONE_REACH),
sentinel:crossAround,
patrol:patrolCells,
};
function foeCells(foe) {
return (REACH[kindOf(foe)] || ((one) => squareAround(one,1)))(foe);
}
function miteCells(mites,hero) {
const own = mites.filter((mite) => mite.hp > 0).map((mite) => mite.path[mite.at]);
return [...own,...dangerCells(mites,hero)];
}
function hazardCells(foes,hero,{ mites = [],calm = false } = {}) {
const hit = foes.filter((foe) => kindOf(foe) !== 'mite' && isDangerous(foe,calm)).flatMap(foeCells);
return new Set([...hit,...miteCells(mites || [],hero)].map(cellKey));
}
function guardPath(plan) {
let cell = plan.from;
for (let index = 0; index < plan.dirs.length; index += 1) {
const next = cellToward(cell,plan.dirs[index]);
if (plan.hazards.has(cellKey(next)) && !plan.hazards.has(cellKey(cell))) return { safe:plan.dirs.slice(0,index),held:true,hazardCell:next };
cell = next;
}
return { safe:plan.dirs,held:false,hazardCell:null };
}
function foeName(kind) {
return NAMES[kind ?? 'drone'] || 'Foe';
}
function foeHint(kind) {
return HINTS[kind ?? 'drone'] || FIGHT_HINT;
}
function isStatic(kind) {
return !MOVING_KINDS.has(kind ?? 'drone');
}
function detour(route) {
const avoid = new Set(route.hazards);
avoid.delete(cellKey(route.to));
const dirs = findPath(route.world,route.progress,{ from:route.from,to:route.to,avoid });
return dirs ? { dirs,extra:Math.max(0,dirs.length - route.base.length) } :null;
}

export { hazardCells, guardPath, foeName, foeHint, detour, isStatic };

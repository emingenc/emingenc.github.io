import { findPath } from './path.js';
import { coreState } from './progress.js';
import { isOpen } from './world.js';
import { lockLabel, sectorName } from './messages.js';

const KERNEL_LABEL = 'KERNEL';
const CORE_SUFFIX = ' CORE';

function cellOf(thing) {
return { col:thing.col,row:thing.row };
}
function stepsTo(ctx,thing) {
const dirs = findPath(ctx.world,ctx.progress,{ from:ctx.from,to:cellOf(thing) });
return dirs === null ? null :dirs.length;
}
function terminalRow(ctx,key) {
const terminal = ctx.world.terminals[key];
const breached = ctx.progress.breached.has(key);
return {
id:terminal.id,kind:'terminal',label:lockLabel(ctx.world,ctx.progress,key),sector:terminal.family,
state:breached ? 'breached' :'open',stars:breached ? ctx.progress.best[key] :null,
place:ctx.world.sectors[terminal.family].keys.indexOf(key),
};
}
function coreRow(ctx,core) {
return {
id:core.id,kind:'core',label:sectorName(ctx.world,core.family) + CORE_SUFFIX,sector:core.family,
state:'ready',stars:null,place:ctx.world.sectors[core.family].keys.length,
};
}
function readyCores(ctx) {
return Object.values(ctx.world.cores).filter((core) => coreState(ctx.world,ctx.progress,core.family) === 'ready');
}
function kernelRows(ctx) {
const door = ctx.world.kernelDoor;
if (!ctx.world.kernel || !door || !isOpen(ctx.world,ctx.progress,door.id)) return [];
return [{ id:ctx.world.kernel.id,kind:'kernel',label:KERNEL_LABEL,sector:null,state:'open',stars:null,place:0 }];
}
function allRows(ctx) {
const terminals = ctx.world.placed.map((key) => terminalRow(ctx,key));
const cores = readyCores(ctx).map((core) => coreRow(ctx,core));
return [...terminals,...cores,...kernelRows(ctx)];
}
function groupRank(row) {
return row.state === 'breached' ? 1 :0;
}
function sectorRank(order,sector) {
return sector === null ? order.length :order.indexOf(sector);
}
function byPlace(order,left,right) {
const byGroup = groupRank(left) - groupRank(right);
if (byGroup !== 0) return byGroup;
const bySector = sectorRank(order,left.sector) - sectorRank(order,right.sector);
return bySector !== 0 ? bySector :left.place - right.place;
}
function reachableRow(ctx,row) {
const steps = stepsTo(ctx,ctx.world.things[row.id]);
return steps === null ? null :{ ...row,steps };
}
function travelTargets(world,progress,from) {
const ctx = { world,progress,from };
const order = Object.keys(world.sectors);
const reached = allRows(ctx).map((row) => reachableRow(ctx,row)).filter((row) => row !== null);
return reached.sort((left,right) => byPlace(order,left,right)).map(({ place,...rest }) => rest);
}

export { travelTargets };

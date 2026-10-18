import { sectorName } from './messages.js';

const KERNEL_KEY = 'kernel';
const KERNEL_NAME = 'KERNEL';
function isDone(row) {
return row.state === 'breached';
}
function keyOf(row) {
return row.sector === null ? KERNEL_KEY :row.sector;
}
function nameOf(world,key) {
return key === KERNEL_KEY ? KERNEL_NAME :sectorName(world,key);
}
function groupOf(world,groups,key) {
if (!groups.has(key)) groups.set(key,{ key,name:nameOf(world,key),todo:[],done:[] });
return groups.get(key);
}
function travelGroups(world,rows,pinId) {
const pinned = rows.find((row) => row.id === pinId) || null;
const groups = new Map();
rows.filter((row) => row !== pinned).forEach((row) => groupOf(world,groups,keyOf(row))[isDone(row) ? 'done' :'todo'].push(row));
return { pinned,groups:[...groups.values()] };
}

export { travelGroups };

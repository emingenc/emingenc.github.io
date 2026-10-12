import { BOLT_RANGE } from '../actors.js';
import { findPath } from '../path.js';
import { cellAt } from '../world.js';

const PAD_STEPS = 4;
const PADS = Object.freeze([
Object.freeze({ id:'pad-home',col:22,row:16 }),
Object.freeze({ id:'pad-hash',col:43,row:14 }),
Object.freeze({ id:'pad-two',col:30,row:12 }),
Object.freeze({ id:'pad-stack',col:12,row:15 }),
]);
const GLIDE_REFUSED = 'RECALL finds no floor there.';

function reach(pad,hero) {
return Math.max(Math.abs(pad.col - hero.col),Math.abs(pad.row - hero.row));
}
function walkable(world,progress,route) {
const path = findPath(world,progress,route);
return path !== null && path.length <= PAD_STEPS;
}
function padById(id) {
return PADS.find((pad) => pad.id === id) || null;
}
function padAt(cell) {
return PADS.find((pad) => pad.col === cell.col && pad.row === cell.row) || null;
}
function padSpots(hero,world,progress) {
return PADS.filter((pad) => reach(pad,hero) <= BOLT_RANGE && walkable(world,progress,{ from:hero,to:pad }));
}
function glideOk(world,cell) {
const entry = cell ? cellAt(world,cell) :null;
return Boolean(entry) && entry.kind === 'floor' && entry.id === null;
}
function taggedLine(id) {
return id.toUpperCase() + ' tagged. RECALL it from anywhere.';
}
function glideLine(id) {
return 'RECALL. You land on ' + id.toUpperCase() + '.';
}

export { GLIDE_REFUSED,PADS,PAD_STEPS,glideLine,glideOk,padAt,padById,padSpots,taggedLine };

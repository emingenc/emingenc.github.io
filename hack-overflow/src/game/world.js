import { gateLevel } from './progress.js';
import { rigOf } from './rig-catalog.js';


const GLYPH_KINDS = { '#':'wall',' ':'void','.':'floor','@':'floor','$':'cache',Y:'kernel-door',Z:'kernel','?':'encrypted' };
const GLYPH_RANGES = [
{ kind:'terminal',pattern:/^[a-x]$/ },
{ kind:'door',pattern:/^[A-X]$/ },
{ kind:'gate',pattern:/^[1-4]$/ },
{ kind:'core',pattern:/^[5-9]$/ },
{ kind:'rig',pattern:/^[&%*+=^~]$/ },
];
const SPAWN_GLYPH = '@';
const KERNEL_DOOR_ID = 'kernel-door';
const KERNEL_ID = 'kernel';
function fail(reason) {
throw new Error('world: ' + reason);
}
function where(spot) {
return spot.col + ',' + spot.row;
}
function cellOf(spot) {
return { col:spot.col,row:spot.row };
}
function kindOf(glyph) {
if (Object.hasOwn(GLYPH_KINDS,glyph)) return GLYPH_KINDS[glyph];
const range = GLYPH_RANGES.find((candidate) => candidate.pattern.test(glyph));
return range ? range.kind :null;
}
function addThingOnce(ctx,thing) {
ctx.world.things[thing.id] ||= thing;
return thing.id;
}
function placeSpawn(ctx,spot) {
if (spot.glyph !== SPAWN_GLYPH) return null;
if (ctx.world.spawn) fail('several spawns (@) at ' + where(ctx.world.spawn) + ' and ' + where(spot));
ctx.world.spawn = cellOf(spot);
return null;
}
function placeTerminal(ctx,spot) {
const key = ctx.legend.terminals[spot.glyph];
if (!key) fail('terminal "' + spot.glyph + '" at ' + where(spot) + ' is unmapped');
if (!Object.hasOwn(ctx.world.problems,key)) fail('terminal "' + spot.glyph + '" points to ' + key + ', not a content problem');
if (ctx.world.terminals[key]) fail(key + ' has more than one terminal ("' + spot.glyph + '" at ' + where(spot) + ')');
const id = 'term-' + key;
const family = ctx.world.problems[key].family;
ctx.world.terminals[key] = { id,key,family,door:null,col:spot.col,row:spot.row };
ctx.world.placed.push(key);
return addThingOnce(ctx,{ id,kind:'terminal',col:spot.col,row:spot.row,key,family });
}
function placeDoor(ctx,spot) {
const glyph = spot.glyph.toLowerCase();
const key = ctx.legend.terminals[glyph];
if (!key) fail('door "' + spot.glyph + '" at ' + where(spot) + ' has no terminal "' + glyph + '"');
const id = 'door-' + key;
ctx.world.doors[key] ||= { id,key,cells:[] };
ctx.world.doors[key].cells.push(cellOf(spot));
ctx.doorSpots[key] ||= spot;
return addThingOnce(ctx,{ id,kind:'door',col:spot.col,row:spot.row,key });
}
function liveFamilyFor(ctx,lookup) {
const family = lookup.table[lookup.spot.glyph];
if (!ctx.legend.live.has(family)) {
fail(lookup.what + ' "' + lookup.spot.glyph + '" at ' + where(lookup.spot) + ' is not mapped to a live family');
}
return family;
}
function placeGate(ctx,spot) {
const family = liveFamilyFor(ctx,{ table:ctx.legend.gates,spot,what:'gate' });
const level = gateLevel(family);
if (level === null) fail('gate "' + spot.glyph + '" at ' + where(spot) + ' leads to ' + family + ', which has no gate level');
const id = 'gate-' + family;
const name = ctx.legend.live.get(family).name;
ctx.world.gates[family] ||= { id,family,name,level,cells:[] };
ctx.world.gates[family].cells.push(cellOf(spot));
return addThingOnce(ctx,{ id,kind:'gate',col:spot.col,row:spot.row,family,name });
}
function placeCore(ctx,spot) {
const family = liveFamilyFor(ctx,{ table:ctx.legend.cores,spot,what:'core' });
if (ctx.world.cores[family]) fail(family + ' has more than one core');
const id = 'core-' + family;
ctx.world.cores[family] = { id,family,col:spot.col,row:spot.row };
return addThingOnce(ctx,{ id,kind:'core',col:spot.col,row:spot.row,family,name:ctx.legend.live.get(family).name });
}
function placeCache(ctx,spot) {
const id = 'cache-' + spot.col + '-' + spot.row;
ctx.world.caches.push(id);
return addThingOnce(ctx,{ id,kind:'cache',col:spot.col,row:spot.row });
}
function placeRigById(ctx,{ rigId,spot,source }) {
const rig = rigOf(rigId);
if (!rig) fail('unknown rig "' + rigId + '" for ' + source + ' at ' + where(spot) + ' (not in the rig catalog)');
if (ctx.world.rigs[rig.id]) fail('duplicate rig "' + rig.id + '" (' + source + ' at ' + where(spot) + ')');
const id = 'rig-' + rig.id;
const thing = { id,kind:'rig',col:spot.col,row:spot.row,rig:rig.id,family:rig.family,name:rig.title };
ctx.world.rigs[rig.id] = thing;
return addThingOnce(ctx,thing);
}
function placeRig(ctx,spot) {
if (!Object.hasOwn(ctx.legend.rigs,spot.glyph)) fail('unknown rig glyph "' + spot.glyph + '" at ' + where(spot) + ' (not in WORLD_RIGS)');
return placeRigById(ctx,{ rigId:ctx.legend.rigs[spot.glyph],spot,source:'"' + spot.glyph + '"' });
}
function placeKernelDoor(ctx,spot) {
ctx.world.kernelDoor ||= { id:KERNEL_DOOR_ID,cells:[] };
ctx.world.kernelDoor.cells.push(cellOf(spot));
return addThingOnce(ctx,{ id:KERNEL_DOOR_ID,kind:'kernel-door',col:spot.col,row:spot.row });
}
function placeKernel(ctx,spot) {
if (ctx.world.kernel) fail('more than one kernel (Z)');
ctx.world.kernel = { id:KERNEL_ID,col:spot.col,row:spot.row };
return addThingOnce(ctx,{ id:KERNEL_ID,kind:'kernel',col:spot.col,row:spot.row });
}
function placeEncrypted(ctx,spot) {
const family = ctx.legend.sealed[ctx.world.encrypted.length];
if (!family) fail('more "?" cells than sealed route families (' + ctx.legend.sealed.length + ')');
const entry = { id:'enc-' + family.key,family:family.key,name:family.name,col:spot.col,row:spot.row };
ctx.world.encrypted.push(entry);
return addThingOnce(ctx,{ ...entry,kind:'encrypted' });
}
const PLACERS = {
floor:placeSpawn,cache:placeCache,terminal:placeTerminal,door:placeDoor,gate:placeGate,core:placeCore,
'kernel-door':placeKernelDoor,kernel:placeKernel,encrypted:placeEncrypted,rig:placeRig,
};
function cellFor(ctx,spot) {
const kind = kindOf(spot.glyph);
if (!kind) fail('unknown glyph "' + spot.glyph + '" at ' + where(spot));
const place = PLACERS[kind];
return { kind,id:place ? place(ctx,spot) :null,glyph:spot.glyph };
}
function placeRigSpot(ctx,spot) {
const entry = cellAt(ctx.world,spot);
if (!entry) fail('rig spot "' + spot.rig + '" at ' + where(spot) + ' is off the map');
if (entry.kind !== 'wall') fail('rig spot "' + spot.rig + '" at ' + where(spot) + ' is not a wall');
const id = placeRigById(ctx,{ rigId:spot.rig,spot,source:'spot' });
ctx.world.cells[spot.row * ctx.world.cols + spot.col] = { kind:'rig',id,glyph:entry.glyph };
}
function placeRigSpots(ctx,spots) {
for (const spot of spots) placeRigSpot(ctx,spot);
}
function checkRows(rows) {
if (!Array.isArray(rows) || rows.length === 0) fail('the map has no rows');
const width = rows[0].length;
const ragged = rows.findIndex((text) => typeof text !== 'string' || text.length !== width);
if (ragged >= 0) fail('ragged rows: row ' + ragged + ' is not ' + width + ' cells wide');
}
function scanRows(ctx,rows) {
rows.forEach((text,row) => {
for (let col = 0; col < text.length; col += 1) ctx.world.cells.push(cellFor(ctx,{ col,row,glyph:text[col] }));
});
}
function pairDoors(ctx) {
for (const [key,spot] of Object.entries(ctx.doorSpots)) {
const terminal = ctx.world.terminals[key];
if (!terminal) fail('door "' + spot.glyph + '" at ' + where(spot) + ' has no terminal "' + spot.glyph.toLowerCase() + '"');
terminal.door = ctx.world.doors[key].id;
ctx.world.things[terminal.door].family = terminal.family;
}
}
function problemsOf(content) {
const problems = {};
for (const problem of content.problems) {
const { key,family,difficulty,number,name,order } = problem;
problems[key] = { key,family,difficulty,number,name,order };
}
return problems;
}
function legendOf(content,data) {
const live = new Map(content.families.map((family) => [family.key,family]));
return {
terminals:data.WORLD_TERMINALS || {},
gates:data.WORLD_GATES || {},
cores:data.WORLD_CORES || {},
rigs:data.WORLD_RIGS || {},
live,
sealed:content.route.filter((family) => !live.has(family.key)),
};
}
function sectorsOf(ctx) {
const sectors = {};
for (const family of ctx.legend.live.values()) {
const keys = family.problems.filter((key) => Object.hasOwn(ctx.world.terminals,key));
sectors[family.key] = { key:family.key,name:family.name,keys };
}
return sectors;
}
function emptyWorld(rows,content) {
return {
cols:rows[0].length,rows:rows.length,spawn:null,cells:[],things:{},terminals:{},doors:{},gates:{},cores:{},
caches:[],kernelDoor:null,kernel:null,encrypted:[],rigs:{},labels:[],placed:[],problems:problemsOf(content),sectors:{},
};
}
function buildWorld(content,data) {
const rows = data.WORLD_MAP;
checkRows(rows);
const world = emptyWorld(rows,content);
const ctx = { world,legend:legendOf(content,data),doorSpots:{} };
scanRows(ctx,rows);
placeRigSpots(ctx,data.WORLD_RIG_SPOTS || []);
if (!world.spawn) fail('no spawn (@)');
pairDoors(ctx);
world.sectors = sectorsOf(ctx);
world.labels = (data.WORLD_LABELS || []).map((label) => ({ text:label.text,col:label.col,row:label.row }));
return world;
}
function cellAt(world,cell) {
const inside = cell.col >= 0 && cell.col < world.cols && cell.row >= 0 && cell.row < world.rows;
return inside ? world.cells[cell.row * world.cols + cell.col] || null :null;
}
function thingAt(world,cell) {
const entry = cellAt(world,cell);
return entry && entry.id ? world.things[entry.id] :null;
}
const WALKABLE = new Set(['floor','cache']);
const OPENERS = {
door:(world,progress,thing) => progress.breached.has(thing.key),
gate:(world,progress,thing) => progress.level >= world.gates[thing.family].level,
'kernel-door':(world,progress) => progress.left === 0,
};
function isOpen(world,progress,id) {
const thing = Object.hasOwn(world.things,id) ? world.things[id] :null;
if (!thing || !Object.hasOwn(OPENERS,thing.kind)) return false;
return OPENERS[thing.kind](world,progress,thing);
}
function isPassable(world,progress,cell) {
const entry = cellAt(world,cell);
if (!entry) return false;
return WALKABLE.has(entry.kind) || (Object.hasOwn(OPENERS,entry.kind) && isOpen(world,progress,entry.id));
}

export { buildWorld, cellAt, thingAt, isOpen, isPassable };

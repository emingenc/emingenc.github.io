import { PATCH_CELL } from '../cast/patch.js';
import { tagsOf } from '../ext/power-ops.js';
import { recallOne } from '../power/recall.js';
import { hasBeat } from '../ext/ops.js';
import { BEATS,flagOf } from './contract.js';

const LAG = 3;
const TICK_MS = 500;
const TRAIL_KEEP = 12;
const RING_REACH = 2;
const PATCH_TAG = 'patch-0';
const SCAN_STEPS = 3;
const KERNEL_DOOR = Object.freeze({ col:24,row:19 });
const KERNEL_FRONT = Object.freeze({ col:24,row:18 });
const PATCH_WHO = 'PATCH';
const ROAD_TOASTS = Object.freeze({
system:'ROOT: 0 writable locks. Rewriting: kernel.',
door:'KERNEL: made it. BIT: look up patch-0.',
found:'LOOKUP patch-0: O(1) get. Found.',
scanned:'BIT: Found it. Three steps. A tag is one.',
});
const REUNION_LINES = Object.freeze([{ who:PATCH_WHO,text:"I approved his helper without reading. Don't be me." }]);
const REUNION_CHOICES = Object.freeze([{ id:'read',label:"YOU DIDN'T READ IT" },{ id:'together',label:'THEN READ WITH ME' }]);
const REPLY_TOASTS = Object.freeze({ read:'PATCH: No. So read with me now.',together:'PATCH: Measure twice.' });
const GATE_TOASTS = Object.freeze({
helped:"BRUTE: YOU COOLED MY FAN. GO. I'LL COUNT THEM.",
unhelped:'BRUTE: NOT FOR YOU. FOR THE COUNT. GO.',
});

function createChase(cell) {
return { trail:[{ col:cell.col,row:cell.row }],gap:LAG };
}
function chaseStep(chase,cell) {
return { ...chase,trail:[...chase.trail,{ col:cell.col,row:cell.row }].slice(-TRAIL_KEEP) };
}
function chaseIdle(chase) {
if (chase.gap > 1) return { chase:{ ...chase,gap:chase.gap - 1 },caught:false };
return { chase:{ ...chase,gap:LAG },caught:true };
}
function frontOf(chase) {
return chase.trail[Math.max(0,chase.trail.length - 1 - chase.gap)];
}
function floodedOf(chase) {
return chase.trail.slice(0,Math.max(0,chase.trail.length - chase.gap));
}
function catcherOf(chase) {
return chase.trail[Math.max(0,chase.trail.length - 2)];
}
function inRing(cell) {
return Math.max(Math.abs(cell.col - KERNEL_DOOR.col),Math.abs(cell.row - KERNEL_DOOR.row)) <= RING_REACH;
}
function createLookup(ext) {
const told = flagOf(ext) !== null && hasBeat(ext,BEATS.m5);
const tagged = Object.hasOwn(tagsOf(ext),PATCH_TAG) || told || flagOf(ext) === 'reviewed';
const block = { id:PATCH_TAG,kind:'drone',col:PATCH_CELL.col,row:PATCH_CELL.row,hp:1,arm:1,awake:false };
return { tagged,steps:tagged ? 1 :SCAN_STEPS,step:0,actors:[block] };
}
function lookupStep(lookup) {
const step = lookup.step + 1;
if (step < lookup.steps) return { lookup:{ ...lookup,step },found:false,text:'BIT: Not in your map. Scan ' + step + ' of ' + lookup.steps + '.' };
const recalled = recallOne(lookup.actors,PATCH_TAG);
return { lookup:{ ...lookup,step,actors:recalled.actors },found:true,text:lookup.tagged ? ROAD_TOASTS.found :ROAD_TOASTS.scanned };
}
function reunionSheet() {
return { id:'road-back',lines:REUNION_LINES.map((line) => ({ ...line })),choices:REUNION_CHOICES.map((choice) => ({ ...choice })) };
}
function bruteGate(ext) {
return ext.npc && ext.npc.bruteHelped === true ? GATE_TOASTS.helped :GATE_TOASTS.unhelped;
}

export {
LAG,TICK_MS,KERNEL_DOOR,KERNEL_FRONT,PATCH_TAG,ROAD_TOASTS,REPLY_TOASTS,GATE_TOASTS,REUNION_LINES,
createChase,chaseStep,chaseIdle,frontOf,floodedOf,catcherOf,inRing,createLookup,lookupStep,reunionSheet,bruteGate,
};

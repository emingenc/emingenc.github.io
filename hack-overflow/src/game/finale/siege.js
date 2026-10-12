import { hasBeat } from '../ext/ops.js';
import { BRUTE_CELL } from '../cast/brute.js';
import { fanDue } from '../cast/brute-fan.js';
import { planFlood } from '../power/flood.js';
import { cellAt } from '../world.js';
import { BEATS } from './contract.js';
import { inRing } from './roadback.js';

const WHO = 'BRUTE';
const SIEGE_ID = 'brute-siege';
const COUNTER_KEY = 'brute-counter';
const WALKABLE = new Set(['floor','cache']);
const FAN_MARK = '!';
const FAN_PILL = 'BRUTE . fan';
const SIEGE_SPEC = Object.freeze({
waves:2,perWave:4,bitEveryMs:1200,waveEveryMs:8000,stepMs:600,hold:2,reward:20,source:'siege-held',beat:'siege-1',
});
const SIEGE_LINES = Object.freeze(['ROOT IS ON MY COUNTER. THE CHECKS SLIP.','SHOOT THE BITS. LET TWO THROUGH AT MOST.']);
const SIEGE_CHOICES = Object.freeze([{ id:'hold',label:'HOLD THE COUNTER' },{ id:'later',label:'NOT NOW',default:true }]);
const SIEGE_TOASTS = Object.freeze({
start:'BRUTE: HERE THEY COME. SHOOT THEM.',
wave:'ROOT: another wave for his counter.',
held:'Counter held. ROOT lost the write. +20 R.',
scribbled:'ROOT scribbled over his counter. No cost. Try again.',
standDown:'Stood down. ROOT backs off.',
});
const SIEGE_HELD_TOASTS = Object.freeze({
helped:"BRUTE: YOU COOLED MY FAN. I'LL COUNT THEM.",
unhelped:'BRUTE: NOT FOR YOU. FOR THE COUNT.',
});

function ended(save) {
return Boolean(save) && save.ended === true;
}
function siegeOn(ext,save) {
return hasBeat(ext,BEATS.m5) && !hasBeat(ext,BEATS.roadback) && !ended(save);
}
function counterVeiled(ext,save) {
return siegeOn(ext,save) && !hasBeat(ext,SIEGE_SPEC.beat);
}
function siegeOffered(ext,save) {
return counterVeiled(ext,save);
}
function ringCells(world) {
const all = Array.from({ length:world.rows * world.cols },(_,at) => ({ col:at % world.cols,row:Math.floor(at / world.cols) }));
return all.filter((cell) => inRing(cell) && WALKABLE.has(cellAt(world,cell).kind));
}
function siegePlan(world) {
return planFlood({ ...world,terminals:{ [COUNTER_KEY]:BRUTE_CELL } },COUNTER_KEY);
}
function siegeBits() {
return SIEGE_SPEC.waves * SIEGE_SPEC.perWave;
}
function siegeSpawnAt(index) {
return Math.floor(index / SIEGE_SPEC.perWave) * SIEGE_SPEC.waveEveryMs + (index % SIEGE_SPEC.perWave) * SIEGE_SPEC.bitEveryMs;
}
function siegeVerdict(rewrites) {
const held = rewrites <= SIEGE_SPEC.hold;
return { held,reward:held ? SIEGE_SPEC.reward :0,source:held ? SIEGE_SPEC.source :null };
}
function siegeHeldLine(ext) {
return ext.npc && ext.npc.bruteHelped === true ? SIEGE_HELD_TOASTS.helped :SIEGE_HELD_TOASTS.unhelped;
}
function siegeSheet() {
return { id:SIEGE_ID,lines:SIEGE_LINES.map((text) => ({ who:WHO,text })),choices:SIEGE_CHOICES.map((choice) => ({ ...choice })) };
}
function fanMark(ext) {
return fanDue(ext) ? FAN_MARK :null;
}
function fanPill(ext,save) {
return fanDue(ext) && !ended(save) ? FAN_PILL :null;
}

function helpMark(ext,save) {
return fanMark(ext) || (siegeOffered(ext,save) ? FAN_MARK :null);
}

export {
SIEGE_SPEC,SIEGE_LINES,SIEGE_CHOICES,SIEGE_TOASTS,SIEGE_HELD_TOASTS,
siegeOn,counterVeiled,siegeOffered,ringCells,siegePlan,siegeBits,siegeSpawnAt,siegeVerdict,siegeHeldLine,siegeSheet,fanMark,fanPill,helpMark,
};

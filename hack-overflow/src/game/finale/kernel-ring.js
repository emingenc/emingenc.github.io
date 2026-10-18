import { HALVE } from './halve.js';
import { KERNEL_DOOR } from './roadback.js';
import { createPhase,solvePhase1Line } from './kernel.js';
import { nextAuto } from './kernel-auto.js';
import { createDequePhase,createLoopPhase,finalePar } from './root-fusions.js';

const PHASE_COUNT = 5;
const SHIELD_PHASE = 2;
const HALVE_PHASE = 3;
const LOOP_PHASE = 4;
const SHIELD_LIMIT = 60;
const TINT_MAX = 0.28;
const FULL_TURN = Math.PI * 2;
const TOP_LEFT_ANGLE = Math.atan2(-1,-1);
const ANGLE_DIGITS = 9;
const DECIMAL_BASE = 10;
const ANGLE_SCALE = DECIMAL_BASE ** ANGLE_DIGITS;
const pars = new Map();

function solvePhase2Line() {
let phase = createPhase(SHIELD_PHASE);
let presses = 0;
while (!phase.done && presses < SHIELD_LIMIT) {
phase = nextAuto(phase).play(phase).phase;
presses += 1;
}
return { presses,ops:phase.ops };
}
function lineOf(number) {
if (number === 1) {
const line = solvePhase1Line(createPhase(1));
return { presses:line.taps,ops:line.phase.ops };
}
if (number === SHIELD_PHASE) return solvePhase2Line();
const par = number === HALVE_PHASE ? HALVE.budget :finalePar((number === LOOP_PHASE ? createLoopPhase :createDequePhase)());
return { presses:par,ops:par };
}
function parLine(number) {
if (!pars.has(number)) pars.set(number,lineOf(number));
return pars.get(number);
}
const realPhase = (number) => Number.isInteger(number) && number >= 1 && number <= PHASE_COUNT;
function phasePar(number) {
return realPhase(number) ? parLine(number).presses :0;
}
function phaseParOps(number) {
return realPhase(number) ? parLine(number).ops :0;
}
function goodOf(good) {
return Number.isFinite(good) ? Math.max(0,good) :0;
}
function ringProgress(number,good) {
const par = phasePar(number);
return par > 0 ? Math.min(1,goodOf(good) / par) :0;
}
function turnOf(cell) {
const angle = Math.atan2(cell.row - KERNEL_DOOR.row,cell.col - KERNEL_DOOR.col) - TOP_LEFT_ANGLE;
const turn = Math.round(angle * ANGLE_SCALE) / ANGLE_SCALE;
return turn < 0 ? turn + FULL_TURN :turn;
}
const reach = (cell) => Math.max(Math.abs(cell.col - KERNEL_DOOR.col),Math.abs(cell.row - KERNEL_DOOR.row));
function clockwise(first,second) {
return turnOf(first) - turnOf(second) || reach(second) - reach(first) || first.row - second.row || first.col - second.col;
}
function ringOrder(cells) {
return [...cells].sort(clockwise);
}
function deletedIn(share,number,good) {
return Math.min(Math.floor(ringProgress(number,good) * share),Math.floor(goodOf(good)));
}
function ringAlive(cells,number,good) {
const ordered = ringOrder(cells);
const total = ordered.length;
const edge = (k) => Math.floor(k * total / PHASE_COUNT);
const mine = Math.min(Math.max(number,1),PHASE_COUNT + 1);
const start = edge(mine - 1);
const gone = number > PHASE_COUNT ? total :start + deletedIn(edge(mine) - start,number,good);
return number < 1 ? ordered :ordered.slice(gone);
}
function tintAlpha(number,good) {
if (number < 1) return TINT_MAX;
if (number > PHASE_COUNT) return 0;
return TINT_MAX * (1 - (number - 1 + ringProgress(number,good)) / PHASE_COUNT);
}

export { TINT_MAX,phasePar,phaseParOps,ringAlive,ringOrder,ringProgress,tintAlpha };

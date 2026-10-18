import { lookupStep } from './roadback.js';

const SCAN_STEP_MS = 500;
const DRAIN_RATE = 2;
const HOLD_LABEL = 'HOLD TO SCAN';
const SCAN_TOASTS = Object.freeze({ start:'BIT: Scanning. Keep holding.' });

function scanTotalMs(lookup) {
return lookup.steps * SCAN_STEP_MS;
}
function createScan(lookup) {
return { steps:lookup.steps,tagged:lookup.tagged,total:scanTotalMs(lookup),progress:0 };
}
function scanDone(scan) {
return scan.progress >= scan.total;
}
function scanTick(scan,dtMs,holding) {
if (scanDone(scan)) return scan;
const next = holding ? scan.progress + dtMs :scan.progress - dtMs * DRAIN_RATE;
return { ...scan,progress:Math.min(scan.total,Math.max(0,next)) };
}
function scanFraction(scan) {
return scan.progress / scan.total;
}
function scanStepNow(scan) {
return Math.min(scan.steps,Math.floor(scan.progress / SCAN_STEP_MS) + 1);
}
function scanLabel(scan) {
if (scan.tagged) return 'RECALL patch-0';
return scan.progress > 0 ? 'SCAN ' + scanStepNow(scan) + '/' + scan.steps :HOLD_LABEL;
}
function scanResolve(lookup) {
const step = lookupStep(lookup);
return step.found ? { lookup:step.lookup,text:step.text } :scanResolve(step.lookup);
}
function ringDistance(cell,hero) {
return Math.max(Math.abs(cell.col - hero.col),Math.abs(cell.row - hero.row));
}
function farthestFirst(hero) {
return (one,two) => ringDistance(two,hero) - ringDistance(one,hero) || one.row - two.row || one.col - two.col;
}
function scanFlooded(cells,hero,fraction) {
if (fraction <= 0) return [];
return [...cells].sort(farthestFirst(hero)).slice(0,Math.ceil(fraction * cells.length));
}

export { SCAN_STEP_MS,DRAIN_RATE,SCAN_TOASTS,scanTotalMs,createScan,scanTick,scanFraction,scanStepNow,scanDone,scanLabel,scanResolve,scanFlooded };

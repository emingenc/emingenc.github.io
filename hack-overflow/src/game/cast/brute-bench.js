import { hasBeat } from '../ext/ops.js';
import { BEATS } from '../finale/contract.js';
import { COUNTERSIGN_TALK } from './countersign.js';

const BENCH_CELL = Object.freeze({ col:30,row:17 });
const BENCH_ID = 'brute-bench';
const BENCH_TOASTS = Object.freeze({
cooled:'BRUTE: COLD FAN. GOOD CHECKS.',
hot:'BRUTE: HOT FAN. I CHECK ANYWAY.',
});
const benchTalks = [COUNTERSIGN_TALK];

function benchDue(ext) {
return hasBeat(ext,'m2') && !hasBeat(ext,BEATS.fan);
}
function benchProps(ext) {
return hasBeat(ext,'m2') ? [{ id:BENCH_ID,...BENCH_CELL }] :[];
}
function benchMark(ext) {
return hasBeat(ext,'m2') ? { kind:'fan',...BENCH_CELL,due:benchDue(ext) } :null;
}
function benchPlan(ext,talks = benchTalks) {
if (benchDue(ext)) return { kind:'fan' };
const talk = talks.find((row) => row.due(ext));
if (talk) return { kind:'talk',id:talk.id };
return { kind:'idle',text:ext.npc && ext.npc.bruteHelped ? BENCH_TOASTS.cooled :BENCH_TOASTS.hot };
}

export { BENCH_CELL,BENCH_ID,BENCH_TOASTS,benchTalks,benchDue,benchProps,benchMark,benchPlan };

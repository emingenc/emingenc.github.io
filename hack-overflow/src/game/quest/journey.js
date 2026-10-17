import { hasBeat } from '../ext/ops.js';
import { BEATS } from '../finale/contract.js';
import { ROOM_SECTOR,nextBeats } from './milestones.js';

const THRESHOLD = 'threshold';
const FIRST_LOCK = 'lc217';
const TOASTS = Object.freeze({
first:'lc217: REVIEWED. Write-protected.',
lock:'Lock REVIEWED. Write-protected.',
room:'Room cleared. Ground taken.',
});
const MILESTONE_LINES = Object.freeze({
m1:Object.freeze(['BIT: The map is filling in. Keep going.','PATCH: Good commit. Read before you merge.']),
m2:Object.freeze(['PATCH: Right is not the same as reviewed.','BIT: ROOT sees you now.']),
m4:Object.freeze(['BIT: BRUTE is yelling at his bench.','BIT: His fan is smoking. Go and see.']),
m5:Object.freeze(['BIT: That PATCH commit is still in the ROOT log!','BIT: I tagged it. patch-0. Keep it safe.']),
});
const M4_ANSWERED = Object.freeze(['BIT: BRUTE is quiet now. ROOT is not.','BIT: Keep your hearts up.']);
const SAFEHOUSE = Object.freeze({ minCol:17,maxCol:31,minRow:14,maxRow:21 });
const NOTHING = Object.freeze({ write:false,text:null });

function inSafehouse(cell) {
return cell.col >= SAFEHOUSE.minCol && cell.col <= SAFEHOUSE.maxCol && cell.row >= SAFEHOUSE.minRow && cell.row <= SAFEHOUSE.maxRow;
}
function lockText(lock) {
return lock === FIRST_LOCK ? TOASTS.first :TOASTS.lock;
}
function journeyFacts(world,progress) {
const sectors = Object.entries(world.sectors || {});
return {
roomsWon:[...progress.won].filter((room) => Object.hasOwn(ROOM_SECTOR,room)),
solved:[...progress.breached],
cores:[...progress.cores],
lockIdsBySector:Object.fromEntries(sectors.map(([sector,data]) => [sector,data.keys])),
};
}
function thresholdPlan(facts,before,seen) {
if (seen.includes(THRESHOLD) || (facts.solved.length === 0 && facts.roomsWon.length === 0)) return NOTHING;
const base = before || facts;
const lock = facts.solved.find((key) => !base.solved.includes(key));
if (lock) return { write:true,text:lockText(lock) };
return { write:true,text:facts.roomsWon.some((room) => !base.roomsWon.includes(room)) ? TOASTS.room :null };
}
function m4Lines(ext) {
return hasBeat(ext,BEATS.fan) ? M4_ANSWERED :MILESTONE_LINES.m4;
}
function milestoneDue(facts,seen) {
return nextBeats(facts,[...seen,THRESHOLD],true).find((id) => Object.hasOwn(MILESTONE_LINES,id)) || null;
}

export { THRESHOLD,FIRST_LOCK,TOASTS,MILESTONE_LINES,M4_ANSWERED,SAFEHOUSE,inSafehouse,journeyFacts,thresholdPlan,milestoneDue,m4Lines };

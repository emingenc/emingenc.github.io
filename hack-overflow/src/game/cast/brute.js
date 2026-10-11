import { hasMet } from '../ext/ops.js';
import { RACE_SOURCE } from '../rooms/data/turret-race.js';

const BRUTE_CELL = Object.freeze({ col:47,row:16 });
const MEET_ID = 'brute';
const BARK_RANGE = 3;
const WHO = 'BRUTE';
const BARK = 'BRUTE: WHY THINK? CHECK THEM ALL.';
const ASK = 'RACE ME AT THE TURRET. EACH WRONG MOVE COSTS YOU 3 SECONDS.';
const CHOICES = Object.freeze({
offer:Object.freeze([{ id:'race',label:'RACE' },{ id:'later',label:'NOT NOW',default:true }]),
armed:Object.freeze([{ id:'keep',label:'KEEP RACE',default:true },{ id:'off',label:'STAND DOWN' }]),
});
const LINES = Object.freeze({
offer:Object.freeze(['WHY THINK? CHECK THEM ALL.',ASK]),
again:Object.freeze(['REMEMBERED. HM. I NEVER REMEMBER. I CHECK AGAIN.','AGAIN? ONLY THE STAMP THIS TIME.']),
armed:Object.freeze(['THE TURRET. I START WHEN YOU DO.']),
});
const TOASTS = Object.freeze({
armed:'BRUTE: TURRET. I START WHEN YOU DO.',
off:'BRUTE: FINE. I CHECK ALONE.',
});
const OVERRUN_LINE = 'BRUTE: YOU NEVER FINISHED.';
const MARKS = Object.freeze({ offer:'...',again:'...',armed:'GO' });

function sameCell(one,other) {
return one.col === other.col && one.row === other.row;
}
function isPaid(ext) {
return Boolean(ext.rank) && Array.isArray(ext.rank.paid) && ext.rank.paid.includes(RACE_SOURCE);
}
function inBarkRange(hero) {
return Math.max(Math.abs(hero.col - BRUTE_CELL.col),Math.abs(hero.row - BRUTE_CELL.row)) <= BARK_RANGE;
}
function brutePlan(ext,armed) {
const met = hasMet(ext,MEET_ID);
if (armed) return { kind:'armed',met };
return { kind:isPaid(ext) ? 'again' :'offer',met };
}
function talkSheet(plan) {
const choices = plan.kind === 'armed' ? CHOICES.armed :CHOICES.offer;
return { id:'brute-race',lines:LINES[plan.kind].map((text) => ({ who:WHO,text })),choices:choices.map((choice) => ({ ...choice })) };
}
function markOf(ext,armed) {
return MARKS[brutePlan(ext,armed).kind];
}
function raceLine(verdict,total) {
if (verdict.winner === 'you') return 'BRUTE: ...HOW. I WAS ON CHECK ' + verdict.checks + '.';
return 'BRUTE: ALL ' + total + ' CHECKS DONE FIRST.';
}

export { BRUTE_CELL,MEET_ID,BARK,OVERRUN_LINE,TOASTS,LINES,CHOICES,sameCell,inBarkRange,brutePlan,talkSheet,markOf,raceLine };

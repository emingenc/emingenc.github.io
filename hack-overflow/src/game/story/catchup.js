import { hasBeat } from '../ext/ops.js';
import { BEATS } from '../finale/contract.js';
import { milestoneDue } from '../quest/journey.js';

const CARD_MAX_LINES = 3;
const CARD_READ_MS = 6000;
const MS_PER_CHAR = 40;
const CARD_SPEAKER = 'BIT: ';
const CARD_PARTS = Object.freeze({
m1:'The map fills in.',
m2:'ROOT sees you.',
m4:'BRUTE yells, his fan smokes.',
m5:'Tagged PATCH commit: patch-0.',
});
const M4_ANSWERED_PART = 'BRUTE is quiet. ROOT is not.';
const TAIL_AT = 18;
const TAIL_BEAT = 'tail-18';
const TAIL_TEXT = 'GHOSTWRITER: Eighteen locks. Someone is keeping score.';
const TAIL_END = 24;
const NOTHING = Object.freeze({ write:false,text:null });

function owedMilestones(facts,seen) {
const owed = [];
for (let id = milestoneDue(facts,seen); id; id = milestoneDue(facts,[...seen,...owed])) owed.push(id);
return owed;
}
function readMs(lines) {
return Math.min(CARD_READ_MS,lines.join('').length * MS_PER_CHAR);
}
function groupsOf(parts) {
const first = Math.ceil(parts.length / 2);
return [parts.slice(0,first),parts.slice(first)].filter((group) => group.length > 0);
}
function cardLines(ids,ext) {
const answered = Boolean(ext) && hasBeat(ext,BEATS.fan);
const parts = ids.map((id) => (id === 'm4' && answered ? M4_ANSWERED_PART :CARD_PARTS[id]));
return groupsOf(parts).map((group) => CARD_SPEAKER + group.join(' '));
}
function tailPlan(solved,before,seen) {
if (solved < TAIL_AT || seen.includes(TAIL_BEAT)) return NOTHING;
const crossed = before !== null && before < TAIL_AT && solved < TAIL_END;
return { write:true,text:crossed ? TAIL_TEXT :null };
}

export { CARD_MAX_LINES,CARD_READ_MS,TAIL_AT,TAIL_BEAT,TAIL_TEXT,owedMilestones,cardLines,readMs,tailPlan };

import { hasBeat,questState } from '../ext/ops.js';
import { BEATS } from '../finale/contract.js';
import { STAGE } from '../quest/quests.js';

const QUEST_ID = 'countersign';
const WHO = 'BRUTE';
const SHEET_ID = 'brute-countersign';
const CODES = 2000;
const SHEET_LINES = Object.freeze(['TWO THOUSAND CODES. FOUR MILLION PAIR CHECKS?']);
const CHOICES = Object.freeze([
Object.freeze({ id:'yes',label:'YES' }),Object.freeze({ id:'no',label:'NO' }),Object.freeze({ id:'later',label:'NOT NOW',default:true }),
]);
const TEXT = Object.freeze({
wrong:'BRUTE: HM. 2000 TIMES 1999, HALVED. TRY AGAIN.',
right:Object.freeze(['BRUTE: ABOUT TWO MILLION PAIRS.','BRUTE: YOU WOULD DO 2000. I DO TWO MILLION.']),
});

function asking(ext) {
return hasBeat(ext,BEATS.fan) && questState(ext,QUEST_ID) !== STAGE.done;
}
const COUNTERSIGN_TALK = Object.freeze({ id:QUEST_ID,due:asking });
function countersignPlan(ext) {
return asking(ext) ? { kind:'ask' } :{ kind:'none' };
}
function countersignSheet() {
return { id:SHEET_ID,lines:SHEET_LINES.map((text) => ({ who:WHO,text })),choices:CHOICES.map((choice) => ({ ...choice })) };
}
function countersignAnswer(pick) {
if (pick === 'no') return { kind:'progress',lines:[...TEXT.right] };
if (pick === 'yes') return { kind:'slip',lines:[TEXT.wrong] };
return { kind:'none',lines:[] };
}

export { CODES,COUNTERSIGN_TALK,QUEST_ID,SHEET_ID,TEXT,countersignAnswer,countersignPlan,countersignSheet };

import { hasMet,questState } from '../ext/ops.js';
import { STAGE } from '../quest/quests.js';
import { FIND,holdsReceipt } from './fork.js';

const TALLY_CELL = Object.freeze({ col:40,row:14 });
const MEET_ID = 'tally';
const RUN_ID = 'receipt-run';
const THANKS_SOURCE = 'receipt-find';
const THANKS_RANK = 5;
const TALLY_WHO = 'TALLY';
const WELCOME = 'Welcome! Nothing stored is ever lost.';
const OFFER = 'Lost receipt #4470. Pairs? Rescans? I pay rank.';
const OFFER_CHOICES = Object.freeze([{ id:'take',label:'TAKE THE RUN' },{ id:'later',label:'NOT NOW',default:true }]);
const TOASTS = Object.freeze({
thanks:'TALLY: That is my receipt. Thank you. +5 R',
taken:'TALLY: Every pair, one pass. Clear the turret.',
waiting:'TALLY: Clear the turret. I pay rank.',
done:'TALLY: All stored. Thank you.',
});

function isPaid(ext,source) {
return Boolean(ext.rank) && Array.isArray(ext.rank.paid) && ext.rank.paid.includes(source);
}
function tallyPlan(ext) {
const met = hasMet(ext,MEET_ID);
if (holdsReceipt(ext) && !isPaid(ext,THANKS_SOURCE)) return { kind:'thanks',met };
const stage = questState(ext,RUN_ID);
if (stage === STAGE.done) return { kind:'done',met };
return { kind:stage === STAGE.active ? 'waiting' :'offer',met };
}
function offerSheet(met) {
const lines = [...(met ? [] :[WELCOME]),OFFER].map((text) => ({ who:TALLY_WHO,text }));
return { id:'tally-run',lines,choices:OFFER_CHOICES.map((choice) => ({ ...choice })) };
}

export { TALLY_CELL,MEET_ID,RUN_ID,THANKS_SOURCE,THANKS_RANK,TOASTS,FIND,tallyPlan,offerSheet };

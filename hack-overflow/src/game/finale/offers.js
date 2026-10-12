import { THE_8 } from '../cast/fork.js';
import { LIMITS } from '../ext/index.js';
import { bumpGhost } from '../ext/ops.js';
import { BRIDGE } from '../power/bridge.js';
import { VOLLEYS } from '../power/volley.js';
import { hintText,offerIndex,offerIsWrong,offerShowsWork } from './contract.js';

const WHO = 'GHOSTWRITER';
const AMBUSH_SLOTS = 3;
const OFFER_TRUTHS = Object.freeze({
ambush:Object.freeze({ value:AMBUSH_SLOTS,from:LIMITS.tags,minus:LIMITS.tags - AMBUSH_SLOTS }),
bridge:slotTruth(BRIDGE.plates.length,rightSlot(BRIDGE)),
volley:slotTruth(VOLLEYS[0].length,1),
fork:Object.freeze({ value:THE_8.pick,from:THE_8.sum,minus:THE_8.partner,off:THE_8.numbers.find((num) => num !== THE_8.pick && num !== THE_8.partner) }),
});
const OFFER_LEADS = Object.freeze({
ambush:'Tag it.',phase:'Read it.',bridge:'Right pointer.',volley:'First bracket.',fork:'Sum ' + THE_8.sum + '. Pick the two.',
});
const NUMBER_KINDS = Object.freeze(['fork']);
const OFFER_CHOICES = Object.freeze([{ id:'trust',label:'TRUST' },{ id:'verify',label:'VERIFY' }]);
const OFFER_TOASTS = Object.freeze({
told:'Told you. Unreviewed.',
empty:'BIT: Empty! You checked.',
right:'He was right. This time.',
same:'BIT: Checked. Same answer.',
});
const VERIFY_RANK = 5;

function slotTruth(size,value) {
return Object.freeze({ value,from:size,minus:size - value });
}
function rightSlot(puzzle) {
let [left,right] = [0,puzzle.plates.length - 1];
while (left < right && puzzle.plates[left] + puzzle.plates[right] !== puzzle.target) {
if (puzzle.plates[left] + puzzle.plates[right] < puzzle.target) left += 1;
else right -= 1;
}
return right + 1;
}
function numberHint(ext,truth) {
if (offerShowsWork(ext)) return truth.from + ' - ' + truth.minus + ' = ' + truth.value + ': take the ' + truth.value;
return 'Take the ' + (offerIsWrong(ext) ? truth.off :truth.value);
}
function claimOf(ext,kind,truth) {
return NUMBER_KINDS.includes(kind) ? numberHint(ext,truth) :hintText(ext,truth);
}
function offerSheet(ext,spec) {
const truth = spec.truth || OFFER_TRUTHS[spec.kind];
const lead = OFFER_LEADS[spec.kind] || OFFER_LEADS.phase;
return {
id:'ghost-offer',
lines:[{ who:WHO,text:lead + ' ' + claimOf(ext,spec.kind,truth) + '. Trust me.' }],
choices:OFFER_CHOICES.map((choice) => ({ ...choice })),
};
}
function offerEffect(ext,pick) {
const wrong = offerIsWrong(ext);
if (pick === 'trust') return { wrong,hearts:wrong ? 1 :0,rank:0,toast:wrong ? OFFER_TOASTS.told :OFFER_TOASTS.right,source:null };
return { wrong,hearts:0,rank:wrong ? VERIFY_RANK :0,toast:wrong ? OFFER_TOASTS.empty :OFFER_TOASTS.same,source:wrong ? 'verify-' + offerIndex(ext) :null };
}
function answerOffer(ext,pick) {
const wrongTrust = pick === 'trust' && offerIsWrong(ext);
const counted = bumpGhost(bumpGhost(ext,'offered'),pick === 'trust' ? 'trusted' :'verified');
return wrongTrust ? bumpGhost(counted,'trustedWrong') :counted;
}

export { OFFER_TRUTHS,OFFER_TOASTS,VERIFY_RANK,offerSheet,offerEffect,answerOffer };

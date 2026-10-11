import { LIMITS } from '../ext/index.js';
import { bumpGhost } from '../ext/ops.js';
import { hintText,offerIndex,offerIsWrong } from './contract.js';

const WHO = 'GHOSTWRITER';
const AMBUSH_SLOTS = 3;
const OFFER_TRUTHS = Object.freeze({ ambush:Object.freeze({ value:AMBUSH_SLOTS,from:LIMITS.tags,minus:LIMITS.tags - AMBUSH_SLOTS }) });
const OFFER_LEADS = Object.freeze({ ambush:'Tag it.',phase:'Read it.' });
const OFFER_CHOICES = Object.freeze([{ id:'trust',label:'TRUST' },{ id:'verify',label:'VERIFY' }]);
const OFFER_TOASTS = Object.freeze({
told:'Told you. Unreviewed.',
empty:'BIT: Empty! You checked.',
right:'He was right. This time.',
same:'BIT: Checked. Same answer.',
});
const VERIFY_RANK = 5;

function offerSheet(ext,spec) {
const truth = spec.truth || OFFER_TRUTHS[spec.kind];
const lead = OFFER_LEADS[spec.kind] || OFFER_LEADS.phase;
return {
id:'ghost-offer',
lines:[{ who:WHO,text:lead + ' ' + hintText(ext,truth) + '. Trust me.' }],
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

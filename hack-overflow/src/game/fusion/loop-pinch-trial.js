import { hasBeat,hasFind,withFind } from '../ext/ops.js';
import { DRAWER_FIND,refactorLit } from '../finale/refactor.js';
import { ownedPowers } from '../power/powers.js';
import { LOOP_PINCH,bruteChecks,loopPinchPar,loopPinchSum } from './loop-pinch.js';

const LIT_BEAT = 'loop-pinch';
const CLEAR_FIND = 'loop-pinch';
const RANK_SOURCE = 'loop-pinch';
const RANK_PAID = 20;
const OFFER_ID = 'loop-pinch-offer';
const LIT_LINES = Object.freeze(['BIT: LOOP-PINCH is lit. BOLT and PINCER, composed.',"BIT: ADVANCE i, then pinch j and k. Try it on PATCH's bench."]);
const OFFER_LINES = Object.freeze([
{ who:'BIT',text:'Sorted row. Anchor i, then the pincer for j and k. Find every triple that adds to 0.' },
{ who:'BIT',text:'ADVANCE i moves the anchor once the pincer has met. A repeated i finds the same triples twice: skip it.' },
]);

function ended(save) {
return Boolean(save) && save.ended === true;
}
function loopPinchOpen(usable) {
return usable.includes('pincer');
}
function loopPinchLit(won,ext) {
return refactorLit(won,ext) && hasFind(ext,DRAWER_FIND) && loopPinchOpen(ownedPowers(won));
}
function loopPinchDue(won,ext,save) {
return loopPinchLit(won,ext) && !hasBeat(ext,LIT_BEAT) && !ended(save);
}
function trialReady(won,ext,save) {
return loopPinchLit(won,ext) && hasBeat(ext,LIT_BEAT) && !hasFind(ext,CLEAR_FIND) && !ended(save);
}
function trialClear(ext) {
return withFind(ext,CLEAR_FIND);
}
function trialOutcome(run) {
if (run.status !== 'won') return null;
const par = loopPinchPar();
const atPar = run.moves <= par && run.wrong === 0;
const mine = run.moves + ' presses, ' + run.wrong + ' wrong. Par ' + par + '.';
const brute = 'BRUTE: ' + bruteChecks() + ' triples checked. You pressed ' + run.moves + '.';
return { rank:RANK_PAID,source:RANK_SOURCE,atPar,lines:[atPar ? 'BIT: At par. ' + mine :'BIT: ' + mine,brute] };
}
const SEPARATOR = ' . ';
const MOVE_CHIPS = Object.freeze([
{ move:'advance',label:'ADVANCE i',aria:'Advance i to the next value' },
{ move:'l',label:'L>',aria:'Move the left pointer right' },
{ move:'fire',label:'FIRE',aria:'Fire, record this triple' },
{ move:'r',label:'<R',aria:'Move the right pointer left' },
]);
function trialView(run) {
const { nums } = LOOP_PINCH;
const open = run.l < run.r;
const ask = open ? ['i ' + nums[run.i],'L ' + nums[run.l],'R ' + nums[run.r],'SUM ' + loopPinchSum(run)] :['i ' + nums[run.i],'ADVANCE i'];
return {
n:0,head:'LOOP-PINCH',count:'PRESS ' + run.moves + SEPARATOR + 'PAR ' + loopPinchPar(),ask:ask.join(SEPARATOR),
tele:run.found.length > 0 ? 'FOUND ' + run.found.map((triple) => triple.join(' ')).join(' | ') :'FOUND none yet',note:'',fiction:'',
chips:MOVE_CHIPS.map((one) => ({ id:'move-' + one.move,label:one.label,aria:one.aria,move:one.move })),
};
}

export { LIT_BEAT,CLEAR_FIND,RANK_SOURCE,RANK_PAID,OFFER_ID,LIT_LINES,OFFER_LINES,loopPinchOpen,loopPinchLit,loopPinchDue,trialReady,trialClear,trialOutcome,trialView };

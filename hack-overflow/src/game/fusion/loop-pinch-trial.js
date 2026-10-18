import { LOOP_PINCH,bruteChecks,loopPinchPar,loopPinchSum } from './loop-pinch.js';
import { SEPARATOR,chipsOf,trialKit,viewOf } from './trial-kit.js';

const LIT_BEAT = 'loop-pinch';
const CLEAR_FIND = 'loop-pinch';
const RANK_SOURCE = 'loop-pinch';
const RANK_PAID = 20;
const OFFER_ID = 'loop-pinch-offer';
const LIT_LINES = Object.freeze(['BIT: LOOP-PINCH is lit. BOLT and PINCER, composed.','BIT: ADVANCE i, then pinch j and k. Step on the glowing tile on the floor.']);
const OFFER_LINES = Object.freeze([
{ who:'BIT',text:'Sorted row. Anchor i, then the pincer for j and k. Find every triple that adds to 0.' },
{ who:'BIT',text:'ADVANCE i moves the anchor once the pincer has met. A repeated i finds the same triples twice: skip it.' },
]);
const MISTAKE_NAMES = Object.freeze({
'wrong-left':'Moved L the wrong way','wrong-right':'Moved R the wrong way','early-fire':'FIRE off target',
'early-advance':'ADVANCE before the pincer met','pincer-met':'Moved after the pincer met','dup-i':'Pinched on a repeated i',
});

function loopPinchOpen(usable) {
return usable.includes('pincer');
}
const kit = trialKit({
open:loopPinchOpen,beat:LIT_BEAT,find:CLEAR_FIND,source:RANK_SOURCE,rank:RANK_PAID,par:loopPinchPar,
brute:(run) => 'BRUTE: ' + bruteChecks() + ' triples checked. You pressed ' + run.moves + '.',
});
const { lit:loopPinchLit,due:loopPinchDue,ready:trialReady,open:machineOpen,clear:trialClear,outcome:trialOutcome } = kit;
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
return viewOf({
head:'LOOP-PINCH',presses:run.moves,par:loopPinchPar(),ask:ask.join(SEPARATOR),
tele:run.found.length > 0 ? 'FOUND ' + run.found.map((triple) => triple.join(' ')).join(' | ') :'FOUND none yet',chips:chipsOf(MOVE_CHIPS),
});
}

export { LIT_BEAT,CLEAR_FIND,RANK_SOURCE,RANK_PAID,OFFER_ID,LIT_LINES,OFFER_LINES,MISTAKE_NAMES,loopPinchOpen,loopPinchLit,loopPinchDue,trialReady,machineOpen,trialClear,trialOutcome,trialView };

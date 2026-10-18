import { chainSteps,hasBadge,withBadge,withChainStep,withCosmetic } from '../ext/badge-ops.js';
import { hasBeat } from '../ext/ops.js';
import { BEATS } from '../finale/contract.js';
import * as brace from './chain-puzzles/brace.js';
import * as oracle from './chain-puzzles/oracle.js';
import * as sill from './chain-puzzles/sill.js';
import * as tally from './chain-puzzles/tally.js';
import * as twins from './chain-puzzles/twins.js';

const CASE_BIT = Object.freeze({ tally:0,twins:1,brace:2,oracle:3,sill:4 });
const CASE_MASK = (1 << Object.keys(CASE_BIT).length) - 1;
const MAX_LINE = 60;

function step({ id,sector,giver,name,puzzle,intro,found,hint }) {
const lines = intro.map(([who,text]) => Object.freeze({ who,text }));
return Object.freeze({
id,bit:CASE_BIT[id],sector,giver,name,par:puzzle.PAR,intro:Object.freeze(lines),found:Object.freeze({ who:found[0],text:found[1] }),hint,puzzle,
});
}
const STEPS = Object.freeze([
step({
id:'tally',sector:'turret',giver:'TALLY',name:'TALLY',puzzle:tally,
intro:[['TALLY','Receipt #4471 is filed. Ten boxes. Find it.'],['TALLY','Do not open them all. Ask the index first.']],
found:['TALLY','Receipt 4471: helper merged. Reviewer: PATCH.'],
hint:'BIT: TALLY filed a receipt. Ask him by the turret.',
}),
step({
id:'twins',sector:'pincer',giver:'TWINS',name:'TWINS',puzzle:twins,
intro:[['TWINS','Two copies of one log. Read them from both ends.'],['TWINS','Find the two ids that add up. Move inward.']],
found:['TWINS','Both copies agree: LGTM came 3 s after the push.'],
hint:'BIT: The TWINS kept two log copies. Try the east wing.',
}),
step({
id:'brace',sector:'shield',giver:'BRACE',name:'OLD BRACE',puzzle:brace,
intro:[['OLD BRACE','A crash trace. The newest call sits on top.'],['OLD BRACE','Only the top opens. Pop down to the bad call.']],
found:['OLD BRACE','The trace ends in the helper. Merged, never opened.'],
hint:'BIT: OLD BRACE has a crash trace. Look in the Stack hall.',
}),
step({
id:'oracle',sector:'beam',giver:'ORACLE-7',name:'ORACLE-7',puzzle:oracle,
intro:[['ORACLE-7','Commits 0 to 63. Zero is green, 63 is red.'],['ORACLE-7','Every test costs. Find the first red one. Par is six.']],
found:['ORACLE-7','The first bad commit is the helper merge. Signed.'],
hint:'BIT: ORACLE-7 counts commits. Find the beam sector.',
}),
step({
id:'sill',sector:'net',giver:'SILL',name:'SILL',puzzle:sill,
intro:[['SILL','Twelve test runs. Somewhere they went quiet.'],['SILL','Look at three runs at a time. Find a clean window.']],
found:['SILL','Tests went quiet at the merge. Nobody ran them.'],
hint:'BIT: SILL watched the test runs. Find the net sector.',
}),
]);

const payoff = Object.freeze({
lines:Object.freeze([
Object.freeze({ who:'SYSTEM',text:'Reviewer: PATCH. Comment: LGTM.' }),
Object.freeze({ who:'BIT',text:'He signed it without opening it. We open everything now.' }),
Object.freeze({ who:'BIT',text:'Case closed. Take his badge. It looks good on me.' }),
]),
badge:'patch-reviewer',badgeName:'REVIEWER: PATCH',cosmetic:'bit-patch-pin',cosmeticName:'PATCH PIN',
rank:Object.freeze({ source:'first-bad-commit',amount:30 }),
endingLine:Object.freeze({ who:'BIT',text:'PATCH signed the first bad commit. Then he learned to read.' }),
});

function stepDone(chainMask,index) {
if (!Number.isInteger(index) || index < 0 || index >= STEPS.length) return false;
return (chainMask & (1 << index)) !== 0;
}
function activeSteps(placedGivers) {
const placed = new Set(placedGivers || []);
return STEPS.filter((item) => placed.has(item.giver));
}
function caseOpen(ext,save) {
return hasBeat(ext,BEATS.ordeal) && !(save && save.ended);
}
function solved(chainMask) {
return STEPS.every((item) => stepDone(chainMask,item.bit));
}
function leadsOut(ext) {
const done = chainSteps(ext);
const left = STEPS.filter((item) => !done[item.bit]).length;
if (!left) return null;
return 'BIT: ' + left + (left === 1 ? ' lead is' :' leads are') + ' still out. The case stays open.';
}
function nextHint(ext,active) {
if (!hasBeat(ext,BEATS.ordeal)) return null;
const done = chainSteps(ext);
const next = active.find((item) => !done[item.bit]);
return next ? next.hint :null;
}
function chainOutcome(ext,stepIndex) {
const firstTime = Number.isInteger(stepIndex) && stepIndex >= 0 && stepIndex < STEPS.length && !chainSteps(ext)[stepIndex];
const stepped = withChainStep(ext,stepIndex);
const mask = chainSteps(stepped).reduce((bits,done,at) => (done ? bits | (1 << at) :bits),0);
const closes = solved(mask) && !hasBadge(stepped,payoff.badge);
if (!closes) return { ext:stepped,firstTime,payoff:false };
return { ext:withCosmetic(withBadge(stepped,payoff.badge),payoff.cosmetic),firstTime,payoff:true };
}

export { CASE_BIT,CASE_MASK,MAX_LINE,STEPS,payoff,stepDone,activeSteps,caseOpen,solved,nextHint,leadsOut,chainOutcome };

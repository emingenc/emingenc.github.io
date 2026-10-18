import { OFFLINE_TOAST,PATCH_CELL } from '../cast/patch.js';
import { withBadge,withCosmetic } from '../ext/badge-ops.js';
import { withBeat } from '../ext/ops.js';
import { withTag } from '../ext/power-ops.js';
import { BEATS,resolveOrdeal } from './contract.js';

const BIT = 'BIT';
const GHOST = 'GHOSTWRITER';
const ANSWER = 2;
const CAUSE_LINE = 3;
const ORDEAL_LISTING = Object.freeze([
{ n:1,text:'walls = scan(flood)' },
{ n:2,text:'for i in range(len(walls) + 1):' },
{ n:3,text:'    reseal(walls[i])' },
{ n:4,text:'return walls' },
].map((line) => Object.freeze(line)));
const ORDEAL_HINT_TOASTS = Object.freeze({ cause:"BIT: It breaks here. The cause is line 2's range.",other:'BIT: Not that one. Line 2. Count the walls.' });
const ORDEAL_STANCE_PROMPTS = Object.freeze({
open:Object.freeze({ read:'Four lines stop the flood. Find the one that breaks it.' }),
merge:Object.freeze({ read:'You chose to merge. Hold MERGE.' }),
});
const REVIEWER = Object.freeze({ badge:'REVIEWER I',id:'reviewer-1',cosmetic:'bit-visor',source:'ordeal-r',rank:20 });
const TAG_ID = 'patch-0';
const OVERRUN_HEARTS = 1;
const LOG_LINE = 'helper · reviewer: PATCH · LGTM · diff opened: no';
const ORDEAL_TOASTS = Object.freeze({
frozen:OFFLINE_TOAST,
tagged:'BIT: TAGged his commit: patch-0. REVIEWER I earned.',
});
const AFTER_TOASTS = Object.freeze([
"BIT: I kept the checkpoint. Right here. I'm bigger now.",
'SYSTEM: process patch: unreferenced -> GC eligible.',
"BIT: He's not gone. He's unreferenced.",
]);
const TRACED_TEXT = 'TRACE COMPLETE — the flood dropped you from the safehouse.';
const TRACED_QUIP_TEXT = 'Read it or merged it blind, the flood came anyway. Remember how that felt.';

function ordealPick(line) {
if (line === ANSWER) return { stamp:'REVIEWED',hint:null };
return { stamp:null,hint:line === CAUSE_LINE ? ORDEAL_HINT_TOASTS.cause :ORDEAL_HINT_TOASTS.other };
}
function alarmSheet() {
return {
id:'ordeal-alarm',
lines:[
{ who:BIT,text:"ALERT! ROOT's flood is on you, and PATCH is beside you." },
{ who:BIT,text:'A diff is queued. Open it and read, or merge it and take the hit.' },
],
choices:[{ id:'open',label:'OPEN THE DIFF',default:true },{ id:'merge',label:'MERGE IT' }],
};
}
function stanceOf(answerId) {
return answerId === 'merge' ? 'merge' :'open';
}
function ordealPrompts(stance) {
return ORDEAL_STANCE_PROMPTS[stance === 'merge' ? 'merge' :'open'];
}
function trustedTimes(count) {
return count === 1 ? '1 time' :count + ' times';
}
function openerText(ghost) {
const trusted = (ghost && ghost.trusted) || 0;
const offered = (ghost && ghost.offered) || 0;
if (trusted >= 1) return 'You trusted me ' + trustedTimes(trusted) + '. Once more.';
if (offered > 0) return 'You checked me every time. Check this.';
return 'You never let me help. Good. Then read this.';
}
function dealSheetLines(ghost) {
return [
{ who:GHOST,text:'Your mentor is gone. ' + openerText(ghost) },
{ who:GHOST,text:'That flood is my helper. It never asked when to stop. Four lines stop it. Merge them.' },
];
}
function verdictSheet(choice) {
const merged = choice === 'merge';
return {
id:'ordeal-' + choice,
lines:merged
? [{ who:BIT,text:'Unreviewed.' },{ who:GHOST,text:'Like everything I ship.' }]
:[{ who:GHOST,text:'...You read it. Huh.' },{ who:BIT,text:'No time to fix it. Brace!' }],
choices:[{ id:'ok',label:'OK',default:true }],
};
}
function heartsLost(hearts,wanted) {
return Math.max(0,Math.min(wanted,hearts - 1));
}
function withPatchTaken(ext) {
return withBeat(ext,BEATS.home);
}
function ordealOutcome(ext,choice) {
if (choice === 'merge') return { ext:resolveOrdeal(ext,'merged'),flag:'merged',tagged:false,badge:null,rank:null,overrun:OVERRUN_HEARTS };
const tagged = withTag(resolveOrdeal(ext,'reviewed'),TAG_ID,PATCH_CELL);
const earned = withCosmetic(withBadge(tagged,REVIEWER.id),REVIEWER.cosmetic);
return { ext:earned,flag:'reviewed',tagged:true,badge:REVIEWER.badge,rank:{ source:REVIEWER.source,amount:REVIEWER.rank },overrun:0 };
}
function choiceOf(result) {
return result.stamp === 'MERGED' ? 'merge' :'review';
}

export {
ANSWER,ORDEAL_LISTING,ORDEAL_HINT_TOASTS,ORDEAL_STANCE_PROMPTS,REVIEWER,TAG_ID,OVERRUN_HEARTS,LOG_LINE,ORDEAL_TOASTS,AFTER_TOASTS,TRACED_TEXT,TRACED_QUIP_TEXT,
ordealPick,alarmSheet,stanceOf,ordealPrompts,openerText,dealSheetLines,verdictSheet,heartsLost,withPatchTaken,ordealOutcome,choiceOf,
};

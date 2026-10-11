import { OFFLINE_TOAST,PATCH_CELL,WARP_CELL } from '../cast/patch.js';
import { withBeat } from '../ext/ops.js';
import { withTag } from '../ext/power-ops.js';
import { SAFEHOUSE } from '../quest/journey.js';
import { BEATS,resolveOrdeal } from './contract.js';

const BIT = 'BIT';
const GHOST = 'GHOSTWRITER';
const LOG = 'LOG';
const ANSWER = 2;
const CAUSE_LINE = 3;
const ORDEAL_LISTING = Object.freeze([
{ n:1,text:'walls = scan(flood)' },
{ n:2,text:'for i in range(len(walls) + 1):' },
{ n:3,text:'    reseal(walls[i])' },
{ n:4,text:'return walls' },
].map((line) => Object.freeze(line)));
const ORDEAL_HINT_TOASTS = Object.freeze({ cause:"BIT: It breaks here. The cause is line 2's range.",other:'BIT: Not that one. Line 2. Count the walls.' });
const ORDEAL_PROMPT_TEXT = Object.freeze({ read:'Four lines stop the flood. Read them, or merge them.' });
const HOME = Object.freeze({ cell:WARP_CELL,facing:'left' });
const WAVE = Object.freeze({ fromCol:SAFEHOUSE.minCol,toCol:SAFEHOUSE.maxCol,minRow:SAFEHOUSE.minRow,maxRow:SAFEHOUSE.maxRow,stepMs:180 });
const REVIEWER = Object.freeze({ badge:'REVIEWER I',source:'ordeal-r',rank:20 });
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
function alarmSheet(inside) {
return {
id:'ordeal-alarm',
lines:[{ who:BIT,text:"ALERT! ROOT's flood is in the safehouse, and PATCH is still in there." }],
choices:[{ id:'go',label:inside ? 'OK' :'GO HOME',default:true }],
};
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
function dealSheet(ghost) {
return {
id:'ordeal-deal',
lines:[
{ who:LOG,text:LOG_LINE },
{ who:BIT,text:'He never opened it?' },
{ who:GHOST,text:'Your mentor is offline.' },
{ who:GHOST,text:openerText(ghost) },
{ who:GHOST,text:'That flood is my helper. It never asked when to stop.' },
{ who:GHOST,text:'Four lines stop it. Merge them.' },
],
choices:[{ id:'read',label:'SHOW ME',default:true }],
};
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
function waveHits(front,hero) {
return hero.col === front && hero.row >= WAVE.minRow && hero.row <= WAVE.maxRow;
}
function waveColumns() {
return Array.from({ length:WAVE.toCol - WAVE.fromCol + 1 },(blank,index) => WAVE.fromCol + index);
}
function withHome(ext) {
return withBeat(ext,BEATS.home);
}
function ordealOutcome(ext,choice) {
if (choice === 'merge') return { ext:resolveOrdeal(ext,'merged'),flag:'merged',tagged:false,badge:null,rank:null,overrun:OVERRUN_HEARTS };
const tagged = withTag(resolveOrdeal(ext,'reviewed'),TAG_ID,PATCH_CELL);
return { ext:tagged,flag:'reviewed',tagged:true,badge:REVIEWER.badge,rank:{ source:REVIEWER.source,amount:REVIEWER.rank },overrun:0 };
}
function choiceOf(result) {
return result.stamp === 'MERGED' ? 'merge' :'review';
}

export {
ANSWER,ORDEAL_LISTING,ORDEAL_HINT_TOASTS,ORDEAL_PROMPT_TEXT,HOME,WAVE,REVIEWER,TAG_ID,OVERRUN_HEARTS,LOG_LINE,ORDEAL_TOASTS,AFTER_TOASTS,TRACED_TEXT,TRACED_QUIP_TEXT,
ordealPick,alarmSheet,openerText,dealSheet,verdictSheet,heartsLost,waveHits,waveColumns,withHome,ordealOutcome,choiceOf,
};

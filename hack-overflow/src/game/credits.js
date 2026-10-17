import { FIND_MARKS } from './cosmetics.js';
import { chainSteps,hasBadge,hasCosmetic } from './ext/badge-ops.js';
import { repairExtFields } from './ext/index.js';
import { STEPS,payoff } from './quest/first-bad-commit.js';
import { STAGE } from './quest/quests.js';

const HERO_ID = 'you';
const REVIEW_BADGE = 'reviewer-1';
const VISOR = 'bit-visor';
const FLAG_LINES = Object.freeze({ merged:'LGTM. Signed without opening it.',reviewed:'LGTM. This time, someone read it.' });
const STEP_MS = 2400;
const IN_MS = 900;
const HOLD_END_MS = 2000;
const OUT_MS = 3000;
const TYPE_MS = 28;
const START_X = -0.1;
const MID_X = 0.5;
const END_X = 1.1;
const LINE_FROM = 0.07;
const LINE_TO = 0.93;

function questDone(fields,id) {
return fields.quests[id] === STAGE.done;
}
function pick(done,whenDone,otherwise) {
return done ? whenDone :otherwise;
}
function heroLine(stats) {
return 'LV ' + stats.level + ' ' + stats.rank + ' · ' + stats.locks + '/' + stats.placed + ' locks · ' + stats.stars + ' stars';
}
function patchLine(fields) {
return FLAG_LINES[fields.ghost.flag] || 'LGTM.';
}
function creditsCast(ext,stats) {
const fields = repairExtFields(ext && typeof ext === 'object' ? ext :{});
const closed = (id) => chainSteps(fields)[STEPS.findIndex((step) => step.id === id)];
const member = (id,name,line) => ({ id,name,line });
return [
member(HERO_ID,'YOU',heroLine(stats)),
member('bit','BIT',pick(hasBadge(fields,payoff.badge),'Rode your shoulder. Wears the ' + payoff.cosmeticName + '.','Rode your shoulder from the first drone.')),
member('tally','TALLY',pick(questDone(fields,'receipt-run'),'Receipt #4470 found. Everything stored.','Nothing stored is ever lost.')),
member('twins','TWINS',pick(questDone(fields,'meet-in-the-middle'),'Met in the middle. Two ends, one sum.','Two copies. Read from both ends.')),
member('brace','OLD BRACE',pick(questDone(fields,'dish-rush'),'Dish rush served. Only the top opens.','Only the top opens.')),
member('oracle','ORACLE-7',pick(closed('oracle'),'First bad commit found. Signed.','32 doors. HIGHER or LOWER.')),
member('sill','SILL',pick(closed('sill'),'Tests went quiet at the merge. Nobody ran them.','Slide the window. Find the clean run.')),
member('brute','BRUTE',pick(fields.npc.bruteHelped,'Helped when it counted.',"Held the wall at the corridor's end.")),
member('null','NULL',pick(fields.npc.nullHome,'Walked home with a reference.','Still unreferenced.')),
member('patch','PATCH',patchLine(fields)),
];
}
function lerp(from,to,fraction) {
return from + (to - from) * fraction;
}
function localX(local) {
if (local < IN_MS) return lerp(START_X,MID_X,local / IN_MS);
if (local < HOLD_END_MS) return MID_X;
return lerp(MID_X,END_X,(local - HOLD_END_MS) / (OUT_MS - HOLD_END_MS));
}
function isWalking(local) {
return local < IN_MS || local >= HOLD_END_MS;
}
function creditsLength(count) {
return (count - 1) * STEP_MS + OUT_MS;
}
function lineupFrame(count) {
return { done:true,figures:Array.from({ length:count },(unused,index) => ({ index,x:LINE_FROM + (LINE_TO - LINE_FROM) * index / Math.max(1,count - 1),walking:false })),speaker:null,typed:0 };
}
function speakerAt(elapsed,count) {
const index = Math.min(count - 1,Math.floor((elapsed - IN_MS) / STEP_MS));
return index >= 0 ? index :null;
}
function creditsFrame(elapsed,cast) {
if (!(elapsed < creditsLength(cast.length))) return lineupFrame(cast.length);
const figures = cast.map((unused,index) => ({ index,local:elapsed - index * STEP_MS })).filter((entry) => entry.local >= 0 && entry.local < OUT_MS)
.map((entry) => ({ index:entry.index,x:localX(entry.local),walking:isWalking(entry.local) }));
const speaker = speakerAt(elapsed,cast.length);
const typed = speaker === null ? 0 :Math.min(cast[speaker].line.length,Math.floor((elapsed - IN_MS - speaker * STEP_MS) / TYPE_MS));
return { done:false,figures,speaker,typed };
}
function entry(id,name,held) {
return { id,name,held };
}
function wallOf(ext) {
const fields = repairExtFields(ext && typeof ext === 'object' ? ext :{});
const steps = chainSteps(fields);
return {
badges:[entry(REVIEW_BADGE,'REVIEWER I',hasBadge(fields,REVIEW_BADGE)),entry(payoff.badge,payoff.badgeName,hasBadge(fields,payoff.badge))],
pins:[
entry(VISOR,'VISOR',hasCosmetic(fields,VISOR)),
entry(payoff.cosmetic,payoff.cosmeticName,hasCosmetic(fields,payoff.cosmetic)),
...FIND_MARKS.map((mark) => entry(mark.id,mark.name,hasCosmetic(fields,mark.id))),
],
files:STEPS.map((step,index) => entry(step.id,step.name,steps[index])),
};
}

export { HERO_ID,creditsCast,creditsFrame,creditsLength,wallOf };

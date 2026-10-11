import { flagOf } from './contract.js';

const YOU = 'YOU';
const ROOT = 'ROOT';
const GHOST = 'GHOSTWRITER';
const SYSTEM = 'SYSTEM';
const PATCH = 'PATCH';
const ANSWER = 2;
const ROOT_LISTING = Object.freeze([
{ n:1,text:'limit, rewrites = 24, 0' },
{ n:2,text:'while True:' },
{ n:3,text:'    target = next_unreviewed()' },
{ n:4,text:'    rewrite(target)' },
{ n:5,text:'    rewrites += 1' },
].map((line) => Object.freeze(line)));
const ROOT_HINT_TOASTS = Object.freeze({ limit:'limit is set. Does any line read it?',runs:'That runs every pass. What ends the passes?' });
const ROOT_DRAFTS = Object.freeze([
{ id:'A',code:'if reviewed_count() > limit: break' },
{ id:'B',code:'if rewrites >= limit: break' },
{ id:'C',code:'if reviewed_count() >= limit: break' },
].map((draft) => Object.freeze(draft)));
const ROOT_DRAFT_TOASTS = Object.freeze({
A:'Never fires: reviewed tops out at 24. 24 > 24 is false.',
B:'Fires after 24 more rewrites. After the damage.',
C:'Correct: you reviewed all 24. It fires on the next pass.',
});
const STAMP_LINES = Object.freeze([
{ who:YOU,text:'Reading is for reviewers. I am one.' },
{ who:ROOT,text:'I have no step limit.' },
{ who:GHOST,text:'Then I will write the stop. Three drafts. I do not know which is right. Review me.' },
]);
const FLAG_LINES = Object.freeze({
reviewed:Object.freeze([{ who:GHOST,text:'You read me once. Nobody ever did. Read these too.' }]),
merged:Object.freeze([{ who:GHOST,text:'Last time you merged me blind. Not this time.' }]),
});
const DRAFT_BONUS_LINES = Object.freeze({
reviewed:Object.freeze([{ who:GHOST,text:'Read all three. I did not.' }]),
merged:Object.freeze([{ who:GHOST,text:'B. It counts its own work. Trust me.' }]),
});
const HALT_LINES = Object.freeze([{ who:YOU,text:'LGTM.' },{ who:ROOT,text:'I have no st—' }]);
const FINAL_BENT_LINES = Object.freeze([
{ who:SYSTEM,text:'KERNEL BREACHED. ROOT HALTED. ACCESS GRANTED TO: YOU.' },
{ who:GHOST,text:'Here is the joke: I never wanted root access. I wanted somebody to read my code.' },
{ who:GHOST,text:'ROOT was my loop. The helper. I never told it when to stop.' },
{ who:GHOST,text:'Every lock was a pull request nobody reviewed. You reviewed all of them.' },
{ who:GHOST,text:'So that is it. You broke every lock I wrote. Merged. The Grid is yours, engineer.' },
{ who:PATCH,text:'You read the code. That\'s the whole job.' },
]);
const ROOT_PROMPT_TEXT = Object.freeze({ read:'Where does this loop stop?',drafts:'Three drafts of a stop. Read them. Pick one.' });
const POSTGAME_TEXT = 'I said the corridor was fine. I never checked.';

function trustedLine(count) {
const times = count === 1 ? 'once' :count + ' times';
return { who:GHOST,text:'You trusted me ' + times + ' after that. Read these.' };
}
function flagLines(flag,trustedWrong) {
const own = flag ? FLAG_LINES[flag] :[];
return flag === 'merged' && trustedWrong > 0 ? [...own,trustedLine(trustedWrong)] :[...own];
}
function bonusLines(flag) {
return flag ? [...DRAFT_BONUS_LINES[flag]] :[];
}
function rootPick(line) {
if (line === ANSWER) return { stamp:'CHANGES REQUESTED',hint:null };
return { stamp:null,hint:line === 1 ? ROOT_HINT_TOASTS.limit :ROOT_HINT_TOASTS.runs };
}
function rootSpec(ext) {
const flag = flagOf(ext);
const trustedWrong = (ext.ghost && ext.ghost.trustedWrong) || 0;
return {
kind:'root',listing:ROOT_LISTING,answer:ANSWER,onPick:rootPick,prompts:ROOT_PROMPT_TEXT,
afterStamp:[...STAMP_LINES,...flagLines(flag,trustedWrong)],
drafts:{ list:ROOT_DRAFTS,accept:'C',reasons:ROOT_DRAFT_TOASTS,bonus:bonusLines(flag),closing:HALT_LINES },
};
}
function bentFinalBeat() {
return { id:'final',toast:false,lines:FINAL_BENT_LINES.map((line) => ({ ...line })) };
}

export {
ROOT_LISTING,ROOT_PROMPT_TEXT,ROOT_HINT_TOASTS,ROOT_DRAFTS,ROOT_DRAFT_TOASTS,STAMP_LINES,HALT_LINES,FINAL_BENT_LINES,POSTGAME_TEXT,
flagLines,bonusLines,rootSpec,bentFinalBeat,
};

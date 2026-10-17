import { questState } from '../ext/ops.js';
import { STAGE } from '../quest/quests.js';

const SYSTEM = 'SYSTEM';
const PATCH = 'PATCH';
const GHOST = 'GHOSTWRITER';
const COUNTERSIGN = 'countersign';
const FIRST_PHASE_WITH_TOAST = 3;
const SKIP_ONE = 1;

const ROOT_PHASE_TOASTS = Object.freeze({
phase3:'ROOT: my log. Find where PATCH was last referenced.',
phase4:'ROOT: three heads sum to 0. ADVANCE i, then L and R.',
phase5:'ROOT: flood stream. POP BACK, shoot the window max.',
});
const PATCH_FREED_LINES = Object.freeze([
{ who:PATCH,text:'Referenced.' },
{ who:PATCH,text:'Still here.' },
].map((line) => Object.freeze(line)));
const BRUTE_ASSIST = Object.freeze({
opening:'BRUTE: TWO MILLION PAIRS. I DO THEM ALL. I TAKE THE FIRST HIT.',
taken:'BRUTE: MINE. YOU DO THE WINDOW.',
});
const REVEAL_LINES = Object.freeze([
{ who:SYSTEM,text:'process root. role: helper. spawned_by: GHOSTWRITER.' },
{ who:SYSTEM,text:'reviewed: no.' },
{ who:SYSTEM,text:'step_limit: none.' },
{ who:GHOST,text:'Yes. It is mine. I wrote it fast and sent it out. Now read it.' },
].map((line) => Object.freeze(line)));

function phaseOpeningToast(n) {
return Object.hasOwn(ROOT_PHASE_TOASTS,'phase' + n) && n >= FIRST_PHASE_WITH_TOAST ? ROOT_PHASE_TOASTS['phase' + n] :null;
}
function bruteHalveLine(n,skips) {
return 'BRUTE: I checked a hundred and twenty-eight. You took ' + n + ', ' + skips + (skips === SKIP_ONE ? ' skip.' :' skips.');
}
function countersignDone(ext) {
return questState(ext,COUNTERSIGN) === STAGE.done;
}
function bruteAssistTakes(ext,assistUsed) {
return countersignDone(ext) && !assistUsed;
}

function spokenLine(line) {
return line.text.startsWith(line.who + ':') ? line.text :line.who + ': ' + line.text;
}

export { spokenLine,ROOT_PHASE_TOASTS,PATCH_FREED_LINES,BRUTE_ASSIST,REVEAL_LINES,phaseOpeningToast,bruteHalveLine,countersignDone,bruteAssistTakes };

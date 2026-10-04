import { lockName } from '../game/messages.js';
import { result } from '../game/rigs/ledger.js';

const LG_BRIDGE_LOCK = 'lc1';
const LG_STAR_WORDS = ['second','third'];

function uiLedgerVerdict(outcome) {
if (outcome.status === 'won') return 'LEDGER BALANCED';
return outcome.failure.reason === 'traced' ? 'TRACED' :'LEDGER OVERFLOW';
}
function uiLedgerChecks(outcome) {
const won = outcome.status === 'won';
const score = 'score ' + outcome.score;
return [
{ label:'Cleared',ok:won,value:outcome.pairs + '/' + outcome.max + ' pairs' },
...outcome.marks.map((mark) => ({ label:'SCORE ≥ ' + mark,ok:won && outcome.score >= mark,value:score })),
];
}
function uiLedgerBridge(text) {
return text.replace('{lock}',lockName(LG_BRIDGE_LOCK));
}
function uiLedgerCard(state) {
const outcome = result(state);
const failure = outcome.failure;
return { won:outcome.status === 'won',title:uiLedgerVerdict(outcome),stars:outcome.stars,checks:uiLedgerChecks(outcome),
culprit:failure ? failure.text :null,note:outcome.note,bridge:uiLedgerBridge(outcome.bridge),code:outcome.codeLog,className:'lg-screen' };
}
function uiLedgerNextStar(outcome) {
const next = outcome.marks.findIndex((mark) => outcome.score < mark);
return next < 0 ? '' :' ' + LG_STAR_WORDS[next] + ' star at ' + outcome.marks[next] + '.';
}
function uiLedgerEnding(state) {
const outcome = result(state);
const won = outcome.status === 'won';
const verdict = uiLedgerVerdict(outcome);
const spokenVerdict = verdict.charAt(0) + verdict.slice(1).toLowerCase() + '.';
const stars = ' ' + outcome.stars + ' star' + (outcome.stars === 1 ? '' :'s') + '. Score ' + outcome.score + '.';
const announce = won ? spokenVerdict + stars + uiLedgerNextStar(outcome) :spokenVerdict + ' ' + outcome.failure.text;
return { won,stars:outcome.stars,reason:won ? null :outcome.failure.reason,announce };
}

export { uiLedgerCard, uiLedgerEnding };

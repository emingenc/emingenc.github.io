
import { readWindow } from './stream-sim.js';

const KIND_KEY = 'key';
const KIND_STALE = 'stale';
const TONE_FACT = 'fact';
const TONE_BAD = 'bad';
const FILLER_KINDS = ['noise','bulk'];

function factLine(entry) {
return { tone:TONE_FACT,text:`${entry.label} = ${entry.value}` };
}
function staleLine(entry,dead) {
const note = dead ? 'an old copy; the model reads the newer value' :'an old copy, and the only one: the model will quote it';
return { tone:TONE_BAD,text:`${entry.label} = ${entry.value} (${note})` };
}
function fillerLine(entry) {
return { tone:TONE_BAD,text:`${entry.label} (${entry.tokens} tok of filler)` };
}
function missingLine(item,pushed) {
const note = pushed.has(item.uid) ? 'pushed out of the window' :'never reached the prompt';
return { tone:TONE_BAD,text:`${item.label}: ${note}` };
}
function promptReadout(state) {
const dead = new Set(readWindow(state).dead);
const kept = new Set(state.window.map((entry) => entry.uid));
const facts = state.window.filter((entry) => entry.kind === KIND_KEY).map(factLine);
const stale = state.window.filter((entry) => entry.kind === KIND_STALE).map((entry) => staleLine(entry,dead.has(entry.uid)));
const filler = state.window.filter((entry) => FILLER_KINDS.includes(entry.kind)).map(fillerLine);
const pushed = new Set(state.cuts.filter((cut) => cut.kind === KIND_KEY).map((cut) => cut.uid));
const missing = state.plan.filter((item) => item.kind === KIND_KEY && !kept.has(item.uid)).map((item) => missingLine(item,pushed));
return { used:state.used,budget:state.budget,held:facts.length,total:state.keysTotal,lines:[...facts,...stale,...filler,...missing] };
}

export { promptReadout };

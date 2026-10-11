import { createDrone } from '../actors.js';
import { hasBeat } from '../ext/ops.js';
import { END_GLYPH,HOLD_MS } from '../rooms/data/shield-wave1.js';
import { SHIELD_TEXTS } from '../rooms/data/shield-texts.js';
import { answerFor,applyShield,createShield,glyphOf } from '../rooms/shield.js';
import { usablePowers } from './powers.js';

const VOLLEYS = Object.freeze(['([])','[(])']);
const DOOR = '([()])';
const BREACH_HOLD_MS = HOLD_MS;
const VOLLEY = Object.freeze({
trigger:Object.freeze({ col:15,row:15 }),
drone:Object.freeze({ id:'v1',col:12,row:16 }),
brace:Object.freeze({ col:11,row:14 }),
braceFrom:Object.freeze({ col:12,row:14 }),
door:Object.freeze({ col:12,row:17 }),
doorFrom:Object.freeze({ col:12,row:16 }),
reward:30,
source:'volley',
beat:'volley',
find:'brace-vault',
ally:'brace',
power:'plate',
});
const PLATE_VERBS = ['push','pop'];
const TEXT = {
start:'VOLLEY. Stack the openers, pop to match, hold BREACH when it cannot match.',
cleared:'Volleys blocked. +' + VOLLEY.reward + ' RANK.',
standDown:'Stood down. The volleys stop.',
doorBump:'A nested door: ( [ ( ) ] ). Open it with the stack.',
doorLocked:'A nested door. OLD BRACE has a way in.',
doorWin:'The door opens. Vault: nothing to steal, a pattern to keep: last in, first out.',
doorOpen:'The vault stands open. Last in, first out.',
doorStandDown:'Stood down. The door stays shut.',
busy:'A volley is live. Finish it or STAND DOWN.',
hold:SHIELD_TEXTS.toast.hold,
owned:'The plates are yours now. Keep them stacked.',
lend:{
lend:['Take three trials of the plates. Keep them stacked.','3 PLATE trials lent.'],
again:['Back again? Three more.'],
},
};

function volleyDue(ext,won,pos) {
const there = pos.col === VOLLEY.trigger.col && pos.row === VOLLEY.trigger.row;
return there && usablePowers(won,ext).includes(VOLLEY.power) && !hasBeat(ext,VOLLEY.beat);
}
function standVolley() {
return [createDrone({ id:VOLLEY.drone.id,col:VOLLEY.drone.col,row:VOLLEY.drone.row })];
}
function createVolleyRun(waves) {
return { waves,state:createShield(waves,{ assist:true }),wrong:0 };
}
function moveFor(run,verb) {
return glyphOf(run.state) === END_GLYPH && PLATE_VERBS.includes(verb) ? 'clear' :verb;
}
function playVolley(run,verb) {
const state = run.state;
const base = { run,kind:'idle',right:'',glyph:glyphOf(state),top:state.stack[state.stack.length - 1] || '',blocked:false,done:false };
if (state.status !== 'running') return base;
const right = answerFor(state);
const move = moveFor(run,verb);
if (move !== right) return { ...base,kind:'wrong',right,run:{ ...run,wrong:run.wrong + 1 } };
const next = applyShield(state,move);
return { ...base,kind:next.last.kind,right,run:{ ...run,state:next },blocked:next.last.blocked === true,done:next.status === 'won' };
}
function runView(run) {
const state = run.state;
const volleys = run.waves.length;
return {
glyph:glyphOf(state),lane:state.wave[state.vi] || '',at:state.gi,stack:state.stack.join(''),
volley:Math.min(state.vi,volleys - 1),volleys,done:state.status === 'won',end:glyphOf(state) === END_GLYPH,
};
}
function volleyText() {
return {
...TEXT,
wrong:(right) => 'That one was a ' + right.toUpperCase() + '. -1',
slip:(right) => 'That one was a ' + right.toUpperCase() + '.',
blocked:(done,total) => 'Volley ' + done + ' of ' + total + ' blocked.',
breach:(glyph,top) => 'BREACH. ' + glyph + (top ? ' hit a ' + top + ' on top.' :' had nothing to match.') + ' A counter would have said fine.',
};
}

export { BREACH_HOLD_MS,DOOR,VOLLEY,VOLLEYS,createVolleyRun,moveFor,playVolley,runView,standVolley,volleyDue,volleyText };

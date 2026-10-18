import { MONO_DEQUE,bruteLooks,dequeValues,monoDequePar } from './mono-deque.js';
import { SEPARATOR,chipsOf,trialKit,viewOf } from './trial-kit.js';

const LIT_BEAT = 'mono-deque';
const CLEAR_FIND = 'mono-deque';
const RANK_SOURCE = 'mono-deque';
const RANK_PAID = 20;
const OFFER_ID = 'mono-deque-offer';
const HALVES = Object.freeze(['net','plate']);
const LIT_LINES = Object.freeze(['BIT: MONO DEQUE is lit. NET and PLATE, composed.','BIT: POP BACK while smaller, EXPIRE FRONT. Step on the glowing tile on the floor.']);
const OFFER_LINES = Object.freeze([
{ who:'BIT',text:'A stream of values and a window of five. Shoot the biggest value in every window.' },
{ who:'BIT',text:'Each tick: EXPIRE FRONT if it left the window, POP BACK while smaller, PUSH, then SHOOT the front.' },
]);
const MISTAKE_NAMES = Object.freeze({
'early-expire':'EXPIRE FRONT too early','early-pop':'POP BACK on a bigger back','stale-front':'PUSH with a stale front',
'keep-smaller':'Kept a smaller value in front','early-shoot':'SHOOT before the window was full','shoot-first':'Pressed before SHOOT',
});

function monoDequeOpen(usable) {
return HALVES.every((id) => usable.includes(id));
}
const kit = trialKit({
open:monoDequeOpen,beat:LIT_BEAT,find:CLEAR_FIND,source:RANK_SOURCE,rank:RANK_PAID,par:monoDequePar,
brute:(run) => 'BRUTE: ' + bruteLooks() + ' looks, every window rescanned. You pressed ' + run.moves + '.',
});
const { lit:monoDequeLit,due:monoDequeDue,ready:trialReady,open:machineOpen,clear:trialClear,outcome:trialOutcome } = kit;
const MOVE_CHIPS = Object.freeze([
{ move:'expire',label:'EXPIRE FRONT',aria:'Expire the front of the deque, it left the window' },
{ move:'pop',label:'POP BACK',aria:'Pop the back of the deque, it is smaller than the arriving value' },
{ move:'push',label:'PUSH',aria:'Push the arriving value at the back of the deque' },
{ move:'shoot',label:'SHOOT',aria:'Shoot the front of the deque, it is the window max' },
]);
function askOf(run) {
const incoming = run.pushed || run.t >= MONO_DEQUE.nums.length ? [] :['NEXT ' + MONO_DEQUE.nums[run.t]];
const held = dequeValues(run);
return [...incoming,'DEQUE ' + (held.length > 0 ? held.join(' ') :'empty')].join(SEPARATOR);
}
function trialView(run) {
return viewOf({
head:'MONO DEQUE',presses:run.moves,par:monoDequePar(),ask:askOf(run),tele:run.shots.length > 0 ? 'MAX ' + run.shots.join(' ') :'MAX none yet',
chips:chipsOf(MOVE_CHIPS),
});
}

export { LIT_BEAT,CLEAR_FIND,RANK_SOURCE,RANK_PAID,OFFER_ID,LIT_LINES,OFFER_LINES,MISTAKE_NAMES,monoDequeOpen,monoDequeLit,monoDequeDue,trialReady,machineOpen,trialClear,trialOutcome,trialView };

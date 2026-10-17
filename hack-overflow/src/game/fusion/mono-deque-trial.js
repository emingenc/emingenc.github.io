import { hasBeat,hasFind,withFind } from '../ext/ops.js';
import { DRAWER_FIND,refactorLit } from '../finale/refactor.js';
import { ownedPowers } from '../power/powers.js';
import { MONO_DEQUE,bruteLooks,dequeValues,monoDequePar } from './mono-deque.js';

const LIT_BEAT = 'mono-deque';
const CLEAR_FIND = 'mono-deque';
const RANK_SOURCE = 'mono-deque';
const RANK_PAID = 20;
const OFFER_ID = 'mono-deque-offer';
const HALVES = Object.freeze(['net','plate']);
const LIT_LINES = Object.freeze(['BIT: MONO DEQUE is lit. NET and PLATE, composed.',"BIT: POP BACK while smaller, EXPIRE FRONT. Try it on PATCH's bench."]);
const OFFER_LINES = Object.freeze([
{ who:'BIT',text:'A stream of values and a window of five. Shoot the biggest value in every window.' },
{ who:'BIT',text:'Each tick: EXPIRE FRONT if it left the window, POP BACK while smaller, PUSH, then SHOOT the front.' },
]);

function ended(save) {
return Boolean(save) && save.ended === true;
}
function monoDequeOpen(usable) {
return HALVES.every((id) => usable.includes(id));
}
function monoDequeLit(won,ext) {
return refactorLit(won,ext) && hasFind(ext,DRAWER_FIND) && monoDequeOpen(ownedPowers(won));
}
function monoDequeDue(won,ext,save) {
return monoDequeLit(won,ext) && !hasBeat(ext,LIT_BEAT) && !ended(save);
}
function trialReady(won,ext,save) {
return monoDequeLit(won,ext) && hasBeat(ext,LIT_BEAT) && !hasFind(ext,CLEAR_FIND) && !ended(save);
}
function trialClear(ext) {
return withFind(ext,CLEAR_FIND);
}
function trialOutcome(run) {
if (run.status !== 'won') return null;
const par = monoDequePar();
const atPar = run.moves <= par && run.wrong === 0;
const mine = run.moves + ' presses, ' + run.wrong + ' wrong. Par ' + par + '.';
const brute = 'BRUTE: ' + bruteLooks() + ' looks, every window rescanned. You pressed ' + run.moves + '.';
return { rank:RANK_PAID,source:RANK_SOURCE,atPar,lines:[atPar ? 'BIT: At par. ' + mine :'BIT: ' + mine,brute] };
}
const SEPARATOR = ' . ';
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
return {
n:0,head:'MONO DEQUE',count:'PRESS ' + run.moves + SEPARATOR + 'PAR ' + monoDequePar(),ask:askOf(run),
tele:run.shots.length > 0 ? 'MAX ' + run.shots.join(' ') :'MAX none yet',note:'',fiction:'',
chips:MOVE_CHIPS.map((one) => ({ id:'move-' + one.move,label:one.label,aria:one.aria,move:one.move })),
};
}

export { LIT_BEAT,CLEAR_FIND,RANK_SOURCE,RANK_PAID,OFFER_ID,LIT_LINES,OFFER_LINES,monoDequeOpen,monoDequeLit,monoDequeDue,trialReady,trialClear,trialOutcome,trialView };

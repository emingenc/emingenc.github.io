import { applyMonoDeque,monoDequeMistake } from '../fusion/mono-deque.js';
import { answerFor } from '../rooms/shield.js';
import { halveMiddle,isGrey } from './halve.js';
import { pressFusion,pressHalve,playVerb,recallAllClones,slotOf,tagClone } from './kernel.js';

const SHIELD = 2;
const HALVE_PHASE = 3;
const DEQUE_PHASE = 5;
const HALF = 2;
const NO_COUNT = 0;
const AUTO_AFTER = Object.freeze({ [SHIELD]:0,[HALVE_PHASE]:3,[DEQUE_PHASE]:2 });
const AUTO_HINTS = Object.freeze({
recall:'RECALL ALL visits every tag',
pop:'Return: POP the matching frame',
clear:'Stack empty: CLEAR',
breach:'Cannot match: BREACH',
grey:'Grey entry: shoot it, then nudge',
deque:'POP BACK or PUSH? You decide',
});
const NO_HINT = '';
const DEQUE_ORDER = Object.freeze(['shoot','expire','pop','push']);
const DEQUE_FORCED = new Set(['shoot','expire']);

function forcedMove(play) {
return { forced:true,play,hint:NO_HINT };
}
function decision(play,hint) {
return { forced:false,play,hint };
}
function untaggedAsked(phase) {
const open = phase.clones.find((clone) => clone.hp > 0 && phase.asked.includes(clone.code) && !phase.tagged.includes(clone.id));
return open ? open.id :'';
}
function fieldAuto(phase) {
const id = untaggedAsked(phase);
if (id) return forcedMove((current) => tagClone(current,id));
return decision(recallAllClones,AUTO_HINTS.recall);
}
function volleyAuto(phase) {
const verb = answerFor(phase.volley.state);
const play = (current) => playVerb(current,verb);
return verb === 'push' ? forcedMove(play) :decision(play,AUTO_HINTS[verb] ?? AUTO_HINTS.breach);
}
function shieldAuto(phase) {
return slotOf(phase) === 'volley' ? volleyAuto(phase) :fieldAuto(phase);
}
function lowerMiddle(halve) {
return Math.floor((halve.lo + halve.hi) / HALF);
}
function halveShot(halve) {
return halve.last === null ? lowerMiddle(halve) :halveMiddle(halve);
}
function halveAuto(phase) {
const { halve } = phase;
const shot = halveShot(halve);
const play = (current) => pressHalve(current,shot);
return isGrey(shot) ? decision(play,AUTO_HINTS.grey) :forcedMove(play);
}
function dequeMove(run,puzzle) {
return DEQUE_ORDER.find((move) => !monoDequeMistake(applyMonoDeque(run,move,puzzle).kind));
}
function dequeAuto(phase) {
const { run,puzzle } = phase.fusion;
const move = dequeMove(run,puzzle);
const play = (current) => pressFusion(current,move);
const onEmpty = move === 'push' && run.deque.length === NO_COUNT;
return DEQUE_FORCED.has(move) || onEmpty ? forcedMove(play) :decision(play,AUTO_HINTS.deque);
}
const AUTO_OF = Object.freeze({ [SHIELD]:shieldAuto,[HALVE_PHASE]:halveAuto,[DEQUE_PHASE]:dequeAuto });
function progressOf(phase,good) {
return phase.n === DEQUE_PHASE ? phase.fusion.run.t :good;
}
function autoReady(phase,good) {
if (!phase || phase.done || !Object.hasOwn(AUTO_AFTER,phase.n)) return false;
return progressOf(phase,good) >= AUTO_AFTER[phase.n];
}
function nextAuto(phase) {
if (!phase || phase.done || !Object.hasOwn(AUTO_OF,phase.n)) return null;
return AUTO_OF[phase.n](phase);
}

export { AUTO_AFTER,autoReady,nextAuto };

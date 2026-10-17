import { registerActorKind } from '../actors.js';
import { solveLoopPinch } from '../fusion/loop-pinch.js';
import { solveMonoDeque } from '../fusion/mono-deque.js';
import { ownedPowers } from '../power/powers.js';
import { recallAll } from '../power/recall.js';
import { createVolleyRun,playVolley } from '../power/volley.js';
import { answerFor } from '../rooms/shield.js';
import { BEATS } from './contract.js';
import { HALVE,applyHalve,bruteChecks,createHalve,halveMiddle,halveMistake,readout } from './halve.js';
import { BRUTE_ASSIST,PATCH_FREED_LINES,bruteAssistTakes,bruteHalveLine,phaseOpeningToast } from './root-lines.js';
import {
DEQUE_STREAM,LOOP_ROW,bruteDequeLine,bruteLoopLine,createDequePhase,createLoopPhase,dequeView,loopView,pressDeque,pressLoop,rootChecks,
} from './root-fusions.js';

registerActorKind('clone',{});

const KERNEL_TRIALS = 3;
const BRUTE = 'BRUTE';
const SEPARATOR = ' . ';
const CODES = Object.freeze(['K7','B2','Q9','M4','X1','D8','R5','T6','H3','F0','W2','Z9']);
const CLONE_LAYOUT = { rows:'14 15 16',cols:'21 23 25 27' };
const numbersOf = (text) => text.split(' ').map(Number);
const CLONE_CELLS = Object.freeze(numbersOf(CLONE_LAYOUT.rows).flatMap((row) => numbersOf(CLONE_LAYOUT.cols).map((col) => Object.freeze({ col,row }))));
const SWAP_AFTER = 2;
const PHASE1_SOLVER_LIMIT = 20;
const FIELD_PHASES = 2;
const HALVE_PHASE = 3;
const LOOP_PHASE = 4;
const DEQUE_PHASE = 5;
const ROOT_LOG_ENTRIES_PER_CHECK = 8;
const ROOT_HALVE_PACE = bruteChecks / ROOT_LOG_ENTRIES_PER_CHECK;
const FUSION_MAKERS = Object.freeze({ [LOOP_PHASE]:createLoopPhase,[DEQUE_PHASE]:createDequePhase });
const HINT_PRESS = Object.freeze({ [LOOP_PHASE]:'fire',[DEQUE_PHASE]:'shoot' });
const PHASE_SPECS = [
{ n:1,name:'LOOKUP',beat:BEATS.kernel[0],clones:12,asked:'5 2 9 11 7',swap:'5 1' },
{ n:2,name:'SHIELD',beat:BEATS.kernel[1],clones:6,asked:'3 1 5 6',volley:'([([()])])' },
{ n:3,name:'HALVE',beat:BEATS.kernel[2],clones:0,asked:'' },
{ n:4,name:'LOOP-PINCH',beat:BEATS.kernel[3],clones:0,asked:'' },
{ n:5,name:'MONO DEQUE',beat:BEATS.kernel[4],clones:0,asked:'' },
];
const PHASES = Object.freeze(PHASE_SPECS.map((spec) => Object.freeze({
...spec,asked:spec.asked ? Object.freeze(numbersOf(spec.asked)) :Object.freeze([]),swap:spec.swap ? Object.freeze(numbersOf(spec.swap)) :null,
})));
const KERNEL_TOASTS = Object.freeze({
phase1:'ROOT: 12 clones. I ask five codes. Tag only those.',
phase2:'ROOT: call volleys, five deep. Tag between the frames.',
again:'ROOT: again. Trials refilled.',
nothing:'Nothing tagged. TAG a clone first.',
});
const SWAP_TEXT = { ahead:'SWAP IN ',done:'SWAPPED',moved:' moved. Re-TAG.' };
const POP_ON_RETURN = 'Return must match the top frame: POP.';
const SLOT_POWERS = Object.freeze({ volley:'plate',net:'net',field:'lookup',halve:'',fusion:'' });
const PHASE_POWERS = Object.freeze({
1:Object.freeze(['lookup']),2:Object.freeze(['lookup','plate']),3:Object.freeze([]),4:Object.freeze(['pincer']),5:Object.freeze(['net','plate']),
});
const FICTION_LABEL = 'game fiction: two real ops interleaved';

function createKernel() {
return { trials:{ lookup:KERNEL_TRIALS,pincer:KERNEL_TRIALS,plate:KERNEL_TRIALS,net:KERNEL_TRIALS },used:[],root:{ n:0,you:0,stopped:false },assistUsed:false };
}
function kernelRefill(kernel) {
return { ...kernel,trials:createKernel().trials,used:[] };
}
function kernelUse(kernel,powers,won) {
const owned = ownedPowers(won);
const toSpend = [powers].flat().filter((power) => power && !owned.includes(power) && !kernel.used.includes(power));
if (toSpend.some((power) => kernel.trials[power] < 1)) return { kernel,ok:false };
const trials = { ...kernel.trials };
toSpend.forEach((power) => { trials[power] -= 1; });
return { kernel:toSpend.length > 0 ? { ...kernel,trials,used:[...kernel.used,...toSpend] } :kernel,ok:true };
}
function kernelBadge(kernel,power,won) {
return ownedPowers(won).includes(power) ? '' :kernel.trials[power] + ' left';
}
function rootTick(kernel,steps = 1) {
return kernel.root.stopped ? kernel :{ ...kernel,root:{ ...kernel.root,n:kernel.root.n + steps } };
}
function rootPace(phase) {
if (phase.n === HALVE_PHASE) return ROOT_HALVE_PACE;
return phase.fusion ? rootChecks(phase.fusion) :phase.clones.length;
}
function powerOfSlot(slot) {
return Object.hasOwn(SLOT_POWERS,slot) ? SLOT_POWERS[slot] :SLOT_POWERS.field;
}
function phasePowers(phase) {
return PHASE_POWERS[typeof phase === 'number' ? phase :phase.n];
}
function opPowers(phase) {
return phase.n > FIELD_PHASES ? [...phasePowers(phase)] :[powerOfSlot(slotOf(phase))];
}
function youOp(kernel,count) {
return kernel.root.stopped ? kernel :{ ...kernel,root:{ ...kernel.root,you:kernel.root.you + count } };
}
function rootStop(kernel) {
return { ...kernel,root:{ ...kernel.root,stopped:true } };
}

function swapOf(spec) {
if (!spec.swap) return null;
const [first,second] = spec.swap;
return { pair:['c' + first,'c' + second],after:SWAP_AFTER,left:SWAP_AFTER,done:false,code:CODES[first - 1] };
}
function makeClones(count) {
return CLONE_CELLS.slice(0,count).map((cell,index) => ({ id:'c' + (index + 1),kind:'clone',code:CODES[index],...cell,hp:1,awake:false }));
}
function createPhase(number) {
const spec = PHASES[number - 1];
return {
n:number,name:spec.name,clones:makeClones(spec.clones),asked:spec.asked.map((slot) => CODES[slot - 1]),tagged:[],t:0,ops:0,done:false,
volley:spec.volley ? createVolleyRun([spec.volley]) :null,swap:swapOf(spec),
halve:number === HALVE_PHASE ? createHalve() :null,fusion:FUSION_MAKERS[number] ? FUSION_MAKERS[number]() :null,
};
}
function askedCodes(phase) {
return phase.asked;
}
function cloneOfCode(phase,code) {
return phase.clones.find((clone) => clone.code === code);
}
function staleTags(phase) {
return phase.tagged.filter((id) => !phase.asked.includes(phase.clones.find((clone) => clone.id === id).code));
}
function exchanged(phase) {
const [idA,idB] = phase.swap.pair;
const [one,other] = [idA,idB].map((id) => phase.clones.find((clone) => clone.id === id));
if (one.hp <= 0 || other.hp <= 0) return phase.clones;
return phase.clones.map((clone) => {
if (clone.id === idA) return { ...clone,code:other.code };
return clone.id === idB ? { ...clone,code:one.code } :clone;
});
}
function swapTick(phase) {
if (!phase.swap || phase.swap.done) return phase;
const left = phase.swap.left - 1;
if (left > 0) return { ...phase,swap:{ ...phase.swap,left } };
return { ...phase,clones:exchanged(phase),swap:{ ...phase.swap,left:0,done:true } };
}
function swapLine(phase) {
if (!phase.swap) return '';
return phase.swap.done ? SWAP_TEXT.done :SWAP_TEXT.ahead + phase.swap.left;
}
function askedLeft(phase) {
return phase.asked.filter((code) => cloneOfCode(phase,code).hp > 0);
}
function volleyDone(phase) {
return Boolean(phase.volley) && phase.volley.state.status === 'won';
}
function fieldDone(phase) {
return phase.n <= FIELD_PHASES && askedLeft(phase).length === 0;
}
function complete(phase) {
if (phase.n === HALVE_PHASE) return phase.halve.status === 'won';
if (phase.fusion) return phase.fusion.done;
return fieldDone(phase) && (!phase.volley || volleyDone(phase));
}
function settled(phase) {
return { ...phase,done:complete(phase) };
}
function slotOf(phase,at = phase.t) {
if (phase.n === HALVE_PHASE) return 'halve';
if (phase.n > HALVE_PHASE) return 'fusion';
if (!phase.volley || volleyDone(phase)) return 'field';
if (fieldDone(phase)) return 'volley';
return at % 2 === 0 ? 'field' :'volley';
}
function rightVerb(run) {
return run.state.status === 'running' ? answerFor(run.state) :'';
}
function nextVerb(phase) {
const run = slotOf(phase) === 'volley' ? playVolley(phase.volley,rightVerb(phase.volley)).run :phase.volley;
return rightVerb(run).toUpperCase();
}
function fieldVerb(phase) {
const allTagged = askedLeft(phase).every((code) => phase.tagged.includes(cloneOfCode(phase,code).id));
return allTagged && phase.tagged.length > 0 ? 'RECALL ALL' :'TAG';
}
function telegraph(phase) {
if (phase.n > FIELD_PHASES) return { now:'',next:'',swap:'' };
const slot = slotOf(phase);
const now = slot === 'volley' ? rightVerb(phase.volley).toUpperCase() :fieldVerb(phase);
const upNext = slotOf(phase,phase.t + 1) === 'volley' ? nextVerb(phase) :fieldVerb(phase);
return { now:'NOW: ' + now,next:'NEXT: ' + upNext,swap:swapLine(phase) };
}
function outcome(phase,kind,extra = {}) {
return { phase,kind,hurt:false,note:'',...extra };
}
function slotMiss(phase) {
return outcome(phase,'slot',{ hurt:true,note:'Wrong tick: the ' + slotOf(phase) + ' goes now.' });
}
function advanced(phase,counted) {
return settled(swapTick({ ...phase,t:phase.t + 1,ops:phase.ops + counted }));
}
function tagClone(phase,id) {
const clone = phase.clones.find((one) => one.id === id);
if (phase.done || phase.n > FIELD_PHASES || !clone || clone.hp <= 0) return outcome(phase,'idle');
if (slotOf(phase) !== 'field') return slotMiss(phase);
const stale = staleTags(phase);
const live = phase.tagged.filter((tag) => !stale.includes(tag));
if (live.includes(id)) return outcome(phase,'already',{ note:clone.code + ' is already tagged.' });
if (live.length >= phase.asked.length) return outcome(phase,'full',{ note:phase.asked.length + ' codes asked. RECALL ALL.' });
if (!phase.asked.includes(clone.code)) return outcome({ ...phase,ops:phase.ops + 1 },'wrong',{ hurt:true,note:clone.code + ' was not asked. -1' });
const kept = phase.swap && clone.code === phase.swap.code ? live :phase.tagged;
return outcome(advanced({ ...phase,tagged:[...kept,id] },1),'tagged',{ note:'TAGGED ' + clone.code + '.' });
}
function recallAllClones(phase) {
if (phase.done || phase.n > FIELD_PHASES) return outcome(phase,'idle');
if (slotOf(phase) !== 'field') return slotMiss(phase);
if (phase.tagged.length === 0) return outcome(phase,'idle',{ note:KERNEL_TOASTS.nothing });
const stale = staleTags(phase);
if (stale.length > 0) {
const missed = { ...phase,tagged:phase.tagged.filter((id) => !stale.includes(id)),ops:phase.ops + phase.tagged.length };
return outcome(missed,'stale',{ hurt:true,note:phase.swap.code + SWAP_TEXT.moved });
}
const result = recallAll(phase.clones,phase.tagged);
const next = advanced({ ...phase,clones:result.actors,tagged:[] },result.visited);
return outcome(next,'recalled',{ note:'RECALL ALL: ' + result.visited + ' tags visited, ' + result.hits + ' hit.' });
}
function wrongVerbNote(right,verb) {
return right === 'pop' && verb === 'push' ? POP_ON_RETURN :'That one was a ' + right.toUpperCase() + '. -1';
}
function playVerb(phase,verb) {
if (phase.done || !phase.volley) return outcome(phase,'idle');
if (slotOf(phase) !== 'volley') return slotMiss(phase);
const result = playVolley(phase.volley,verb);
if (result.kind === 'idle') return outcome(phase,'idle');
if (result.kind === 'wrong') return outcome({ ...phase,volley:result.run },'wrong',{ hurt:true,note:wrongVerbNote(result.right,verb) });
return outcome(advanced({ ...phase,volley:result.run },1),result.kind,{ note:result.kind.toUpperCase() + '.' });
}
function pressHalve(phase,shot) {
if (phase.done || phase.n !== HALVE_PHASE) return outcome(phase,'idle');
const result = applyHalve(phase.halve,shot);
if (result.kind === 'idle') return outcome(phase,'idle');
const next = settled({ ...phase,halve:result.state,ops:result.state.shots });
return outcome(next,result.kind,{ hurt:halveMistake(result.kind),note:result.note });
}
function pressFusion(phase,move) {
if (phase.done || !phase.fusion) return outcome(phase,'idle');
const result = (phase.n === LOOP_PHASE ? pressLoop :pressDeque)(phase.fusion,move);
if (result.kind === 'none') return outcome(phase,'idle');
const next = settled({ ...phase,fusion:result.phase,ops:phase.ops + result.ops - phase.fusion.ops });
return outcome(next,result.kind,{ hurt:result.hurt,note:result.note });
}
function truthOf(value,from) {
return { value,from,minus:from - value };
}
function pressTruth(number) {
const moves = number === LOOP_PHASE ? solveLoopPinch(LOOP_ROW).moves :solveMonoDeque(DEQUE_STREAM).moves;
return truthOf(moves.indexOf(HINT_PRESS[number]) + 1,moves.length);
}
function phaseTruth(number) {
if (number === HALVE_PHASE) return truthOf(halveMiddle(createHalve()),HALVE.size);
if (number > HALVE_PHASE) return pressTruth(number);
const spec = PHASES[number - 1];
return truthOf(spec.asked[0],spec.clones);
}
function nextToTag(phase) {
const code = askedLeft(phase).find((one) => !phase.tagged.includes(cloneOfCode(phase,one).id));
return code ? cloneOfCode(phase,code).id :'';
}
function solvePhase1Line(phase = createPhase(1)) {
let state = phase;
let taps = 0;
while (!state.done && taps < PHASE1_SOLVER_LIMIT) {
const id = nextToTag(state);
state = (id ? tagClone(state,id) :recallAllClones(state)).phase;
taps += 1;
}
return { phase:state,taps };
}
function bruteLine(ops) {
return 'BRUTE: Five codes, twelve clones: sixty checks. You did ' + ops + '.';
}
function phaseToast(number) {
return phaseOpeningToast(number) ?? KERNEL_TOASTS['phase' + number];
}
function askLine(phase) {
if (phase.n === HALVE_PHASE) return halveAsk(phase.halve);
if (phase.n === LOOP_PHASE) return loopView(phase.fusion).ask;
if (phase.n === DEQUE_PHASE) return dequeView(phase.fusion).ask;
return 'ASK ' + askedLeft(phase).join(' ');
}
function halveAsk(halve) {
const view = readout(halve);
return view.range + SEPARATOR + 'LEFT ' + view.left;
}
function halveTele(halve) {
return 'SHOTS ' + halve.shots + SEPARATOR + 'SKIPS ' + halve.skips + SEPARATOR + 'PAR ' + HALVE.budget;
}
function viewParts(phase) {
if (phase.n === HALVE_PHASE) return { ask:askLine(phase),tele:halveTele(phase.halve),chips:[] };
if (phase.fusion) {
const view = (phase.n === LOOP_PHASE ? loopView :dequeView)(phase.fusion);
return { ask:view.ask,tele:view.tele,chips:view.chips };
}
const told = telegraph(phase);
return { ask:askLine(phase),tele:phase.n === FIELD_PHASES ? told.now + SEPARATOR + told.next :'',chips:[] };
}
function phaseDoneLines(phase) {
const brute = (text) => ({ who:BRUTE,text,kind:'info' });
if (phase.n === 1) return [brute(bruteLine(phase.ops))];
if (phase.n === HALVE_PHASE) {
const { shots,skips } = phase.halve;
return [...PATCH_FREED_LINES.map((line) => ({ ...line,kind:'info' })),brute(bruteHalveLine(shots - skips,skips))];
}
if (phase.n === LOOP_PHASE) return [brute(bruteLoopLine(phase.fusion))];
return phase.n === DEQUE_PHASE ? [brute(bruteDequeLine(phase.fusion))] :[];
}
function applyBruteAssist(kernel,ext,out) {
if (out.phase.n !== DEQUE_PHASE || !out.hurt || !bruteAssistTakes(ext,kernel.assistUsed)) return { kernel,out,taken:false };
return { kernel:{ ...kernel,assistUsed:true },out:{ ...out,hurt:false,note:BRUTE_ASSIST.taken },taken:true };
}

export {
KERNEL_TRIALS,CLONE_CELLS,PHASES,KERNEL_TOASTS,FICTION_LABEL,
createKernel,kernelRefill,kernelUse,kernelBadge,rootTick,rootPace,powerOfSlot,phasePowers,opPowers,youOp,rootStop,createPhase,askedCodes,slotOf,
telegraph,tagClone,recallAllClones,playVerb,pressHalve,pressFusion,phaseTruth,bruteLine,phaseToast,askLine,viewParts,phaseDoneLines,
applyBruteAssist,swapLine,solvePhase1Line,
};

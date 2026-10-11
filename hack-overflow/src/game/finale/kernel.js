import { registerActorKind } from '../actors.js';
import { BRIDGE,applyBridge,createBridge } from '../power/bridge.js';
import { ownedPowers } from '../power/powers.js';
import { recallAll } from '../power/recall.js';
import { createVolleyRun,playVolley } from '../power/volley.js';
import { answerFor } from '../rooms/shield.js';
import { BEATS } from './contract.js';

registerActorKind('clone',{});

const KERNEL_TRIALS = 3;
const CODES = Object.freeze(['K7','B2','Q9','M4','X1','D8','R5','T6','H3','F0','W2','Z9']);
const CLONE_LAYOUT = { rows:'14 15 16',cols:'21 23 25 27' };
const numbersOf = (text) => text.split(' ').map(Number);
const CLONE_CELLS = Object.freeze(numbersOf(CLONE_LAYOUT.rows).flatMap((row) => numbersOf(CLONE_LAYOUT.cols).map((col) => Object.freeze({ col,row }))));
const PHASE_SPECS = [
{ n:1,name:'LOOKUP',beat:BEATS.kernel[0],clones:12,asked:'5 2 9 11 7' },
{ n:2,name:'MIXED',beat:BEATS.kernel[1],clones:6,asked:'3 1 5 6',volley:'()[]' },
{ n:3,name:'PINCER',beat:BEATS.kernel[2],clones:0,asked:'' },
];
const PHASES = Object.freeze(PHASE_SPECS.map((spec) => Object.freeze({ ...spec,asked:spec.asked ? Object.freeze(numbersOf(spec.asked)) :Object.freeze([]) })));
const BRIDGE_MISTAKES = new Set(['wrong-left','wrong-right','early-fire']);
const FIRST_PRESS_TO_FIRE = 4;
const KERNEL_TOASTS = Object.freeze({
phase1:'ROOT: 12 clones. I ask five codes. Tag only those.',
phase2:'ROOT: tag the asked clones, and a volley between.',
phase3:'ROOT: two pointers. The sum is 11. Fire on equal.',
again:'ROOT: again. Trials refilled.',
nothing:'Nothing tagged. TAG a clone first.',
});
const FICTION_LABEL = 'game fiction: two real ops interleaved';

function createKernel() {
return { trials:{ lookup:KERNEL_TRIALS,pincer:KERNEL_TRIALS,plate:KERNEL_TRIALS },used:[],root:{ n:0,you:0,stopped:false } };
}
function kernelRefill(kernel) {
return { ...kernel,trials:createKernel().trials,used:[] };
}
function kernelUse(kernel,power,won) {
if (ownedPowers(won).includes(power) || kernel.used.includes(power)) return { kernel,ok:true };
if (kernel.trials[power] < 1) return { kernel,ok:false };
return { kernel:{ ...kernel,trials:{ ...kernel.trials,[power]:kernel.trials[power] - 1 },used:[...kernel.used,power] },ok:true };
}
function kernelBadge(kernel,power,won) {
return ownedPowers(won).includes(power) ? '' :kernel.trials[power] + ' left';
}
function rootTick(kernel,steps = 1) {
return kernel.root.stopped ? kernel :{ ...kernel,root:{ ...kernel.root,n:kernel.root.n + steps } };
}
function rootPace(phase) {
return phase.clones.length || BRIDGE.plates.length;
}
function powerOfSlot(slot) {
if (slot === 'bridge') return 'pincer';
return slot === 'volley' ? 'plate' :'lookup';
}
function youOp(kernel,count) {
return kernel.root.stopped ? kernel :{ ...kernel,root:{ ...kernel.root,you:kernel.root.you + count } };
}
function rootStop(kernel) {
return { ...kernel,root:{ ...kernel.root,stopped:true } };
}

function makeClones(count) {
return CLONE_CELLS.slice(0,count).map((cell,index) => ({ id:'c' + (index + 1),kind:'clone',code:CODES[index],...cell,hp:1,awake:false }));
}
function createPhase(number) {
const spec = PHASES[number - 1];
return {
n:number,name:spec.name,clones:makeClones(spec.clones),asked:spec.asked.map((slot) => CODES[slot - 1]),tagged:[],t:0,ops:0,done:false,
volley:spec.volley ? createVolleyRun([spec.volley]) :null,bridge:number === PHASES.length ? createBridge() :null,
};
}
function askedCodes(phase) {
return phase.asked;
}
function cloneOfCode(phase,code) {
return phase.clones.find((clone) => clone.code === code);
}
function askedLeft(phase) {
return phase.asked.filter((code) => cloneOfCode(phase,code).hp > 0);
}
function volleyDone(phase) {
return Boolean(phase.volley) && phase.volley.state.status === 'won';
}
function fieldDone(phase) {
return phase.n < PHASES.length && askedLeft(phase).length === 0;
}
function complete(phase) {
if (phase.n === PHASES.length) return phase.bridge.status === 'won';
return fieldDone(phase) && (!phase.volley || volleyDone(phase));
}
function settled(phase) {
return { ...phase,done:complete(phase) };
}
function slotOf(phase,at = phase.t) {
if (phase.n === PHASES.length) return 'bridge';
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
const slot = slotOf(phase);
const now = slot === 'volley' ? rightVerb(phase.volley).toUpperCase() :fieldVerb(phase);
const upNext = slotOf(phase,phase.t + 1) === 'volley' ? nextVerb(phase) :fieldVerb(phase);
return { now:'NOW: ' + now,next:'NEXT: ' + upNext };
}
function outcome(phase,kind,extra = {}) {
return { phase,kind,hurt:false,note:'',...extra };
}
function slotMiss(phase) {
return outcome(phase,'slot',{ hurt:true,note:'Wrong tick: the ' + slotOf(phase) + ' goes now.' });
}
function advanced(phase,counted) {
return settled({ ...phase,t:phase.t + 1,ops:phase.ops + counted });
}
function tagClone(phase,id) {
const clone = phase.clones.find((one) => one.id === id);
if (phase.done || phase.n === PHASES.length || !clone || clone.hp <= 0) return outcome(phase,'idle');
if (slotOf(phase) !== 'field') return slotMiss(phase);
if (phase.tagged.includes(id)) return outcome(phase,'already',{ note:clone.code + ' is already tagged.' });
if (phase.tagged.length >= phase.asked.length) return outcome(phase,'full',{ note:phase.asked.length + ' codes asked. RECALL ALL.' });
if (!phase.asked.includes(clone.code)) return outcome({ ...phase,ops:phase.ops + 1 },'wrong',{ hurt:true,note:clone.code + ' was not asked. -1' });
return outcome(advanced({ ...phase,tagged:[...phase.tagged,id] },1),'tagged',{ note:'TAGGED ' + clone.code + '.' });
}
function recallAllClones(phase) {
if (phase.done || phase.n === PHASES.length) return outcome(phase,'idle');
if (slotOf(phase) !== 'field') return slotMiss(phase);
if (phase.tagged.length === 0) return outcome(phase,'idle',{ note:KERNEL_TOASTS.nothing });
const result = recallAll(phase.clones,phase.tagged);
const next = advanced({ ...phase,clones:result.actors,tagged:[] },result.visited);
return outcome(next,'recalled',{ note:'RECALL ALL: ' + result.visited + ' tags visited, ' + result.hits + ' hit.' });
}
function playVerb(phase,verb) {
if (phase.done || !phase.volley) return outcome(phase,'idle');
if (slotOf(phase) !== 'volley') return slotMiss(phase);
const result = playVolley(phase.volley,verb);
if (result.kind === 'idle') return outcome(phase,'idle');
if (result.kind === 'wrong') return outcome({ ...phase,volley:result.run },'wrong',{ hurt:true,note:'That one was a ' + result.right.toUpperCase() + '. -1' });
return outcome(advanced({ ...phase,volley:result.run },1),result.kind,{ note:result.kind.toUpperCase() + '.' });
}
function pressBridge(phase,move) {
if (phase.done || phase.n !== PHASES.length) return outcome(phase,'idle');
const result = applyBridge(phase.bridge,move);
if (result.kind === 'none') return outcome(phase,'idle');
const next = settled({ ...phase,bridge:result.state,ops:phase.ops + 1 });
return outcome(next,result.kind,{ hurt:BRIDGE_MISTAKES.has(result.kind),note:result.note });
}
function phaseTruth(number) {
const spec = PHASES[number - 1];
if (number === PHASES.length) return { value:FIRST_PRESS_TO_FIRE,from:BRIDGE.plates.length,minus:BRIDGE.plates.length - FIRST_PRESS_TO_FIRE };
return { value:spec.asked[0],from:spec.clones,minus:spec.clones - spec.asked[0] };
}
function bruteLine(ops) {
return 'BRUTE: Five codes, twelve clones: sixty checks. You did ' + ops + '.';
}
function phaseToast(number) {
return KERNEL_TOASTS['phase' + number];
}
function askLine(phase) {
return phase.n === PHASES.length ? 'SUM 11' :'ASK ' + askedLeft(phase).join(' ');
}

export {
KERNEL_TRIALS,CLONE_CELLS,PHASES,KERNEL_TOASTS,FICTION_LABEL,
createKernel,kernelRefill,kernelUse,kernelBadge,rootTick,rootPace,powerOfSlot,youOp,rootStop,createPhase,askedCodes,slotOf,telegraph,
tagClone,recallAllClones,playVerb,pressBridge,phaseTruth,bruteLine,phaseToast,askLine,
};

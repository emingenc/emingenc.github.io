import {
  SHIELD_DO,kernelBadge,phasePowers,playVerb,pressFusion,pressHalve,recallAllClones,tagClone,telegraph,viewParts,
} from '../game/finale/kernel.js';
import { uiHalveView } from './grid-kernel-halve.js';

const SEPARATOR = ' . ';
const LOOKUP = 1;
const SHIELD = 2;
const HALVE_PHASE = 3;
const VOLLEY_VERBS = [{ verb:'push',label:'PUSH' },{ verb:'pop',label:'POP' },{ verb:'clear',label:'CLEAR' }];

function uiTrialsText(app) {
const { kernel,progress } = app.game;
const badges = phasePowers(kernel.n).map((power) => [power.toUpperCase(),kernelBadge(kernel,power,progress.won)]);
return badges.filter(([,badge]) => badge).map(([name,badge]) => name + ' ' + badge).join(SEPARATOR);
}
function uiTagChips(phase,op) {
return phase.clones.filter((clone) => clone.hp > 0).map((clone) => ({
id:'tag-' + clone.id,label:clone.code,aria:'Tag ' + clone.code,selected:phase.tagged.includes(clone.id),run:() => op((now) => tagClone(now,clone.id)),
}));
}
function uiRecallChip(op) {
return { id:'recall',label:'RECALL ALL',aria:'Recall all tagged',run:() => op(recallAllClones) };
}
function uiVerbChips(phase,op) {
if (!phase.volley) return [];
return VOLLEY_VERBS.map((one) => ({ id:'verb-' + one.verb,label:one.label,run:() => op((now) => playVerb(now,one.verb)) }));
}
function uiFieldChips(phase,op) {
return [uiRecallChip(op),...uiVerbChips(phase,op),...uiTagChips(phase,op)];
}
function uiFusionChips(parts,op) {
return parts.chips.map((chip) => ({ id:chip.id,label:chip.label,aria:chip.aria,run:() => op((now) => pressFusion(now,chip.move)) }));
}
function uiFieldTele(phase) {
const told = telegraph(phase);
if (phase.n === SHIELD) return told.now + SEPARATOR + told.next;
return [told.swap,told.now].filter(Boolean).join(SEPARATOR);
}
function uiPartsOf(app,op) {
const phase = app.game.kernel.phase;
if (phase.n === HALVE_PHASE) return uiHalveView(app,(entry) => op((now) => pressHalve(now,entry)));
const parts = viewParts(phase);
const field = phase.n === LOOKUP || phase.n === SHIELD;
return {
ask:parts.ask,tele:field ? uiFieldTele(phase) :parts.tele,note:uiTrialsText(app),fiction:phase.n === SHIELD ? SHIELD_DO :'',
chips:field ? uiFieldChips(phase,op) :uiFusionChips(parts,op),
};
}
function uiAutoParts(kernel) {
const auto = kernel.auto;
if (!auto) return {};
const hint = auto.hint();
return { auto:auto.node,hint:hint ? 'YOUR CALL: ' + hint : '' };
}
function uiKernelView(app,op) {
const kernel = app.game.kernel;
return {
n:kernel.n,head:'K' + kernel.n + ' ' + kernel.phase.name,count:'ROOT ' + kernel.root.n + SEPARATOR + 'YOU ' + kernel.root.you,
...uiPartsOf(app,op),...uiAutoParts(kernel),
};
}

export { uiFieldTele,uiKernelView };

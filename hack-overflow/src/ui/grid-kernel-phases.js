import { hasBeat,withBeat } from '../game/ext/ops.js';
import { KERNEL_FRONT } from '../game/finale/roadback.js';
import {
  FICTION_LABEL,KERNEL_TOASTS,PHASES,askLine,bruteLine,createKernel,createPhase,kernelBadge,kernelRefill,kernelUse,phaseToast,phaseTruth,playVerb,
  powerOfSlot,pressBridge,recallAllClones,rootPace,rootStop,rootTick,slotOf,tagClone,telegraph,youOp,
} from '../game/finale/kernel.js';
import { uiGhostOffer } from './finale-offer.js';
import { uiRenderKeepingFocus } from './app.js';
import { uiCommitExt } from './ext-storage.js';
import { uiCastSay } from './grid-cast-act.js';
import { uiDropKernel } from './grid-kernel-chips.js';
import { uiCarryToFront,uiSay,uiSeams } from './grid-kernel-common.js';
import { uiKernelHurt,uiSetRevive } from './grid-kernel-hurt.js';

const PHASE_POWERS = { 1:['lookup'],2:['lookup','plate'],3:['pincer'] };
const VOLLEY_VERBS = [{ verb:'push',label:'PUSH' },{ verb:'pop',label:'POP' },{ verb:'clear',label:'CLEAR' }];
const BRIDGE_MOVES = [
{ move:'l',label:'L>',aria:'Move the left pointer right' },{ move:'fire',label:'FIRE',aria:'Fire' },{ move:'r',label:'<R',aria:'Move the right pointer left' },
];
const SEPARATOR = ' . ';
const MIXED = 2;
const LOOKUP = 1;

function uiUnder(app) {
return Boolean(app.story) || Boolean(app.game.travelOpen);
}
function uiSettle(app,result) {
const kernel = app.game.kernel;
app.game.kernel = { ...kernel,settle:null };
if (kernel.settle) kernel.settle(result);
}
function uiTelegraphText(phase) {
const told = telegraph(phase);
return told.now + SEPARATOR + told.next;
}
function uiTrialsText(app) {
const { kernel,progress } = app.game;
const badges = PHASE_POWERS[kernel.n].map((power) => [power.toUpperCase(),kernelBadge(kernel,power,progress.won)]);
return badges.filter(([,badge]) => badge).map(([name,badge]) => name + ' ' + badge).join(SEPARATOR);
}
function uiRunAct(app,act) {
return function () {
if (uiUnder(app) || !app.game.kernel.settle) return;
uiKernelOp(app,act);
};
}
function uiTagChips(app,phase) {
return phase.clones.filter((clone) => clone.hp > 0).map((clone) => ({
id:'tag-' + clone.id,label:clone.code,aria:'Tag ' + clone.code,selected:phase.tagged.includes(clone.id),
run:uiRunAct(app,{ slot:'field',play:(now) => tagClone(now,clone.id) }),
}));
}
function uiRecallChip(app) {
return { id:'recall',label:'RECALL ALL',aria:'Recall all tagged',run:uiRunAct(app,{ slot:'field',play:recallAllClones }) };
}
function uiVerbChips(app,phase) {
if (!phase.volley) return [];
return VOLLEY_VERBS.map((one) => ({ id:'verb-' + one.verb,label:one.label,run:uiRunAct(app,{ slot:'volley',play:(now) => playVerb(now,one.verb) }) }));
}
function uiBridgeChips(app,phase) {
if (!phase.bridge) return [];
return BRIDGE_MOVES.map((one) => ({ id:'bridge-' + one.move,label:one.label,aria:one.aria,run:uiRunAct(app,{ slot:'bridge',play:(now) => pressBridge(now,one.move) }) }));
}
function uiChipsOf(app,phase) {
if (phase.bridge) return uiBridgeChips(app,phase);
return [uiRecallChip(app),...uiVerbChips(app,phase),...uiTagChips(app,phase)];
}
function uiBridgeAsk(phase) {
const { l,r } = phase.bridge;
return askLine(phase) + SEPARATOR + 'L ' + l + SEPARATOR + 'R ' + r;
}
function uiViewOf(app) {
const kernel = app.game.kernel;
const phase = kernel.phase;
return {
n:kernel.n,head:'K' + kernel.n + ' ' + phase.name,count:'ROOT ' + kernel.root.n + SEPARATOR + 'YOU ' + kernel.root.you,
ask:phase.bridge ? uiBridgeAsk(phase) :askLine(phase),tele:kernel.n === MIXED ? uiTelegraphText(phase) :'',
note:uiTrialsText(app),fiction:kernel.n === MIXED ? FICTION_LABEL :'',chips:uiChipsOf(app,phase),
};
}
function uiSpend(app,power) {
const game = app.game;
const used = kernelUse(game.kernel,power,game.progress.won);
if (used.ok) game.kernel = used.kernel;
return used.ok;
}
function uiNoteOf(out,phase) {
if (out.hurt || phase.n !== MIXED) return out.note;
return uiTelegraphText(phase);
}
function uiSayNote(app,out) {
const text = uiNoteOf(out,out.phase);
if (text) uiSay(app,text,out.hurt ? 'warn' :'info');
}
function uiCount(app,out) {
const game = app.game;
const gained = out.phase.ops - game.kernel.phase.ops;
game.kernel = { ...game.kernel,phase:out.phase,root:rootTick(youOp(game.kernel,gained),rootPace(out.phase)).root };
}
function uiBlow(app) {
const blow = uiKernelHurt(app,app.game.avatar.pos);
if (blow.revived) uiSettle(app,'down');
return blow.revived;
}
function uiAfterOp(app,out) {
if (out.hurt && uiBlow(app)) return;
if (out.phase.done) uiSettle(app,'won');
uiRenderKeepingFocus(app);
}
function uiKernelOp(app,act) {
if (!uiSpend(app,powerOfSlot(act.slot))) return;
const out = act.play(app.game.kernel.phase);
if (out.kind === 'idle') {
if (out.note) uiSay(app,out.note,'info');
return;
}
uiCount(app,out);
uiSayNote(app,out);
uiAfterOp(app,out);
}
function uiBeginAttempt(app,spec) {
const game = app.game;
const record = kernelRefill({ ...game.kernel,root:createKernel().root });
const attempt = game.kernel.n === spec.n ? game.kernel.attempt + 1 : 1;
game.kernel = { ...record,n:spec.n,attempt,phase:createPhase(spec.n),active:true,settle:null };
uiSeams(app).view = () => uiViewOf(app);
uiCarryToFront(app);
}
function uiAttempt(app,spec) {
return new Promise(function (resolve) {
uiBeginAttempt(app,spec);
app.game.kernel = { ...app.game.kernel,settle:resolve };
uiRenderKeepingFocus(app);
});
}
function uiOffer(app,spec) {
return uiGhostOffer(app,{ kind:'phase',truth:phaseTruth(spec.n) });
}
function uiClearStrip(app) {
if (app.game.kernelUi) app.game.kernelUi.view = null;
uiRenderKeepingFocus(app);
}
async function uiWon(app,spec) {
const game = app.game;
game.kernel = rootStop(game.kernel);
uiClearStrip(app);
uiCommitExt(app,withBeat(game.ext,spec.beat));
if (spec.n === LOOKUP) await uiCastSay(app,{ text:bruteLine(game.kernel.phase.ops),kind:'info' });
}
async function uiPlayPhase(app,spec) {
await uiCastSay(app,{ text:phaseToast(spec.n),kind:'info' });
await uiOffer(app,spec);
let result = await uiAttempt(app,spec);
while (result !== 'won') {
await uiCastSay(app,{ text:KERNEL_TOASTS.again,kind:'warn' });
result = await uiAttempt(app,spec);
}
await uiWon(app,spec);
}
function uiInstall(app) {
const game = app.game;
game.kernel = { ...createKernel(),n:0,attempt:0,phase:null,active:false,settle:null };
uiSetRevive(app,KERNEL_FRONT);
uiSeams(app);
}
function uiUninstall(app) {
const game = app.game;
uiSetRevive(app,null);
game.kernel = { ...game.kernel,active:false,settle:null };
uiDropKernel(app);
uiRenderKeepingFocus(app);
}
async function uiKernelPhases(app) {
const game = app.game;
uiInstall(app);
for (const spec of PHASES.filter((one) => !hasBeat(game.ext,one.beat))) {
if (app.game !== game) return;
await uiPlayPhase(app,spec);
}
if (app.game === game) uiUninstall(app);
}

export { uiKernelPhases };

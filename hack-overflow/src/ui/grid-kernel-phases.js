import { hasBeat,withBeat } from '../game/ext/ops.js';
import { KERNEL_FRONT } from '../game/finale/roadback.js';
import { phaseCard } from '../game/finale/kernel-card.js';
import { freeTrap } from '../game/finale/kernel-trap.js';
import {
  KERNEL_TOASTS,PHASES,applyBruteAssist,createKernel,createPhase,kernelRefill,kernelUse,opPowers,phaseToast,phaseTruth,
  rootPace,rootStop,rootTick,youOp,
} from '../game/finale/kernel.js';
import { BRUTE_ASSIST,countersignDone } from '../game/finale/root-lines.js';
import { uiGhostOffer } from './finale-offer.js';
import { uiRenderKeepingFocus } from './app.js';
import { uiCue } from './audio-wire.js';
import { uiCommitExt } from './ext-storage.js';
import { uiCastSay } from './grid-cast-act.js';
import { uiDropKernel } from './grid-kernel-chips.js';
import { uiCarryToFront,uiSay,uiSeams } from './grid-kernel-common.js';
import { uiHalveReset,uiHalveShot } from './grid-kernel-halve.js';
import { uiKernelAuto } from './grid-kernel-auto.js';
import { uiShowPhaseCard } from './grid-kernel-card.js';
import { uiKernelHurt,uiSetRevive } from './grid-kernel-hurt.js';
import { uiFieldTele,uiKernelView } from './grid-kernel-view.js';

const SHIELD = 2;
const HALVE_PHASE = 3;
const DEQUE_PHASE = 5;
const AUTO_PHASES = Object.freeze([SHIELD,HALVE_PHASE,DEQUE_PHASE]);
const OFFER_ONCE = 'k-offer';
const OFFER_DEFAULT = 'verify';
const OUTSIDE = 'outside';
const NOT_GOOD = new Set([OUTSIDE,'already','full']);
const PENALTY_TAIL = / -1$/;

function uiUnder(app) {
return Boolean(app.story) || Boolean(app.game.travelOpen);
}
function uiSettle(app,result) {
const kernel = app.game.kernel;
if (kernel.auto) kernel.auto.stop();
app.game.kernel = { ...kernel,settle:null };
if (kernel.settle) kernel.settle(result);
}
function uiSpend(app,powers) {
const game = app.game;
const used = kernelUse(game.kernel,powers,game.progress.won);
if (used.ok) game.kernel = used.kernel;
return used.ok;
}
function uiNoteOf(out) {
if (out.free) return out.note.replace(PENALTY_TAIL,'');
if (out.hurt || out.phase.n !== SHIELD) return out.note;
return uiFieldTele(out.phase);
}
function uiSayNote(app,out) {
const text = uiNoteOf(out);
if (text) uiSay(app,text,out.hurt || out.free ? 'warn' : 'info');
}
function uiGood(app,out) {
if (out.hurt || out.free || NOT_GOOD.has(out.kind)) return;
const kernel = app.game.kernel;
app.game.kernel = { ...kernel,good:(kernel.good ?? 0) + 1 };
}
function uiCount(app,out) {
const game = app.game;
const gained = out.phase.ops - game.kernel.phase.ops;
game.kernel = { ...game.kernel,phase:out.phase,root:rootTick(youOp(game.kernel,gained),rootPace(out.phase)).root };
}
function uiAssist(app,out) {
const game = app.game;
const result = applyBruteAssist(game.kernel,game.ext,out);
game.kernel = result.kernel;
return result.out;
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
function uiPress(app,spec) {
const trap = freeTrap(app.game.kernel.seenTraps ?? [],spec.before,spec.out);
if (!uiSpend(app,opPowers(spec.before))) return;
app.game.kernel = { ...app.game.kernel,seenTraps:trap.seen };
const halveShot = trap.out.phase.n === HALVE_PHASE && trap.out.kind !== OUTSIDE;
if (halveShot) uiHalveShot(app,trap.out);
uiCount(app,trap.out);
uiGood(app,trap.out);
if (halveShot) uiHalveReset(app);
const shown = uiAssist(app,trap.out);
uiSayNote(app,shown);
uiAfterOp(app,shown);
}
function uiKernelOp(app,play) {
if (uiUnder(app) || !app.game.kernel.settle) return;
const before = app.game.kernel.phase;
const out = play(before);
if (out.kind === 'idle') {
if (out.note) uiSay(app,out.note,'info');
return;
}
uiPress(app,{ before,out });
}
function uiHandPress(app,play) {
uiKernelOp(app,play);
const kernel = app.game.kernel;
if (kernel && kernel.auto) kernel.auto.afterPress();
}
function uiMakeAuto(app,number) {
if (!AUTO_PHASES.includes(number)) return null;
return uiKernelAuto(app,{ op:(play) => uiKernelOp(app,play),number });
}
function uiBeginAttempt(app,spec) {
const game = app.game;
if (game.kernel.auto) game.kernel.auto.stop();
const record = kernelRefill({ ...game.kernel,root:createKernel().root });
const attempt = game.kernel.n === spec.n ? game.kernel.attempt + 1 : 1;
game.kernel = { ...record,n:spec.n,attempt,cursor:null,phase:createPhase(spec.n),active:true,settle:null,good:0,auto:uiMakeAuto(app,spec.n) };
uiSeams(app).view = () => uiKernelView(app,(play) => uiHandPress(app,play));
uiCarryToFront(app);
}
function uiAttempt(app,spec) {
return new Promise(function (resolve) {
uiBeginAttempt(app,spec);
app.game.kernel = { ...app.game.kernel,settle:resolve };
uiRenderKeepingFocus(app);
if (app.game.kernel.auto) app.game.kernel.auto.start();
});
}
function uiOffer(app,spec) {
return uiGhostOffer(app,{ kind:'phase',truth:phaseTruth(spec.n),once:OFFER_ONCE,defaultPick:OFFER_DEFAULT });
}
function uiClearStrip(app) {
if (app.game.kernelUi) app.game.kernelUi.view = null;
uiRenderKeepingFocus(app);
}
async function uiWon(app) {
const game = app.game;
const phase = game.kernel.phase;
game.kernel = rootStop(game.kernel);
uiClearStrip(app);
uiCommitExt(app,withBeat(game.ext,PHASES[phase.n - 1].beat));
uiCue(app,'ROOT_PHASE');
if (app.game === game) await uiShowPhaseCard(app,phaseCard(phase,game.kernel));
}
async function uiBruteOpening(app,spec) {
const game = app.game;
if (spec.n === DEQUE_PHASE && countersignDone(game.ext) && !game.kernel.assistUsed) await uiCastSay(app,{ text:BRUTE_ASSIST.opening,kind:'info' });
}
async function uiPlayPhase(app,spec) {
await uiCastSay(app,{ text:phaseToast(spec.n),kind:'info' });
await uiBruteOpening(app,spec);
await uiOffer(app,spec);
let result = await uiAttempt(app,spec);
while (result !== 'won') {
await uiCastSay(app,{ text:KERNEL_TOASTS.again,kind:'warn' });
result = await uiAttempt(app,spec);
}
await uiWon(app);
}
function uiHangEscape(app,ui) {
const game = app.game;
const onKey = function (event) {
if (app.game !== game) document.removeEventListener('keydown',onKey);
else if (game.kernel && game.kernel.auto) game.kernel.auto.handleKey(event);
};
document.addEventListener('keydown',onKey);
ui.undo.push(() => document.removeEventListener('keydown',onKey));
}
function uiInstall(app) {
const game = app.game;
game.kernel = { ...createKernel(),n:0,attempt:0,phase:null,active:false,settle:null,good:0,seenTraps:[],manual:false,auto:null };
uiSetRevive(app,KERNEL_FRONT);
uiHangEscape(app,uiSeams(app));
}
function uiUninstall(app) {
const game = app.game;
uiSetRevive(app,null);
if (game.kernel.auto) game.kernel.auto.stop();
game.kernel = { ...game.kernel,active:false,settle:null,auto:null };
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

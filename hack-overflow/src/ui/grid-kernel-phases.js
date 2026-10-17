import { hasBeat,withBeat } from '../game/ext/ops.js';
import { KERNEL_FRONT } from '../game/finale/roadback.js';
import {
  KERNEL_TOASTS,PHASES,applyBruteAssist,createKernel,createPhase,kernelRefill,kernelUse,opPowers,phaseDoneLines,phaseToast,phaseTruth,
  rootPace,rootStop,rootTick,youOp,
} from '../game/finale/kernel.js';
import { BRUTE_ASSIST,countersignDone,spokenLine } from '../game/finale/root-lines.js';
import { uiGhostOffer } from './finale-offer.js';
import { uiRenderKeepingFocus } from './app.js';
import { uiCue } from './audio-wire.js';
import { uiCommitExt } from './ext-storage.js';
import { uiCastSay } from './grid-cast-act.js';
import { uiDropKernel } from './grid-kernel-chips.js';
import { uiCarryToFront,uiSay,uiSeams } from './grid-kernel-common.js';
import { uiHalveReset } from './grid-kernel-halve.js';
import { uiKernelHurt,uiSetRevive } from './grid-kernel-hurt.js';
import { uiFieldTele,uiKernelView } from './grid-kernel-view.js';

const SHIELD = 2;
const HALVE_PHASE = 3;
const DEQUE_PHASE = 5;
const PATCH_SPEAKER = 'PATCH';

function uiUnder(app) {
return Boolean(app.story) || Boolean(app.game.travelOpen);
}
function uiSettle(app,result) {
const kernel = app.game.kernel;
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
if (out.hurt || out.phase.n !== SHIELD) return out.note;
return uiFieldTele(out.phase);
}
function uiSayNote(app,out) {
const text = uiNoteOf(out);
if (text) uiSay(app,text,out.hurt ? 'warn' :'info');
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
function uiKernelOp(app,play) {
if (uiUnder(app) || !app.game.kernel.settle) return;
const before = app.game.kernel.phase;
const out = play(before);
if (out.kind === 'idle') {
if (out.note) uiSay(app,out.note,'info');
return;
}
if (!uiSpend(app,opPowers(before))) return;
uiCount(app,out);
if (out.phase.n === HALVE_PHASE && out.kind !== 'outside') uiHalveReset(app);
const shown = uiAssist(app,out);
uiSayNote(app,shown);
uiAfterOp(app,shown);
}
function uiBeginAttempt(app,spec) {
const game = app.game;
const record = kernelRefill({ ...game.kernel,root:createKernel().root });
const attempt = game.kernel.n === spec.n ? game.kernel.attempt + 1 : 1;
game.kernel = { ...record,n:spec.n,attempt,cursor:null,phase:createPhase(spec.n),active:true,settle:null };
uiSeams(app).view = () => uiKernelView(app,(play) => uiKernelOp(app,play));
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
function uiDoneKind(line) {
return line.who === PATCH_SPEAKER ? 'reward' :line.kind;
}
async function uiWon(app) {
const game = app.game;
const phase = game.kernel.phase;
game.kernel = rootStop(game.kernel);
uiClearStrip(app);
uiCommitExt(app,withBeat(game.ext,PHASES[phase.n - 1].beat));
uiCue(app,'ROOT_PHASE');
for (const line of phaseDoneLines(phase)) {
if (app.game !== game) return;
await uiCastSay(app,{ text:spokenLine(line),kind:uiDoneKind(line) });
}
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

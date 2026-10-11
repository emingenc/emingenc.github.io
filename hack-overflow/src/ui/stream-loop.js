import { CONTEXT_STREAM } from '../game/labs/data/context-stream.js';
import { advance,reduce,resultOf } from '../game/labs/stream-sim.js';
import { allStagesCleared,recordStream } from '../game/labs/stream-reward.js';
import { uiCommitSave } from './game-state.js';
import { uiRenderApp } from './app.js';
import { uiLabPayRank } from './lab-rank.js';
import { uiStoryLabFinish } from './machine-dialogue.js';
import { rigOf } from '../game/rig-catalog.js';
import { uiStreamCue,uiStreamPaint } from './stream-paint.js';


const MAX_DT_MS = 100;
const FALLBACK_FRAME_MS = 16;
const NO_HANDLE = null;

function uiStreamDefaultNow() {
return typeof performance !== 'undefined' ? performance.now() :Date.now();
}
function uiStreamDefaultRaf(callback) {
if (typeof window.requestAnimationFrame === 'function') return window.requestAnimationFrame(callback);
return window.setTimeout(function () { callback(uiStreamDefaultNow()); },FALLBACK_FRAME_MS);
}
function uiStreamDefaultCancel(handle) {
if (typeof window.cancelAnimationFrame === 'function') window.cancelAnimationFrame(handle);
else window.clearTimeout(handle);
}
const UI_STREAM_DEFAULT_CLOCK = { raf:uiStreamDefaultRaf,cancel:uiStreamDefaultCancel,now:uiStreamDefaultNow };
const uiStreamLoop = { handle:NO_HANDLE,last:0,app:null,clock:UI_STREAM_DEFAULT_CLOCK };

function uiStreamSetClock(clock) {
uiStreamLoop.clock = clock || UI_STREAM_DEFAULT_CLOCK;
}
function uiStreamIsPlaying(app) {
const stream = app.stream;
return Boolean(stream && stream.view === 'play' && stream.sim && stream.sim.status === 'running');
}
function uiStreamAward(app,result,spoken) {
const stream = app.stream;
if (stream.awarded || result.stars <= 0) return;
stream.awarded = true;
const stageId = stream.sim.stageId;
uiCommitSave(app,recordStream(app.game.save,{ stageId,stars:result.stars,score:result.score }).save);
uiLabPayRank(app,'stream',{ rig:rigOf('stream'),levelId:stageId,stars:result.stars,spoken });
}
const STREAM_MAX_STARS = 3;
function uiStreamSpoken(result) {
if (result.stars <= 0) return 'Stream failed. ' + (result.failure ? result.failure.text :'');
const held = result.keysHeld + ' of ' + result.keysTotal + ' keys held.';
return 'Stage clear. ' + result.stars + ' of ' + STREAM_MAX_STARS + ' stars. Score ' + result.score + '. ' + held;
}
function uiStreamFocusAfter(app,result) {
const hasNext = app.stream.stageIndex < app.stream.stageCount - 1;
return result.stars > 0 && hasNext ? 'stream-next' :'stream-replay';
}
function uiStreamFinish(app) {
const stream = app.stream;
uiStreamLoopStop();
const result = resultOf(stream.sim,stream.sim.stage);
stream.view = 'result';
stream.result = result;
stream.nodes = null;
stream.pointers = {};
stream.rank = null;
app.lastFocusKey = uiStreamFocusAfter(app,result);
app.pendingAnnounce = uiStreamSpoken(result);
uiStreamAward(app,result,app.pendingAnnounce);
if (allStagesCleared(app.game.save,CONTEXT_STREAM.stages.map(function (stage) { return stage.id; }))) uiStoryLabFinish(app,CONTEXT_STREAM.id);
uiRenderApp(app);
}
function uiStreamApplySim(app,next) {
const stream = app.stream;
const gain = next.comboPoints - stream.sim.comboPoints;
stream.sim = next;
uiStreamCue(stream.nodes,next.events,{ gain });
uiStreamPaint(stream.nodes,next);
if (next.status !== 'running') uiStreamFinish(app);
}
function uiStreamAct(app,action) {
if (!uiStreamIsPlaying(app)) return false;
const next = reduce(app.stream.sim,action);
if (next === app.stream.sim) return false;
uiStreamApplySim(app,next);
return true;
}
function uiStreamBook() {
uiStreamLoop.handle = uiStreamLoop.clock.raf(uiStreamFrame);
}
function uiStreamFrame(stamp) {
const loop = uiStreamLoop;
loop.handle = NO_HANDLE;
const app = loop.app;
if (!app || !uiStreamIsPlaying(app)) return;
const now = Number.isFinite(stamp) ? stamp :loop.clock.now();
const dt = Math.min(MAX_DT_MS,Math.max(0,now - loop.last));
loop.last = now;
uiStreamApplySim(app,advance(app.stream.sim,dt));
if (loop.app === app && uiStreamIsPlaying(app) && loop.handle === NO_HANDLE) uiStreamBook();
}
function uiStreamLoopStop() {
const loop = uiStreamLoop;
if (loop.handle !== NO_HANDLE) loop.clock.cancel(loop.handle);
loop.handle = NO_HANDLE;
loop.app = null;
}
function uiStreamLoopStart(app) {
const loop = uiStreamLoop;
const running = loop.app === app && loop.handle !== NO_HANDLE;
if (!running) {
uiStreamLoopStop();
loop.app = app;
loop.last = loop.clock.now();
}
uiStreamPaint(app.stream.nodes,app.stream.sim);
if (!running) uiStreamBook();
}

export { uiStreamSetClock,uiStreamIsPlaying,uiStreamAct,uiStreamLoopStart,uiStreamLoopStop };

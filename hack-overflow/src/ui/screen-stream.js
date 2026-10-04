import { CONTEXT_STREAM } from '../game/labs/data/context-stream.js';
import { createRun } from '../game/labs/stream-sim.js';
import { uiRenderApp } from './app.js';
import { uiEnterGrid } from './screen-grid.js';
import { uiStoryLabOpen } from './story-dialogue.js';
import { uiStreamAct,uiStreamIsPlaying,uiStreamLoopStart,uiStreamLoopStop } from './stream-loop.js';
import { uiStreamFocusFor,uiStreamRenderView } from './stream-render.js';

const STREAM_SEED_STRIDE = 1000;
const STREAM_FLICK_PX = 24;
const STREAM_HIT_WINDOW = 3;
const STREAM_STAGE_ACTION = /^stream-stage-(\d+)$/;
const STREAM_SPOKEN = 'The Intake. Real-time arcade: the feed will not wait. GHOSTWRITER\'s input, replayed offline.';
const STREAM_HANDLED = { type:'handled' };
const STREAM_LANE_BY_KEY = { ArrowLeft:0,ArrowDown:1,ArrowRight:2,'1':0,'2':1,'3':2 };
const STREAM_LANE_BY_CODE = { Digit1:0,Digit2:1,Digit3:2,Numpad1:0,Numpad2:1,Numpad3:2 };
const STREAM_FLICK_LANE = { q:0,w:1,e:2 };

function uiStreamOpen(app) {
app.stream = {
view:'select',stageIndex:0,sim:null,attempt:0,result:null,xp:null,awarded:false,nodes:null,pointers:{},
stageCount:CONTEXT_STREAM.stages.length,
};
app.screen = 'stream';
app.lastFocusKey = 'stream-back';
uiStoryLabOpen(app,CONTEXT_STREAM.id);
}
function uiStreamLeave(app) {
uiStreamLoopStop();
app.stream = null;
uiEnterGrid(app);
}
function uiStreamNewRun(app) {
const stream = app.stream;
const stage = CONTEXT_STREAM.stages[stream.stageIndex];
stream.sim = createRun(stage,(stream.stageIndex + 1) * STREAM_SEED_STRIDE + stream.attempt);
stream.view = 'play';
stream.result = null;
stream.xp = null;
stream.awarded = false;
stream.nodes = null;
stream.pointers = {};
app.lastFocusKey = null;
}
function uiStreamPick(app,index) {
if (app.stream.view !== 'select' || index < 0 || index >= CONTEXT_STREAM.stages.length) return;
app.stream.stageIndex = index;
app.stream.attempt = 0;
app.stream.view = 'ready';
app.lastFocusKey = 'stream-start';
}
function uiStreamStart(app) {
if (app.stream.view === 'ready') uiStreamNewRun(app);
}
function uiStreamPause(app) {
const stream = app.stream;
if (stream.view !== 'play') return;
uiStreamLoopStop();
stream.view = 'paused';
stream.nodes = null;
stream.pointers = {};
app.lastFocusKey = 'stream-resume';
}
function uiStreamResume(app) {
if (app.stream.view !== 'paused') return;
app.stream.view = 'play';
app.lastFocusKey = null;
}
function uiStreamReplay(app) {
if (app.stream.view !== 'result' && app.stream.view !== 'paused') return;
app.stream.attempt += 1;
uiStreamNewRun(app);
}
function uiStreamNext(app) {
const stream = app.stream;
if (stream.view !== 'result' || stream.stageIndex >= CONTEXT_STREAM.stages.length - 1) return;
stream.stageIndex += 1;
stream.attempt = 0;
stream.view = 'ready';
stream.sim = null;
app.lastFocusKey = 'stream-start';
}
function uiStreamToSelect(app) {
const stream = app.stream;
if (stream.view === 'select' || stream.view === 'play') return;
uiStreamLoopStop();
stream.view = 'select';
stream.sim = null;
stream.nodes = null;
app.lastFocusKey = 'stream-stage-' + stream.stageIndex;
}
function uiStreamBack(app) {
const view = app.stream.view;
if (view === 'select') uiStreamLeave(app);
else if (view === 'play') uiStreamPause(app);
else uiStreamToSelect(app);
}
const STREAM_ACTIONS = {
'stream-start':uiStreamStart,'stream-pause':uiStreamPause,'stream-resume':uiStreamResume,
'stream-replay':uiStreamReplay,'stream-next':uiStreamNext,'stream-stages':uiStreamToSelect,'stream-back':uiStreamBack,
};
function uiStreamApplyAction(app,actionId) {
if (!app.stream) return false;
if (Object.hasOwn(STREAM_ACTIONS,actionId)) {
STREAM_ACTIONS[actionId](app);
return true;
}
const stage = STREAM_STAGE_ACTION.exec(actionId);
if (stage) uiStreamPick(app,Number(stage[1]));
return Boolean(stage);
}
function uiStreamLaneOfKey(event) {
if (Object.hasOwn(STREAM_LANE_BY_CODE,event.code)) return STREAM_LANE_BY_CODE[event.code];
return Object.hasOwn(STREAM_LANE_BY_KEY,event.key) ? STREAM_LANE_BY_KEY[event.key] :null;
}
function uiStreamIsSpace(event) {
return event.key === ' ' || event.code === 'Space';
}
function uiStreamPlayAction(event) {
if (uiStreamIsSpace(event)) return { type:'prune' };
const flick = typeof event.key === 'string' ? event.key.toLowerCase() :'';
if (Object.hasOwn(STREAM_FLICK_LANE,flick)) return { type:'flick',lane:STREAM_FLICK_LANE[flick] };
const lane = uiStreamLaneOfKey(event);
if (lane === null) return null;
return { type:event.shiftKey ? 'flick' :'catch',lane };
}
function uiStreamEscape(event,app) {
event.preventDefault();
if (event.repeat) return STREAM_HANDLED;
const view = app.stream.view;
if (view === 'play') return { type:'action',id:'stream-pause' };
return { type:'action',id:view === 'paused' ? 'stream-stages' :'stream-back' };
}
function uiStreamIsPauseKey(event) {
return event.key === 'p' || event.key === 'P';
}
function uiStreamPauseKey(event,app) {
event.preventDefault();
if (event.repeat) return STREAM_HANDLED;
return { type:'action',id:app.stream.view === 'paused' ? 'stream-resume' :'stream-pause' };
}
function uiStreamKeyAction(event,app) {
if (!app.stream) return null;
if (event.key === 'Escape') return uiStreamEscape(event,app);
const view = app.stream.view;
if ((view === 'play' || view === 'paused') && uiStreamIsPauseKey(event)) return uiStreamPauseKey(event,app);
if (view !== 'play') return null;
const action = uiStreamPlayAction(event);
if (!action) return null;
event.preventDefault();
if (!event.repeat) uiStreamAct(app,action);
return STREAM_HANDLED;
}
function uiStreamKeyUp(event,app) {
if (!app.stream || app.stream.view !== 'play' || !uiStreamIsSpace(event)) return false;
event.preventDefault();
return true;
}
function uiStreamHitOf(event,nodes) {
if (!nodes || !event.target) return -1;
const target = event.target.closest ? event.target.closest('[data-hit]') :event.target;
return nodes.hits.indexOf(target);
}
function uiStreamPointerId(event) {
return Number.isFinite(event.pointerId) ? event.pointerId :0;
}
function uiStreamPress(app,event) {
const stream = app.stream;
if (!uiStreamIsPlaying(app) || event.button > 0) return false;
const hit = uiStreamHitOf(event,stream.nodes);
if (hit < 0) return false;
stream.pointers[uiStreamPointerId(event)] = { hit,x:event.clientX,y:event.clientY };
return true;
}
function uiStreamRise(down,event) {
const rise = down.y - event.clientY;
return Number.isFinite(rise) ? rise :0;
}
function uiStreamActionOf(down,event) {
if (down.hit === STREAM_HIT_WINDOW) return { type:'prune' };
return { type:uiStreamRise(down,event) >= STREAM_FLICK_PX ? 'flick' :'catch',lane:down.hit };
}
function uiStreamPointerDown(event,app) {
if (!app.stream) return false;
return uiStreamPress(app,event);
}
function uiStreamPointerUp(event,app) {
if (!app.stream) return false;
const id = uiStreamPointerId(event);
const down = app.stream.pointers[id];
if (!down) return false;
delete app.stream.pointers[id];
uiStreamAct(app,uiStreamActionOf(down,event));
return true;
}
function uiStreamPointerCancel(event,app) {
if (!app.stream) return false;
const id = uiStreamPointerId(event);
const held = Object.hasOwn(app.stream.pointers,id);
delete app.stream.pointers[id];
return held;
}
function uiStreamRelease(app) {
if (!app.stream) return;
app.stream.pointers = {};
if (app.stream.view !== 'play') return;
uiStreamPause(app);
uiRenderApp(app);
}
function uiStreamSync(app,active) {
if (active && !app.menuOpen && uiStreamIsPlaying(app)) uiStreamLoopStart(app);
else uiStreamLoopStop();
}
function uiStreamAnnounce() {
return STREAM_SPOKEN;
}
function uiStreamScreen() {
return {
id:'stream',
render:uiStreamRenderView,
focusKey:uiStreamFocusFor,
announce:uiStreamAnnounce,
keyAction:uiStreamKeyAction,
keyUp:uiStreamKeyUp,
applyAction:uiStreamApplyAction,
sync:uiStreamSync,
pointerDown:uiStreamPointerDown,
pointerUp:uiStreamPointerUp,
pointerCancel:uiStreamPointerCancel,
release:uiStreamRelease,
};
}

export { uiStreamScreen,uiStreamOpen };

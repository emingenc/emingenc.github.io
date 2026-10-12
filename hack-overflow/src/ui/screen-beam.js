import { rigOf } from '../game/rig-catalog.js';
import { HEARTS } from '../game/rooms/data/beam-wave.js';
import { uiRenderApp } from './app.js';
import { ARENA_FOCUS_KEY,uiArenaCoach,uiArenaHeader,uiArenaLeave,uiArenaLeaveTooSoon,uiArenaOpen,uiArenaToastNode } from './arena-shell.js';
import { uiBeamCard } from './beam-card.js';
import { BOLT_ACTION,DOWN_ACTION,FIRE_ACTION,UP_ACTION,uiBeamCellRow,uiBeamDock,uiBeamMinimap,uiBeamSlider } from './beam-controls.js';
import { BEAM_RIG_ID,uiBeamAssist,uiBeamBolt,uiBeamCommit,uiBeamCreate,uiBeamNudge,uiBeamSpoken,uiBeamTime } from './beam-flow.js';
import { uiBeamFirstMode } from './beam-modes.js';
import { uiBeamPressCancel,uiBeamPressDown,uiBeamPressUp,uiBeamSwallowed } from './beam-press.js';
import { uiBeamScene } from './beam-scene.js';
import { uiEl } from './dom.js';
import { uiLinkStyles } from './lazy-style.js';
import { uiRoomSetAssist } from './room-flow.js';


const BACK_ACTION = 'rig-back';
const REPLAY_ACTION = 'beam-replay';
const ASSIST_ACTION = 'arena-assist';
const MODE_ACTIONS = { 'beam-wave1':'w1','beam-wave2':'w2' };
const MODE_TITLES = { w1:'BEAM · WAVE 1',w2:'BEAM · WAVE 2' };
const MODE_LABELS = { w1:'wave 1',w2:'wave 2' };
const CELL_PATTERN = /^beam-cell-(\d+)$/;
const ASSIST_HINT = 'ASSIST: no speed bonus, calmer motion';
const KEY_ACTIONS = {
arrowleft:DOWN_ACTION,arrowdown:DOWN_ACTION,arrowright:UP_ACTION,arrowup:UP_ACTION,f:FIRE_ACTION,b:BOLT_ACTION,
};
const FIRE_KEYS = new Set(['enter',' ','spacebar']);
const STYLESHEETS = ['styles/rooms/rig-shell.css','styles/rooms/arena.css','styles/rooms/beam.css'];

function uiBeamArena(app) {
return app.rig && app.rig.rigId === BEAM_RIG_ID && app.rig.arena ? app.rig.arena :null;
}


function uiBeamPlayView(app) {
const arena = app.rig.arena;
const state = arena.state;
return [uiArenaCoach(arena.coach),uiBeamScene(app),uiBeamMinimap(state),uiBeamCellRow(state),uiBeamSlider(state),uiBeamDock(state)];
}
function uiBeamRender(app) {
const arena = uiBeamArena(app);
if (!arena) return uiEl('section',{ className:'screen rig-screen',attrs:{ 'data-screen':'rig' } });
const view = {
hearts:arena.state.hearts,heartsMax:HEARTS,score:arena.state.score,title:MODE_TITLES[arena.mode],titleLabel:arena.rig.title + ', ' + MODE_LABELS[arena.mode],
assist:uiBeamAssist(app),assistHint:ASSIST_HINT,
};
const body = arena.view === 'card' ? [uiBeamCard(app,arena.result)] :uiBeamPlayView(app);
return uiEl('section',{
className:'screen rig-screen arena-screen beam-screen' + (arena.view === 'card' ? ' is-card' :''),
attrs:{ 'data-screen':'rig','data-rig':BEAM_RIG_ID,tabindex:'-1','data-focus-key':ARENA_FOCUS_KEY },
children:[uiArenaHeader(app,view),uiArenaToastNode(app),...body],
});
}
function uiBeamAnnounce(app) {
const arena = uiBeamArena(app);
if (!arena) return 'HALVING BEAM.';
if (arena.view === 'card') return arena.result.won ? 'Lock found.' :'Beam lost.';
return arena.rig.title + '. ' + uiBeamSpoken(arena) + ' ' + arena.coach;
}
function uiBeamFocusKey(app) {
const arena = uiBeamArena(app);
if (!arena) return BACK_ACTION;
return arena.view === 'card' ? REPLAY_ACTION :ARENA_FOCUS_KEY;
}


function uiBeamPlay(app,play,focusKey) {
play(app,uiBeamTime());
if (app.rig.arena.view === 'play') app.lastFocusKey = focusKey;
}
function uiBeamCellAction(app,actionId) {
const match = CELL_PATTERN.exec(actionId);
if (!match) return false;
if (!uiBeamSwallowed(app,actionId)) uiBeamPlay(app,(target,now) => uiBeamCommit(target,'select:' + match[1],now),actionId);
return true;
}
function uiBeamLeave(app) {
if (uiArenaLeaveTooSoon(app)) return;
uiBeamPressCancel();
uiArenaLeave(app,null);
}
function uiBeamBegin(app,mode) {
const arena = app.rig.arena;
if (arena.view !== 'card') return;
app.rig.arena = uiBeamCreate(app,arena.rig,{ mode });
app.lastFocusKey = FIRE_ACTION;
app.pendingAnnounce = uiBeamSpoken(app.rig.arena) + ' ' + app.rig.arena.coach;
}
const UI_BEAM_ACTIONS = {
[BACK_ACTION]:uiBeamLeave,
[ASSIST_ACTION]:(app) => uiRoomSetAssist(app,!uiBeamAssist(app)),
[FIRE_ACTION]:(app) => uiBeamPlay(app,(target,now) => uiBeamCommit(target,'fire',now),FIRE_ACTION),
[DOWN_ACTION]:(app) => uiBeamPlay(app,(target,now) => uiBeamNudge(target,-1,now),DOWN_ACTION),
[UP_ACTION]:(app) => uiBeamPlay(app,(target,now) => uiBeamNudge(target,1,now),UP_ACTION),
[BOLT_ACTION]:(app) => uiBeamPlay(app,uiBeamBolt,BOLT_ACTION),
[REPLAY_ACTION]:(app) => uiBeamBegin(app,app.rig.arena.mode),
};
function uiBeamApplyAction(app,actionId) {
if (!uiBeamArena(app)) return false;
if (Object.hasOwn(UI_BEAM_ACTIONS,actionId)) {
UI_BEAM_ACTIONS[actionId](app);
return true;
}
if (Object.hasOwn(MODE_ACTIONS,actionId)) {
uiBeamBegin(app,MODE_ACTIONS[actionId]);
return true;
}
return uiBeamCellAction(app,actionId) || actionId.startsWith('beam-');
}


function uiBeamPointerDown(event,app) {
if (uiBeamArena(app)) uiBeamPressDown(app,event);
return false;
}
function uiBeamPointerUp(event,app) {
if (!uiBeamArena(app) || !uiBeamPressUp(app,event)) return false;
uiRenderApp(app);
return true;
}
function uiBeamPointerCancel() {
uiBeamPressCancel();
return false;
}


function uiBeamOwnsKey(target) {
if (!target || target.tagName !== 'BUTTON') return false;
const action = typeof target.getAttribute === 'function' ? target.getAttribute('data-action') :null;
return !(action === DOWN_ACTION || action === UP_ACTION || CELL_PATTERN.test(action ?? ''));
}
function uiBeamKeyId(event,app) {
if (event.key === 'Escape') return BACK_ACTION;
if (app.rig.arena.view !== 'play') return null;
const key = String(event.key).toLowerCase();
if (FIRE_KEYS.has(key)) return uiBeamOwnsKey(event.target) ? null :FIRE_ACTION;
return KEY_ACTIONS[key] ?? null;
}
function uiBeamKeyAction(event,app) {
if (!uiBeamArena(app)) return null;
const id = uiBeamKeyId(event,app);
if (!id) return null;
event.preventDefault();
return event.repeat ? { type:'handled' } :{ type:'action',id };
}


function uiBeamSync(app,active) {
if (!active || !uiBeamArena(app)) uiBeamPressCancel();
}

function uiRigScreen() {
return {
id:'rig',render:uiBeamRender,focusKey:uiBeamFocusKey,announce:uiBeamAnnounce,keyAction:uiBeamKeyAction,applyAction:uiBeamApplyAction,
pointerDown:uiBeamPointerDown,pointerUp:uiBeamPointerUp,pointerCancel:uiBeamPointerCancel,sync:uiBeamSync,release:uiBeamPressCancel,
};
}
function uiRigOpen(app,rigId) {
const rig = rigOf(rigId);
if (!rig) throw new Error('unknown rig: ' + rigId);
uiArenaOpen(app,{ rigId,create:(opened) => uiBeamCreate(opened,rig,{ mode:uiBeamFirstMode(opened) }) });
}
function uiRigReady() {
return uiLinkStyles(STYLESHEETS);
}

export { uiRigScreen,uiRigOpen,uiRigReady };

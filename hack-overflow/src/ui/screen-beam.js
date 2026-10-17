import { rigOf } from '../game/rig-catalog.js';
import { middleOf } from '../game/rooms/beam.js';
import { HEARTS } from '../game/rooms/data/beam-wave.js';
import { ARENA_FOCUS_KEY,uiArenaCoach,uiArenaHeader,uiArenaLeave,uiArenaLeaveTooSoon,uiArenaOpen,uiArenaToastNode } from './arena-shell.js';
import { uiBeamCard } from './beam-card.js';
import { BOLT_ACTION,CELL_ACTION,FIRE_ACTION,NEXT_ACTION,PREV_ACTION,uiBeamCellRow,uiBeamDock,uiBeamMinimap } from './beam-controls.js';
import { BEAM_RIG_ID,uiBeamAssist,uiBeamBolt,uiBeamCommit,uiBeamCreate,uiBeamSpoken,uiBeamStep,uiBeamTap,uiBeamTime } from './beam-flow.js';
import { uiBeamFirstMode } from './beam-modes.js';
import { uiBeamScene } from './beam-scene.js';
import { KEEP_LEFT_ACTION,KEEP_RIGHT_ACTION,uiBeamKeepDock } from './beam-w3-dock.js';
import { uiBeamW3Scene } from './beam-w3-scene.js';
import { uiEl } from './dom.js';
import { uiLinkStyles } from './lazy-style.js';
import { uiRoomSetAssist } from './room-flow.js';
import { uiRoomBody,uiRoomFocusKey } from './room-screen.js';


const BACK_ACTION = 'rig-back';
const REPLAY_ACTION = 'beam-replay';
const ASSIST_ACTION = 'arena-assist';
const MODE_ACTIONS = { 'beam-wave1':'w1','beam-wave2':'w2','beam-wave3':'w3' };
const MODE_TITLES = { w1:'BEAM · WAVE 1',w2:'BEAM · WAVE 2',w3:'BEAM · WAVE 3' };
const MODE_LABELS = { w1:'wave 1',w2:'wave 2',w3:'wave 3' };
const CELL_PATTERN = /^beam-cell-(\d+)$/;
const ASSIST_HINT = 'ASSIST: no speed bonus, calmer motion';
const KEY_ACTIONS = {
arrowleft:PREV_ACTION,arrowdown:PREV_ACTION,arrowright:NEXT_ACTION,arrowup:NEXT_ACTION,f:FIRE_ACTION,b:BOLT_ACTION,
};
const FIRE_KEYS = new Set(['enter',' ','spacebar']);
const KEEP_KEYS = { arrowleft:KEEP_LEFT_ACTION,arrowright:KEEP_RIGHT_ACTION };
const STYLESHEETS = ['styles/rooms/rig-shell.css','styles/rooms/arena.css','styles/rooms/beam.css'];

function uiBeamArena(app) {
return app.rig && app.rig.rigId === BEAM_RIG_ID && app.rig.arena ? app.rig.arena :null;
}


function uiBeamHint(app) {
return uiEl('div',{ className:'beam-hint',children:[uiArenaCoach(app.rig.arena.coach),uiArenaToastNode(app)] });
}
function uiBeamPlayView(app) {
const arena = app.rig.arena;
const state = arena.state;
const scene = state.rotated ? uiBeamW3Scene(app) :uiBeamScene(app);
const dock = state.pending ? uiBeamKeepDock(state) :uiBeamDock(state);
return [uiBeamHint(app),scene,uiBeamMinimap(state),uiBeamCellRow(state),dock];
}
function uiBeamRender(app) {
const arena = uiBeamArena(app);
if (!arena) return uiEl('section',{ className:'screen rig-screen',attrs:{ 'data-screen':'rig' } });
const view = {
hearts:arena.state.hearts,heartsMax:HEARTS,score:arena.state.score,title:MODE_TITLES[arena.mode],titleLabel:arena.rig.title + ', ' + MODE_LABELS[arena.mode],
assist:uiBeamAssist(app),assistHint:ASSIST_HINT,
};
const body = uiRoomBody(app,arena,{ play:() => uiBeamPlayView(app),card:() => uiBeamCard(app,arena.result) });
return uiEl('section',{
className:'screen rig-screen arena-screen beam-screen' + (arena.view === 'card' ? ' is-card' :''),
attrs:{ 'data-screen':'rig','data-rig':BEAM_RIG_ID,tabindex:'-1','data-focus-key':ARENA_FOCUS_KEY },
children:[uiArenaHeader(app,view),...body],
});
}
function uiBeamAnnounce(app) {
const arena = uiBeamArena(app);
if (!arena) return 'HALVING BEAM.';
if (arena.view === 'card') return arena.result.won ? 'Lock found.' :'Beam lost.';
return arena.rig.title + '. ' + uiBeamSpoken(arena) + ' ' + arena.coach;
}
function uiBeamFocusKey(app) {
return uiRoomFocusKey(uiBeamArena(app),BACK_ACTION,REPLAY_ACTION);
}


function uiBeamFocusAfter(app) {
const state = app.rig.arena.state;
if (state.pending) return KEEP_LEFT_ACTION;
return CELL_ACTION + (state.selected ?? middleOf(state));
}
function uiBeamPlay(app,play) {
play(app,uiBeamTime());
if (app.rig.arena.view === 'play') app.lastFocusKey = uiBeamFocusAfter(app);
}
function uiBeamCellAction(app,actionId) {
const match = CELL_PATTERN.exec(actionId);
if (!match) return false;
uiBeamPlay(app,(target,now) => uiBeamTap(target,Number(match[1]),now));
return true;
}
function uiBeamFocusedCell() {
const node = typeof document !== 'undefined' ? document.activeElement : null;
const cell = node && typeof node.getAttribute === 'function' ? node.getAttribute('data-beam-cell') : null;
return cell === null || cell === undefined ? null : Number(cell);
}
function uiBeamFire(app,now) {
const state = app.rig.arena.state;
if (state.selected !== null) return uiBeamCommit(app,'fire',now);
return uiBeamTap(app,uiBeamFocusedCell() ?? middleOf(state),now);
}
function uiBeamLeave(app) {
if (uiArenaLeaveTooSoon(app)) return;
uiArenaLeave(app,null);
}
function uiBeamBegin(app,mode) {
const arena = app.rig.arena;
if (arena.view !== 'card') return;
app.rig.arena = uiBeamCreate(app,arena.rig,{ mode,lastIndex:mode === arena.mode ? arena.poolIndex :null });
app.lastFocusKey = uiBeamFocusAfter(app);
app.pendingAnnounce = uiBeamSpoken(app.rig.arena) + ' ' + app.rig.arena.coach;
}
const UI_BEAM_ACTIONS = {
[BACK_ACTION]:uiBeamLeave,
[ASSIST_ACTION]:(app) => uiRoomSetAssist(app,!uiBeamAssist(app)),
[FIRE_ACTION]:(app) => uiBeamPlay(app,uiBeamFire),
[PREV_ACTION]:(app) => uiBeamPlay(app,(target,now) => uiBeamStep(target,-1,now)),
[NEXT_ACTION]:(app) => uiBeamPlay(app,(target,now) => uiBeamStep(target,1,now)),
[BOLT_ACTION]:(app) => uiBeamPlay(app,uiBeamBolt),
[KEEP_LEFT_ACTION]:(app) => uiBeamPlay(app,(target,now) => uiBeamCommit(target,'keep:left',now)),
[KEEP_RIGHT_ACTION]:(app) => uiBeamPlay(app,(target,now) => uiBeamCommit(target,'keep:right',now)),
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


function uiBeamOwnsKey(target) {
return Boolean(target) && target.tagName === 'BUTTON';
}
function uiBeamKeyId(event,app) {
if (event.key === 'Escape') return BACK_ACTION;
if (app.rig.arena.view !== 'play') return null;
const key = String(event.key).toLowerCase();
if (FIRE_KEYS.has(key)) return uiBeamOwnsKey(event.target) ? null :FIRE_ACTION;
if (app.rig.arena.state.pending && Object.hasOwn(KEEP_KEYS,key)) return KEEP_KEYS[key];
return KEY_ACTIONS[key] ?? null;
}
function uiBeamKeyAction(event,app) {
if (!uiBeamArena(app)) return null;
const id = uiBeamKeyId(event,app);
if (!id) return null;
event.preventDefault();
return event.repeat ? { type:'handled' } :{ type:'action',id };
}

function uiRigScreen() {
return {
id:'rig',render:uiBeamRender,focusKey:uiBeamFocusKey,announce:uiBeamAnnounce,keyAction:uiBeamKeyAction,applyAction:uiBeamApplyAction,
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

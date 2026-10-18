import { EXPLOITS } from '../game/exploits.js';
import { uiCloseMenu } from './dispatch-nav.js';
import { uiEl, uiPointerIsCoarse } from './dom.js';
import { uiWalkReleaseAll } from './grid-walk.js';
import { uiLinkStyle } from './lazy-style.js';
import { uiMenuButton } from './menu.js';

const STYLE_HREF = 'styles/lazy/controls.css';
const RESET_TEXT = 'Reset all progress? This clears your XP, levels, breached locks and position.';
const RESET_TEXT_ID = 'menu-confirm-text';
const GRID_KEYS = [
['ARROWS · WASD','Walk. Hold to keep walking.'],
['CLICK a tile','Walk there.'],
['ENTER · SPACE','Use what you face: a lock, a machine, a person.'],
['F','Press the round button, bottom right, once a foe is near.'],
['T','TRAVEL to a place you know.'],
['M · O','The map.'],
['X','Sound on or off.'],
['ESC','The menu. It closes TRAVEL first.'],
['?','This list.'],
];
const GRID_TOUCH = [
['TAP a tile','Walk there.'],
['D-PAD','Walk. Hold to keep walking.'],
['◆','Use what you face: a lock, a machine, a person.'],
['ROUND BUTTON','Bottom right: fire at a foe, or AIM with LOOKUP.'],
['TRAVEL','Walk to a place you know.'],
['MAP','The map.'],
['MENU','Sound, these controls, REPLAY and RESET.'],
];
const LOCK_KEYS = [
['ARROWS','Pick a chip.'],
['ENTER · SPACE','Add the chip.'],
['⌫','Take off the last chip.'],
['SHIFT + ⌫','Clear the line.'],
['R','PROBE the line on the examples.'],
['S','BREACH the lock.'],
];
const KEYS_END = [
['X','Sound on or off.'],
['?','This list.'],
];
const LOCK_KEYS_END = [['ESC','Back to the Grid.'],...KEYS_END];
const LOCK_TOUCH = [
['TAP a chip','Add it to the line.'],
['⌫ · CLEAR','Take off the last chip, or clear the line.'],
['PROBE','Try the line on the examples.'],
['BREACH','Answer the lock.'],
];
const LOCK_TOUCH_END = [['MENU','Sound, these controls and DISCONNECT.']];
const OTHER_KEYS = [['BUTTONS','Click the buttons on this screen.'],...KEYS_END];
const OTHER_TOUCH = [['BUTTONS','Tap the buttons on this screen.']];
const AUTO_ESC = ['ESC','Skip the machine ahead to your call; else leave.'];
const RIG_KEYS = {
ledger:[
['1-9','On the level list: pick a level.'],
['1-9 · 0 · -','Pair that slot, or EVICT it when armed.'],
['S','STORE.'],
['D','DROP.'],
['E','Arm EVICT.'],
['ESC','Disarm EVICT; else leave.'],
],
turret:[
['1-9','Probe that slot, or EVICT it when armed.'],
['T','TAG.'],
['G · V','Trust or verify the hint, when one is offered.'],
['E','Arm EVICT (wave 3).'],
['P','Switch the picked drone.'],
['ESC','Leave.'],
],
shield:[
['← · P','PUSH.'],
['→ · O','POP.'],
['B','BREACH at once (not in TOWERS).'],
AUTO_ESC,
],
pincer:[
['L · R','Move the cannons.'],
['F','FIRE.'],
['P','Shoot the plank.'],
['S','SORT.'],
['B','BANK.'],
['ESC','Leave.'],
],
beam:[
['ARROWS','Select a cell. ← · → answer a waiting probe.'],
['ENTER · SPACE · F','FIRE.'],
['B','BOLT.'],
['ESC','Leave.'],
],
net:[
['E · →','EXTEND.'],
['S · ←','SHRINK.'],
['J','JUMP.'],
['G','Take the gold item.'],
AUTO_ESC,
],
};
const SCREEN_KEYS = {
forge:[
['ARROWS','Move on the board.'],
['1-9','Pick a piece.'],
['ENTER · SPACE','Place it.'],
['S · DELETE','Sell.'],
['W · N','START WAVE.'],
['F','Speed.'],
['ESC','Back.'],
],
stream:[
['← ↓ → · 1-3','Catch in that lane.'],
['SHIFT + lane · Q W E','Flick in that lane.'],
['SPACE','Prune.'],
['P','Pause or resume.'],
['ESC','Pause; else back.'],
],
lab:[
['1-9','Put a chunk in, or take it out.'],
['⌫','Take out the last chunk.'],
['P','PROBE.'],
['R','RUN.'],
['ESC','Back.'],
],
review:[
['ENTER · SPACE','Hold the focused APPROVE or MERGE.'],
['ESC','Back.'],
],
map:[
['CLICK a lock, machine or sector','Go there.'],
['M · O · ESC','Close the map.'],
],
};
const SCREEN_TOUCH = {
map:[
['TAP a lock, machine or sector','Go there.'],
['CLOSE','Back to the Grid.'],
],
};
const EXPLOIT_NAMES = { scan:'SCAN',decrypt:'DECRYPT' };
const EXPLOIT_WHAT = { scan:'Strike chips the answer does not need. Costs a star.',decrypt:'Name the lock. Costs a star.' };

function exploitRows(app,coarse) {
const level = app.game.breach ? app.game.breach.level : 0;
return Object.keys(EXPLOITS).filter((name) => level >= EXPLOITS[name].level)
.map((name) => [coarse ? EXPLOIT_NAMES[name] :EXPLOITS[name].key + ' · ' + EXPLOIT_NAMES[name],EXPLOIT_WHAT[name]]);
}
function uiControlsRows(app,coarse) {
if (app.screen === 'grid') return coarse ? GRID_TOUCH :GRID_KEYS;
if (app.screen === 'breach') return coarse ? [...LOCK_TOUCH,...exploitRows(app,coarse),...LOCK_TOUCH_END] :[...LOCK_KEYS,...exploitRows(app,coarse),...LOCK_KEYS_END];
return coarse ? SCREEN_TOUCH[app.screen] || OTHER_TOUCH :screenKeyRows(app);
}
function screenKeyRows(app) {
const own = app.screen === 'rig' ? app.rig && RIG_KEYS[app.rig.rigId] :SCREEN_KEYS[app.screen];
return own ? [...own,...KEYS_END] :OTHER_KEYS;
}
function uiControlRow([key,what]) {
return uiEl('li',{ className:'controls-row',children:[uiEl('kbd',{ className:'controls-key',text:key }),uiEl('span',{ className:'controls-what',text:what })] });
}
function uiControlsFace(app) {
const list = uiEl('ul',{ className:'controls-list',attrs:{ 'aria-label':'Controls' },children:uiControlsRows(app,Boolean(uiPointerIsCoarse())).map(uiControlRow) });
const back = uiMenuButton('controls-back',app.controlsBack === 'menu' ? 'BACK' :'CLOSE');
return { title:'CONTROLS',label:'Controls',question:list,stops:[back] };
}
function confirmButton(action,label,kind) {
const stop = uiMenuButton(action,label);
stop.node.className = 'btn ' + kind + ' menu-item';
stop.node.setAttribute('aria-describedby',RESET_TEXT_ID);
return stop;
}
function uiResetFace() {
return {
title:'RESET PROGRESS',label:'Reset progress',
question:uiEl('p',{ className:'menu-confirm-text',text:RESET_TEXT,attrs:{ id:RESET_TEXT_ID } }),
stops:[confirmButton('reset-confirm','RESET','btn-warn'),confirmButton('reset-cancel','CANCEL','btn-ghost')],
};
}
function showFace(app,face,focusKey) {
uiWalkReleaseAll(app);
app.menuFace = face;
app.menuOpen = true;
app.lastFocusKey = focusKey;
}
function askReset(app) {
if (app.menuFace === uiResetFace) return;
app.confirmReset = app.menuOpen ? 'menu' :'screen';
showFace(app,uiResetFace,'reset-cancel');
}
async function openControls(app) {
const overScreen = app.confirmReset === 'screen';
const back = app.menuOpen && !overScreen ? 'menu' :'screen';
await uiLinkStyle(STYLE_HREF);
if (app.menuFace === uiControlsFace) return;
app.controlsBack = back;
app.confirmReset = overScreen ? 'screen' :null;
showFace(app,uiControlsFace,'controls-back');
}
function backFromControls(app) {
if (app.controlsBack !== 'menu') { uiCloseMenu(app); return; }
app.menuFace = null;
app.lastFocusKey = 'menu-controls';
}
function toggleControls(app) {
return app.menuOpen && app.menuFace === uiControlsFace ? uiCloseMenu(app) :openControls(app);
}
const FACE_VERBS = { reset:askReset,controls:openControls,back:backFromControls,toggle:toggleControls };
async function uiMenuFaceAct(app,verb) {
await FACE_VERBS[verb](app);
}

export { uiMenuFaceAct, uiControlsFace, uiControlsRows, uiResetFace };

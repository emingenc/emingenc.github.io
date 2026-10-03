import { CONTEXT_WINDOW } from '../game/labs/data/context-window.js';
import { apply, createRun, movesUsed, read } from '../game/labs/context-reader.js';
import { recordLab } from '../game/save.js';
import { uiCommitSave } from './game-state.js';
import { uiEnterGrid } from './screen-grid.js';
import { uiLabLevelOf, uiLabRenderEmpty, uiLabRenderPlay, uiLabRenderSelect } from './lab-render.js';

const LAB_SEED_STRIDE = 1000;
const LAB_FOCUS_BACK = 'lab-back';
const LAB_NO_CHIP_FOCUS = 'lab-run';
const LAB_SIM_SPOKEN = 'Simulated model: no real AI and no network.';
const LAB_LEVEL_ACTION = /^lab-level-(\d+)$/;
const LAB_EDIT_ACTION = /^lab-(add|sum|drop)-(.+)$/;
const LAB_DIGIT_KEY = /^[1-9]$/;

function uiLabOpen(app) {
app.lab = { view:'select',levelIndex:0,run:null,probe:null,attempt:0 };
app.screen = 'lab';
app.lastFocusKey = LAB_FOCUS_BACK;
}
function uiLabLeave(app) {
app.lab = null;
uiEnterGrid(app);
}
function uiLabNewRun(app) {
const lab = app.lab;
lab.run = createRun(uiLabLevelOf(app),lab.levelIndex * LAB_SEED_STRIDE + lab.attempt);
lab.probe = null;
lab.view = 'play';
app.lastFocusKey = 'lab-add-' + lab.run.tray[0];
}
function uiLabStartLevel(app,index) {
if (index < 0 || index >= CONTEXT_WINDOW.levels.length) return;
app.lab.levelIndex = index;
app.lab.attempt = 0;
uiLabNewRun(app);
}
function uiLabToSelect(app) {
app.lab.view = 'select';
app.lab.run = null;
app.lab.probe = null;
app.lastFocusKey = 'lab-level-' + app.lab.levelIndex;
}
function uiLabBack(app) {
if (app.lab.view === 'play') uiLabToSelect(app);
else uiLabLeave(app);
}
function uiLabReplay(app) {
app.lab.attempt += 1;
uiLabNewRun(app);
}
function uiLabNext(app) {
uiLabStartLevel(app,app.lab.levelIndex + 1);
}
function uiLabStarsWord(count) {
return count + ' star' + (count === 1 ? '' :'s');
}
function uiLabProbeSpoken(reading,level) {
const cut = reading.cutIds.length;
const cutText = cut ? cut + ' chunk' + (cut === 1 ? '' :'s') + ' cut' :'nothing cut';
return 'Probe. ' + reading.used + ' of ' + level.budget + ' tokens, ' + cutText + '. ' + Object.keys(reading.facts).length + ' facts read.';
}
function uiLabProbe(app) {
const lab = app.lab;
if (lab.run.window.length === 0) return;
lab.run = { ...lab.run,failure:null };
lab.probe = read(uiLabLevelOf(app),lab.run.window);
app.pendingAnnounce = uiLabProbeSpoken(lab.probe,uiLabLevelOf(app));
app.lastFocusKey = 'lab-probe';
}
function uiLabWin(app,run) {
const level = uiLabLevelOf(app);
const { save } = recordLab(app.game.save,{ labId:CONTEXT_WINDOW.id,levelId:level.id },run.stars);
uiCommitSave(app,save);
const hasNext = app.lab.levelIndex < CONTEXT_WINDOW.levels.length - 1;
app.lastFocusKey = hasNext ? 'lab-next' :'lab-levels';
const par = 'Par ' + level.par + ', you used ' + movesUsed(run.window) + '.';
app.pendingAnnounce = 'Run passed. ' + uiLabStarsWord(run.stars) + '. ' + par;
}
function uiLabFail(app,run) {
app.lab.probe = read(uiLabLevelOf(app),run.window);
app.lastFocusKey = 'lab-run';
app.pendingAnnounce = 'Run failed. ' + run.failure.text + ' Your move: ' + run.failure.move + '.';
}
function uiLabRun(app) {
const before = app.lab.run;
const after = apply(before,'run');
app.lab.run = after;
if (after.status === 'won') uiLabWin(app,after);
else if (after !== before) uiLabFail(app,after);
}
function uiLabNextChipKey(run,id) {
const placed = new Set(run.window.map(function (entry) { return entry.id; }));
const from = run.tray.indexOf(id);
const order = [...run.tray.slice(from + 1),...run.tray.slice(0,from)];
const next = order.find(function (chunkId) { return !placed.has(chunkId); });
return next ? 'lab-add-' + next :LAB_NO_CHIP_FOCUS;
}
function uiLabFocusAfter(app,verb,id) {
if (verb === 'add') app.lastFocusKey = uiLabNextChipKey(app.lab.run,id);
else if (verb === 'drop') app.lastFocusKey = 'lab-add-' + id;
else app.lastFocusKey = 'lab-sum-' + id;
}
function uiLabEdit(app,move) {
const lab = app.lab;
const next = apply(lab.run,move);
if (next === lab.run) return;
lab.run = next;
lab.probe = null;
const sep = move.indexOf(':');
uiLabFocusAfter(app,move.slice(0,sep),move.slice(sep + 1));
}
function uiLabClear(app) {
const next = apply(app.lab.run,'clear');
if (next === app.lab.run) return;
app.lab.run = next;
app.lab.probe = null;
app.lastFocusKey = 'lab-add-' + next.tray[0];
}
const LAB_PLAY_ACTIONS = { 'lab-probe':uiLabProbe,'lab-run':uiLabRun,'lab-clear':uiLabClear,'lab-replay':uiLabReplay,'lab-next':uiLabNext,'lab-levels':uiLabToSelect };
function uiLabPatternAction(app,actionId) {
const level = LAB_LEVEL_ACTION.exec(actionId);
if (level) {
if (app.lab.view === 'select') uiLabStartLevel(app,Number(level[1]));
return true;
}
const edit = LAB_EDIT_ACTION.exec(actionId);
if (!edit) return false;
if (app.lab.view === 'play') uiLabEdit(app,edit[1] + ':' + edit[2]);
return true;
}
function uiLabApplyAction(app,actionId) {
if (!app.lab) return false;
if (actionId === LAB_FOCUS_BACK) {
uiLabBack(app);
return true;
}
if (Object.hasOwn(LAB_PLAY_ACTIONS,actionId)) {
if (app.lab.view === 'play') LAB_PLAY_ACTIONS[actionId](app);
return true;
}
return uiLabPatternAction(app,actionId);
}
function uiLabPlayKeyId(event,app) {
const key = event.key;
const placed = app.lab.run.window;
if (key === 'p' || key === 'P') return 'lab-probe';
if (key === 'r' || key === 'R') return 'lab-run';
if (key === 'Backspace') return placed.length ? 'lab-drop-' + placed[placed.length - 1].id :null;
if (!LAB_DIGIT_KEY.test(key)) return null;
const chunkId = app.lab.run.tray[Number(key) - 1];
return chunkId ? 'lab-add-' + chunkId :null;
}
function uiLabKeyAction(event,app) {
if (!app.lab) return null;
if (event.key === 'Escape') {
event.preventDefault();
return event.repeat ? { type:'handled' } :{ type:'action',id:LAB_FOCUS_BACK };
}
if (app.lab.view !== 'play') return null;
const id = uiLabPlayKeyId(event,app);
if (!id) return null;
event.preventDefault();
return { type:'action',id };
}
function uiLabRender(app) {
if (!app.lab) return uiLabRenderEmpty();
return app.lab.view === 'play' ? uiLabRenderPlay(app) :uiLabRenderSelect(app);
}
function uiLabAnnounce() {
return 'Context window lab. ' + LAB_SIM_SPOKEN;
}
function uiLabScreen() {
return {
id:'lab',
render:uiLabRender,
focusKey:function () { return LAB_FOCUS_BACK; },
announce:uiLabAnnounce,
keyAction:uiLabKeyAction,
applyAction:uiLabApplyAction,
};
}

export { uiLabScreen, uiLabOpen };

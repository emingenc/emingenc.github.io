import * as WORLD_DATA from '../game/world-data.js';
import { buildWorld } from '../game/world.js';
import { progressOf } from '../game/progress.js';
import { createExt,reconcileExt } from '../game/save-ext.js';
import { createCatalog } from '../logic/index.js';
import { uiClearExt,uiLoadExt } from './ext-storage.js';
import { uiHasGame,uiLoadGame,uiStoreGame } from './game-storage.js';

function uiIdleWalk() {
return { held:[],queued:null,plan:null,tween:null,nudge:null,stalled:null,nearId:null };
}
function uiSaveFields(world,save) {
return {
save,progress:progressOf(world,save),avatar:{ pos:{ ...save.pos },facing:save.facing },walk:uiIdleWalk(),
view:null,travelOpen:false,toast:null,notice:null,breach:null,revealing:false,outcome:null,traced:null,levelUp:null,
};
}
function uiLoadReconciledExt() {
const { ext,changed } = reconcileExt(uiLoadExt(),{ mainHasProgress:uiHasGame() });
if (changed && !ext.anchor) uiClearExt();
return ext;
}
function uiCreateGame(content) {
const world = buildWorld(content,WORLD_DATA);
const loaded = uiLoadGame(world);
return { world,catalog:createCatalog(content),stage:null,stageVisible:true,...uiSaveFields(world,loaded.save),notice:loaded.notice,ext:uiLoadReconciledExt() };
}
function uiResetGameState(app,save) {
Object.assign(app.game,uiSaveFields(app.game.world,save),{ ext:createExt() });
}
function uiSetSave(app,save) {
app.game.save = save;
app.game.progress = progressOf(app.game.world,save);
}
function uiCommitSave(app,save) {
uiSetSave(app,save);
uiStoreGame(save);
}
const UI_DEBUG_RING = 100;
let uiDebug = null;
function uiGameDebug() {
if (!uiDebug) uiDebug = { log:[],sfx:[],frames:0 };
return uiDebug;
}
function uiDebugPush(list,entry) {
list.push(entry);
if (list.length > UI_DEBUG_RING) list.shift();
}
function uiActiveToastText(game) {
return game.toast && game.toast.until > Date.now() ? game.toast.text :null;
}
function uiExtSnapshot(ext) {
const live = ext || createExt();
return { rank:live.rank,opening:live.opening,assist:live.assist };
}
function uiGameSnapshot(app) {
const game = app.game;
const progress = game.progress;
const trace = game.breach ? { ...game.breach.trace } :null;
return {
screen:app.screen,pos:{ ...game.avatar.pos },facing:game.avatar.facing,xp:progress.xp,level:progress.level,rank:progress.rank,
capacity:progress.capacity,trace,left:progress.left,breached:[...progress.breached].sort(),toast:uiActiveToastText(game),
loop:Boolean(game.stage && game.stage.raf),ext:uiExtSnapshot(game.ext),
};
}
function uiSolveSteps(app) {
if (!app.run || !app.run.lock) return [];
const lock = app.run.lock;
const problem = app.game.catalog.problemByKey.get(lock.key);
return problem.answer.map(function (text) { return 'chip-' + lock.tray.order.indexOf(problem.palette.indexOf(text)); });
}

export { uiCreateGame, uiResetGameState, uiCommitSave, uiGameDebug, uiDebugPush, uiGameSnapshot, uiSolveSteps };

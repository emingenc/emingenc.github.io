import { HARNESS_FORGE } from '../game/labs/data/harness-forge.js';
import { canPlace, createGame, pieceAt, placePiece, sellPiece, startWave } from '../game/labs/forge-sim.js';
import { runSummary, starsFor, xpGain } from '../game/labs/forge-score.js';
import { labBest, recordLab } from '../game/save.js';
import { levelFor, unlocksBetween } from '../game/progress.js';
import { uiRenderApp } from './app.js';
import { uiCommitSave } from './game-state.js';
import { uiForgeLevelOf, uiForgeRenderEmpty, uiForgeRenderPlay, uiForgeRenderSelect } from './forge-render.js';
import { uiForgeBoardRelease, uiSyncForgeBoard } from './forge-board.js';
import { uiEnterGrid } from './screen-grid.js';
import { uiOpenLevelUp } from './screen-levelup.js';
import { uiStoryLabFinish, uiStoryLabOpen } from './story-dialogue.js';

const FORGE_SEED_STRIDE = 1000;
const FORGE_FOCUS_BACK = 'forge-back';
const FORGE_STORY_ID = 'harness-forge';
const FORGE_SIM_SPOKEN = 'Simulated, no real AI.';
const FORGE_LEVEL_ACTION = /^forge-level-(\d+)$/;
const FORGE_PIECE_ACTION = /^forge-piece-(.+)$/;
const FORGE_CELL_ACTION = /^forge-cell-(\d+)-(\d+)$/;
const FORGE_DIGIT_KEY = /^[1-9]$/;
const FORGE_INTERACTIVE = 'button,a,input,select,textarea,[role="button"]';
const FORGE_MOVES = { ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1] };
const FORGE_MOVE_ACTION = /^forge-move-(-?\d)_(-?\d)$/;
const FORGE_REASONS = {
bounds:'That is off the board.',
path:'That is the path.',
occupied:'Something is already there.',
budget:'Not enough budget.',
over:'The run is over.',
};

function uiForgeLevelCount() {
return HARNESS_FORGE.levels.length;
}
function uiForgeStarsWord(count) {
return count + ' star' + (count === 1 ? '' :'s');
}
function uiForgePieceLabel(pieceId) {
return HARNESS_FORGE.pieces[pieceId].label;
}
function uiForgeThreatLabel(type) {
return HARNESS_FORGE.threats[type].label;
}
function uiForgeOpen(app) {
const forge = {
view:'select',levelIndex:0,game:null,seed:0,attempt:0,speed:1,selected:HARNESS_FORGE.pieceOrder[0],
cursor:null,summary:null,xpNote:null,
};
forge.onCell = function (...args) { uiForgeOnCell(app,...args); };
forge.onPhase = function (...args) { uiForgeOnPhase(app,...args); };
app.forge = forge;
app.screen = 'forge';
app.lastFocusKey = FORGE_FOCUS_BACK;
uiStoryLabOpen(app,FORGE_STORY_ID);
}
function uiForgeNewGame(app) {
const forge = app.forge;
forge.seed = forge.levelIndex * FORGE_SEED_STRIDE + forge.attempt;
forge.game = createGame(uiForgeLevelOf(app),forge.seed);
forge.summary = null;
forge.cursor = null;
forge.speed = 1;
forge.view = 'play';
app.lastFocusKey = 'forge-start';
}
function uiForgeStartLevel(app,index) {
if (index < 0 || index >= uiForgeLevelCount()) return;
app.forge.levelIndex = index;
app.forge.attempt = 0;
uiForgeNewGame(app);
}
function uiForgeToSelect(app) {
app.forge.view = 'select';
app.forge.game = null;
app.forge.summary = null;
app.forge.cursor = null;
app.lastFocusKey = 'forge-level-' + app.forge.levelIndex;
}
function uiForgeLeave(app) {
const note = app.forge.xpNote;
uiForgeBoardRelease(app);
app.forge = null;
uiEnterGrid(app);
if (!note || note.levelAfter <= note.levelBefore) return;
const unlocks = unlocksBetween(note.levelBefore,note.levelAfter);
uiOpenLevelUp(app,{ before:note.levelBefore,after:note.levelAfter,unlocks,source:'lab' });
}
function uiForgeBack(app) {
if (app.forge.view === 'play') uiForgeToSelect(app);
else uiForgeLeave(app);
}
function uiForgeRetry(app) {
app.forge.attempt += 1;
uiForgeNewGame(app);
}
function uiForgeNext(app) {
uiForgeStartLevel(app,app.forge.levelIndex + 1);
}
function uiForgeSelectPiece(app,pieceId) {
if (!Object.hasOwn(HARNESS_FORGE.pieces,pieceId)) return;
app.forge.selected = pieceId;
const piece = HARNESS_FORGE.pieces[pieceId];
app.pendingAnnounce = piece.label + ', cost ' + piece.cost + '. ' + piece.blurb + '.';
}
function uiForgeCellSpoken(col,row) {
return 'Column ' + (col + 1) + ', row ' + (row + 1) + '.';
}
function uiForgeTryPlace(app,col,row) {
const forge = app.forge;
const verdict = canPlace(forge.game,forge.selected,col,row);
if (!verdict.ok) {
app.pendingAnnounce = FORGE_REASONS[verdict.reason] || 'Cannot place there.';
return;
}
forge.game = placePiece(forge.game,forge.selected,col,row);
app.pendingAnnounce = uiForgePieceLabel(forge.selected) + ' placed. ' + uiForgeCellSpoken(col,row);
}
function uiForgeCell(app,col,row) {
const forge = app.forge;
if (forge.view !== 'play' || !forge.game) return;
const level = uiForgeLevelOf(app);
if (col < 0 || row < 0 || col >= level.cols || row >= level.rows) return;
forge.cursor = { col,row };
const own = pieceAt(forge.game,col,row);
if (own) {
app.pendingAnnounce = uiForgePieceLabel(own.type) + ' here. ' + uiForgeCellSpoken(col,row) + ' Sell it, or pick another tile.';
return;
}
uiForgeTryPlace(app,col,row);
}
function uiForgePlaceAtCursor(app) {
const forge = app.forge;
if (!forge.cursor) {
app.pendingAnnounce = 'Move the cursor with the arrow keys first.';
return;
}
const { col,row } = forge.cursor;
if (pieceAt(forge.game,col,row)) {
app.pendingAnnounce = 'Something is already there.';
return;
}
uiForgeTryPlace(app,col,row);
}
function uiForgeCursorSpoken(app,col,row) {
const game = app.forge.game;
const own = pieceAt(game,col,row);
if (own) return uiForgeCellSpoken(col,row) + ' ' + uiForgePieceLabel(own.type) + '.';
const verdict = canPlace(game,app.forge.selected,col,row);
const what = verdict.reason === 'path' ? ' Path.' :' Empty.';
return uiForgeCellSpoken(col,row) + what;
}
function uiForgeMove(app,dx,dy) {
const forge = app.forge;
const level = uiForgeLevelOf(app);
const from = forge.cursor || { col:Math.floor(level.cols / 2) - dx,row:Math.floor(level.rows / 2) - dy };
const col = Math.min(level.cols - 1,Math.max(0,from.col + dx));
const row = Math.min(level.rows - 1,Math.max(0,from.row + dy));
forge.cursor = { col,row };
app.pendingAnnounce = uiForgeCursorSpoken(app,col,row);
}
function uiForgeSell(app) {
const forge = app.forge;
const game = forge.game;
const cursor = forge.cursor;
const own = cursor ? pieceAt(game,cursor.col,cursor.row) :null;
if (!own) {
app.pendingAnnounce = 'Nothing to sell. Pick a piece on the board first.';
return;
}
if (game.phase !== 'build') {
app.pendingAnnounce = 'Selling is only allowed between waves.';
return;
}
const after = sellPiece(game,cursor.col,cursor.row);
if (after === game) return;
forge.game = after;
const sold = after.events.find(function (event) { return event.kind === 'sell'; });
app.pendingAnnounce = uiForgePieceLabel(own.type) + ' sold' + (sold ? ' for ' + sold.refund + ' budget.' :'.');
}
function uiForgeStart(app) {
const forge = app.forge;
if (forge.game.phase !== 'build') return;
const next = startWave(forge.game);
if (next === forge.game) return;
forge.game = next;
app.lastFocusKey = 'forge-speed';
app.pendingAnnounce = 'Wave ' + (next.waveIndex + 1) + ' of ' + uiForgeLevelOf(app).waves.length + ' started.';
}
function uiForgeSpeed(app) {
app.forge.speed = app.forge.speed === 2 ? 1 :2;
app.pendingAnnounce = 'Speed ' + app.forge.speed + 'x.';
}
function uiForgeThroughSpoken(summary) {
if (summary.gotThrough.length === 0) return 'Nothing got through.';
return summary.gotThrough.join(', ') + ' got through.';
}
function uiForgeRecordWin(app,stars) {
const level = uiForgeLevelOf(app);
const save = app.game.save;
const bestBefore = labBest(save,HARNESS_FORGE.id,level.id);
const gained = xpGain(bestBefore,stars);
const recorded = recordLab(save,{ labId:HARNESS_FORGE.id,levelId:level.id },stars).save;
const levelBefore = levelFor(save.xp);
const next = { ...recorded,xp:save.xp + gained };
uiCommitSave(app,next);
const old = app.forge.xpNote;
app.forge.xpNote = {
gained:(old ? old.gained :0) + gained,
levelBefore:old ? old.levelBefore :levelBefore,
levelAfter:levelFor(next.xp),
};
return gained;
}
function uiForgeAllCleared(save) {
return HARNESS_FORGE.levels.every(function (level) { return labBest(save,HARNESS_FORGE.id,level.id) > 0; });
}
function uiForgeWon(app) {
const forge = app.forge;
const stars = starsFor(forge.game);
const gained = uiForgeRecordWin(app,stars);
forge.summary = runSummary(forge.game);
const hasNext = forge.levelIndex < uiForgeLevelCount() - 1;
app.lastFocusKey = hasNext ? 'forge-next' :'forge-levels';
const xp = gained > 0 ? ' Plus ' + gained + ' XP.' :'';
app.pendingAnnounce = 'Run shipped. ' + uiForgeStarsWord(stars) + '. ' + uiForgeThroughSpoken(forge.summary) + xp;
if (uiForgeAllCleared(app.game.save)) uiStoryLabFinish(app,FORGE_STORY_ID);
}
function uiForgeLost(app) {
const forge = app.forge;
forge.summary = runSummary(forge.game);
app.lastFocusKey = 'forge-retry';
app.pendingAnnounce = 'Run failed. Integrity ran out. ' + uiForgeThroughSpoken(forge.summary);
}
function uiForgeWaveClear(app,event) {
const text = 'Wave ' + (event.index + 1) + ' cleared. Place or sell pieces, then start the next wave.';
app.pendingAnnounce = text;
app.lastFocusKey = 'forge-start';
}
function uiForgeEventOfKind(events,kind) {
return events.find(function (event) { return event.kind === kind; });
}
function uiForgeApplyPhase(app,events) {
const forge = app.forge;
if (!forge || forge.view !== 'play' || !forge.game || forge.summary) return;
const phase = forge.game.phase;
if (phase === 'won') uiForgeWon(app);
else if (phase === 'lost') uiForgeLost(app);
else {
const clear = uiForgeEventOfKind(events,'wave-clear');
if (clear) uiForgeWaveClear(app,clear);
}
}
function uiForgeOnPhase(app,...rest) {
const events = Array.isArray(rest[0]) ? rest[0] :(Array.isArray(rest[1]) ? rest[1] :[]);
if (!app.forge) return;
uiForgeApplyPhase(app,events);
uiRenderApp(app);
}
function uiForgeOnCell(app,...rest) {
const [col,row] = typeof rest[0] === 'object' ? rest.slice(1) :rest;
if (!app.forge || app.screen !== 'forge') return;
uiForgeCell(app,col,row);
uiRenderApp(app);
}
const FORGE_PLAY_ACTIONS = {
'forge-start':uiForgeStart,'forge-speed':uiForgeSpeed,'forge-sell':uiForgeSell,'forge-retry':uiForgeRetry,
'forge-next':uiForgeNext,'forge-levels':uiForgeToSelect,'forge-place':uiForgePlaceAtCursor,
};
function uiForgePatternAction(app,actionId) {
const level = FORGE_LEVEL_ACTION.exec(actionId);
if (level) {
if (app.forge.view === 'select') uiForgeStartLevel(app,Number(level[1]));
return true;
}
const piece = FORGE_PIECE_ACTION.exec(actionId);
if (piece) {
if (app.forge.view === 'play') uiForgeSelectPiece(app,piece[1]);
return true;
}
const cell = FORGE_CELL_ACTION.exec(actionId);
if (cell) {
uiForgeCell(app,Number(cell[1]),Number(cell[2]));
return true;
}
const move = FORGE_MOVE_ACTION.exec(actionId);
if (!move) return false;
if (app.forge.view === 'play') uiForgeMove(app,Number(move[1]),Number(move[2]));
return true;
}
function uiForgeApplyAction(app,actionId) {
if (!app.forge) return false;
if (actionId === FORGE_FOCUS_BACK) {
uiForgeBack(app);
return true;
}
if (Object.hasOwn(FORGE_PLAY_ACTIONS,actionId)) {
if (app.forge.view === 'play') FORGE_PLAY_ACTIONS[actionId](app);
return true;
}
return uiForgePatternAction(app,actionId);
}
function uiForgeOnButton(event) {
const target = event.target;
return Boolean(target && typeof target.closest === 'function' && target.closest(FORGE_INTERACTIVE));
}
const FORGE_KEY_IDS = {
s:'forge-sell',S:'forge-sell',Delete:'forge-sell',
w:'forge-start',W:'forge-start',n:'forge-start',N:'forge-start',
f:'forge-speed',F:'forge-speed',
};
function uiForgePlayKeyId(event) {
const key = event.key;
if (FORGE_MOVES[key]) return 'forge-move-' + FORGE_MOVES[key][0] + '_' + FORGE_MOVES[key][1];
if (Object.hasOwn(FORGE_KEY_IDS,key)) return FORGE_KEY_IDS[key];
if (key === 'Enter' || key === ' ') return uiForgeOnButton(event) ? null :'forge-place';
const pieceId = FORGE_DIGIT_KEY.test(key) ? HARNESS_FORGE.pieceOrder[Number(key) - 1] :null;
return pieceId ? 'forge-piece-' + pieceId :null;
}
function uiForgeKeepKeyFocus(app,event) {
const holder = event.target && typeof event.target.closest === 'function' ? event.target.closest('[data-focus-key]') :null;
if (holder) app.lastFocusKey = holder.getAttribute('data-focus-key');
}
function uiForgeKeyAction(event,app) {
if (!app.forge) return null;
if (event.key === 'Escape') {
event.preventDefault();
return event.repeat ? { type:'handled' } :{ type:'action',id:FORGE_FOCUS_BACK };
}
if (app.forge.view !== 'play' || event.ctrlKey || event.metaKey || event.altKey) return null;
const id = uiForgePlayKeyId(event);
if (!id) return null;
event.preventDefault();
uiForgeKeepKeyFocus(app,event);
return event.repeat ? { type:'handled' } :{ type:'action',id };
}
function uiForgeRender(app) {
if (!app.forge) return uiForgeRenderEmpty();
return app.forge.view === 'play' ? uiForgeRenderPlay(app) :uiForgeRenderSelect(app);
}
function uiForgeAnnounce() {
return 'Harness forge. Place harness pieces beside the path to stop the failures of a runaway agent. ' + FORGE_SIM_SPOKEN;
}
function uiForgeSync(app,active,root) {
uiSyncForgeBoard(app,active,root);
}
function uiForgeRelease(app) {
uiForgeBoardRelease(app);
}
function uiForgeScreen() {
return {
id:'forge',
render:uiForgeRender,
focusKey:function () { return FORGE_FOCUS_BACK; },
announce:uiForgeAnnounce,
keyAction:uiForgeKeyAction,
applyAction:uiForgeApplyAction,
sync:uiForgeSync,
release:uiForgeRelease,
};
}

export { uiForgeScreen, uiForgeOpen, uiForgeOnCell, uiForgeOnPhase };

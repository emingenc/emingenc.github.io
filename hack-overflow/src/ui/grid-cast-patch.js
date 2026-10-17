import {
ARRIVE_CELLS,ARRIVE_STEP_MS,BOLT_BEAT,boltToast,BUSY_TOAST,OFFLINE_TOAST,CRATES_TOAST,CRATES_TOAST_LINE,DONE_TOAST,DONE_TOAST_LINE,EAST_BEAT,EAST_TOAST,
PATCH_CELL,QUEST_ID,TALK_LINES,TALK_LINES_LINE,TELL_TOAST,crateText,eastWingDue,trailAt,trailStep,
} from '../game/cast/patch.js';
import { REFUSAL_BEAT } from '../game/cast/refusal.js';
import { withBeat } from '../game/ext/ops.js';
import { cellToward } from '../game/move.js';
import { isLine } from '../game/opening.js';
import { findPath } from '../game/path.js';
import { startFlow } from '../game/story/story.js';
import { uiRenderApp } from './app.js';
import { uiPointerIsCoarse } from './dom.js';
import { uiCommitExt } from './ext-storage.js';
import { uiCastSay,uiCastSleep,uiCastStill } from './grid-cast-act.js';
import { uiBreakStack,uiFreshBroken } from './grid-cast-actors.js';
import { uiCastSync } from './grid-cast-sync.js';
import { uiPinQuest,uiQuestEvent } from './quest-run.js';
import { uiRefreshPill } from './rank-hud.js';
import { uiShowToast } from './grid-toast.js';
import { uiStoryBegin,uiStorySettle } from './story-dialogue.js';

const TALK_ID = 'patch-talk';
const MENU_POLL_MS = 200;
const OK = { id:'ok',label:'OK',default:true };
const OK_KEY = 'story-choice-ok';

function uiTalkButton(target,choice) {
const button = document.createElement('button');
button.className = 'story-choice';
button.type = 'button';
button.textContent = OK.label;
button.setAttribute('data-focus-key',OK_KEY);
button.setAttribute('aria-label',OK.label);
button.addEventListener('click',function () {
if (target.story && target.story.choice === choice) {
uiStorySettle(target,OK.id);
uiRenderApp(target);
}
});
return button;
}
function uiTalkChoice(resolve) {
const choice = { choices:[OK],resolve };
let shown = null;
let asked = false;
choice.buttons = function (target) {
shown = { target,button:uiTalkButton(target,choice) };
return [shown.button];
};
choice.ask = function () {
if (asked) return;
asked = true;
shown.target.lastFocusKey = OK_KEY;
shown.button.focus();
};
return choice;
}
function uiTalkSheet(app,kit) {
const lines = isLine(app.game.ext) ? TALK_LINES_LINE :TALK_LINES;
return new Promise(function (resolve) {
uiStoryBegin(app,startFlow([{ id:TALK_ID,lines,toast:false }]),uiTalkChoice(resolve));
kit.uiChoiceWireKeys(app);
uiRenderApp(app);
});
}
function uiTalkDone(app) {
const game = app.game;
const line = isLine(game.ext);
uiCommitExt(app,withBeat(line ? withBeat(game.ext,REFUSAL_BEAT) :game.ext,BOLT_BEAT));
game.cast.role = 'follow';
game.cast.trail = line && game.cast.trail ? game.cast.trail :trailAt(PATCH_CELL);
if (line) import('./grid-sentry.js').then(function (sentry) { sentry.uiInstallSentry(app); }).catch(function () {});
}
async function uiPatchTalk(app) {
const kit = await import('./story-choice.js');
await uiCastStill(app);
await uiWaitMenu(app);
if (app.story || (app.game.cast.role !== 'talk' && app.game.cast.role !== 'walk')) return;
await uiTalkSheet(app,kit);
const game = app.game;
uiTalkDone(app);
await uiPinQuest(app,QUEST_ID);
uiCastSync(app);
uiRenderApp(app);
await uiCastSay(app,{ text:boltToast(uiPointerIsCoarse()),kind:'reward' });
await uiCastSay(app,{ text:TELL_TOAST,kind:'info' });
await uiCastSay(app,{ text:isLine(game.ext) ? CRATES_TOAST_LINE :CRATES_TOAST,kind:'info' });
}
async function uiWaitMenu(app) {
while (app.menuOpen && app.screen === 'grid') await uiCastSleep(app,MENU_POLL_MS);
}
async function uiPatchApproach(app) {
const game = app.game;
const cast = game.cast;
const route = findPath(game.world,game.progress,{ from:game.avatar.pos,to:PATCH_CELL }) || [];
let start = { ...game.avatar.pos };
route.slice(0,ARRIVE_CELLS).forEach(function (dir) { start = cellToward(start,dir); });
cast.trail = trailAt(start);
for (let step = 0; step < ARRIVE_CELLS * 2; step += 1) {
if (app.screen !== 'grid' || cast.role !== 'walk') return false;
const here = cast.trail;
const ahead = findPath(game.world,game.progress,{ from:{ col:here.col,row:here.row },to:game.avatar.pos });
if (!ahead || ahead.length <= 1) return true;
cast.trail = trailStep(here,cellToward(here,ahead[0]),performance.now());
await uiCastSleep(app,ARRIVE_STEP_MS);
await uiWaitMenu(app);
}
return true;
}
async function uiPatchArrive(app) {
const game = app.game;
const cast = game.cast;
if (!cast || cast.inert || app.screen !== 'grid' || app.story || game.opening || cast.run) return;
uiCastSync(app);
if (cast.role !== 'walk') return;
cast.run = 'arrive';
let arrived = false;
try {
arrived = await uiPatchApproach(app);
} finally {
cast.run = null;
}
if (arrived) await uiPatchTalk(app);
}
function uiPatchBump(app,prop) {
const game = app.game;
if (prop === 'patch' && game.cast.role === 'busy') uiShowToast(app,{ text:BUSY_TOAST,kind:'info' });
else if (game.cast.role === 'offline' && prop.startsWith('bench-')) uiShowToast(app,{ text:OFFLINE_TOAST,kind:'info' });
else if (prop === 'patch' && game.cast.role === 'talk') uiPatchTalk(app).catch(console.error);
else if (prop.startsWith('crate-')) uiShowToast(app,{ text:crateText(prop),kind:'info' });
else return false;
return true;
}
function uiPatchFollow(app,info) {
const cast = app.game.cast;
if (cast.role !== 'follow') return;
cast.trail = cast.trail ? trailStep(cast.trail,info.from,performance.now()) :trailAt(info.from);
}
async function uiPatchEast(app) {
const game = app.game;
if (!eastWingDue(game.ext)) return;
uiCommitExt(app,withBeat(game.ext,EAST_BEAT));
await uiRefreshPill(app);
await uiCastSay(app,{ text:EAST_TOAST,kind:'info' });
}
async function uiPatchCrates(app) {
const game = app.game;
uiBreakStack(game);
const fresh = uiFreshBroken(game);
if (fresh.length === 0) return;
game.cast.broken = [...game.cast.broken,...fresh];
let done = false;
for (let index = 0; index < fresh.length; index += 1) done = (await uiQuestEvent(app,QUEST_ID,{ kind:'progress' })).done || done;
if (!done) return;
await uiCastSay(app,{ text:isLine(game.ext) ? DONE_TOAST_LINE :DONE_TOAST,kind:'info' });
await uiPatchEast(app);
}

export { uiPatchTalk,uiPatchArrive,uiPatchBump,uiPatchFollow,uiPatchCrates,uiPatchEast };

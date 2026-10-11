import {
BOLT_BEAT,BOLT_TOAST,BUSY_TOAST,CRATES_TOAST,DONE_TOAST,EAST_BEAT,EAST_TOAST,PATCH_CELL,QUEST_ID,TALK_LINES,TELL_TOAST,
crateText,eastWingDue,trailAt,trailStep,
} from '../game/cast/patch.js';
import { withBeat } from '../game/ext/ops.js';
import { startFlow } from '../game/story/story.js';
import { uiRenderApp } from './app.js';
import { uiCommitExt } from './ext-storage.js';
import { uiCastSay,uiCastStill } from './grid-cast-act.js';
import { uiFreshBroken } from './grid-cast-actors.js';
import { uiCastSync } from './grid-cast-sync.js';
import { uiPinQuest,uiQuestEvent } from './quest-run.js';
import { uiRefreshPill } from './rank-hud.js';
import { uiShowToast } from './grid-toast.js';
import { uiStoryBegin,uiStorySettle } from './story-dialogue.js';

const TALK_ID = 'patch-talk';
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
return new Promise(function (resolve) {
uiStoryBegin(app,startFlow([{ id:TALK_ID,lines:TALK_LINES,toast:false }]),uiTalkChoice(resolve));
kit.uiChoiceWireKeys(app);
uiRenderApp(app);
});
}
async function uiPatchTalk(app) {
const kit = await import('./story-choice.js');
await uiCastStill(app);
if (app.story || app.game.cast.role !== 'talk') return;
await uiTalkSheet(app,kit);
const game = app.game;
uiCommitExt(app,withBeat(game.ext,BOLT_BEAT));
game.cast.role = 'follow';
game.cast.trail = trailAt(PATCH_CELL);
await uiPinQuest(app,QUEST_ID);
uiCastSync(app);
uiRenderApp(app);
await uiCastSay(app,{ text:BOLT_TOAST,kind:'reward' });
await uiCastSay(app,{ text:TELL_TOAST,kind:'info' });
await uiCastSay(app,{ text:CRATES_TOAST,kind:'info' });
}
function uiPatchBump(app,prop) {
const game = app.game;
if (prop === 'patch' && game.cast.role === 'busy') uiShowToast(app,{ text:BUSY_TOAST,kind:'info' });
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
const fresh = uiFreshBroken(game);
if (fresh.length === 0) return;
game.cast.broken = [...game.cast.broken,...fresh];
let done = false;
for (let index = 0; index < fresh.length; index += 1) done = (await uiQuestEvent(app,QUEST_ID,{ kind:'progress' })).done || done;
if (!done) return;
await uiCastSay(app,{ text:DONE_TOAST,kind:'info' });
await uiPatchEast(app);
}

export { uiPatchTalk,uiPatchBump,uiPatchFollow,uiPatchCrates,uiPatchEast };

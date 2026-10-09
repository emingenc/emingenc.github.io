import { GAME_EVENT } from '../game/game-events.js';
import { DIRS, cellToward } from '../game/move.js';
import { thingAt } from '../game/world.js';
import { withPosition, claimCache, claimCore, markBeatsSeen, markMet } from '../game/save.js';
import { rigOf } from '../game/rig-catalog.js';
import { unlocksBetween } from '../game/progress.js';
import { rigMeeting } from '../game/story/story.js';
import { blockedText, nearText, sectorName } from '../game/messages.js';
import { uiPointerIsCoarse, uiPrefersReducedMotion } from './dom.js';
import { uiEmit } from './bus.js';
import { uiCommitSave } from './game-state.js';
import { uiRenderApp, uiRenderKeepingFocus } from './app.js';
import { uiObjectiveChanged } from './grid-objective.js';
import { uiShowToast } from './grid-toast.js';
import { uiJackIn } from './breach-flow.js';
import { uiOpenLevelUp } from './screen-levelup.js';
import { uiOpenEnding } from './screen-ending.js';
import { uiOpenRigHost } from './rig-loader.js';
import { uiStoryShow } from './story-dialogue.js';
import { uiActorsTick, uiNoteDoorway } from './grid-actors.js';

const UI_STORY_FOCUS_KEY = 'story-next';
const UI_NEAR_KINDS = { terminal:1,core:1,kernel:1,rig:1 };
function uiNearThingAt(game,dir) {
const thing = thingAt(game.world,cellToward(game.avatar.pos,dir));
return thing && UI_NEAR_KINDS[thing.kind] ? thing :null;
}
function uiNearDir(game) {
const dirs = [game.avatar.facing,...Object.keys(DIRS)];
return dirs.find(function (dir) { return uiNearThingAt(game,dir) !== null; }) || null;
}
function uiActWord() {
return uiPointerIsCoarse() ? 'Interact' :'Enter';
}
function uiWalkGoesOn(game) {
const plan = game.walk.plan;
return Boolean(plan && plan.dirs.length > 0);
}
function uiCheckNear(game) {
if (uiWalkGoesOn(game)) { game.walk.nearId = null; return; }
const dir = uiNearDir(game);
const thing = dir ? uiNearThingAt(game,dir) :null;
const id = thing ? thing.id :null;
if (id === game.walk.nearId) return;
game.walk.nearId = id;
if (thing) uiEmit(GAME_EVENT.NEAR,{ id,kind:thing.kind,label:nearText(game.world,id,{ progress:game.progress,actWord:uiActWord(),save:game.save }) });
}
function uiActedOn(game) {
const thing = uiNearThingAt(game,game.avatar.facing);
game.walk.nearId = thing ? thing.id :null;
}
function uiEmitStep(game,from) {
uiEmit(GAME_EVENT.STEP,{ pos:game.avatar.pos,facing:game.avatar.facing,from });
uiCheckNear(game);
}
function uiOnStep(app,info) {
uiEmitStep(app.game,info.from);
return uiObjectiveChanged(app);
}
const UI_LEVEL_UP_WAIT_MS = { cache:700,core:850 };
function uiGridInPlay(app) {
return app.screen === 'grid' && !app.menuOpen && !app.story && !app.game.travelOpen;
}
function uiOpenDueLevelUp(app) {
const game = app.game;
const due = game.levelUpDue;
if (!due) return false;
window.clearTimeout(due.timer);
game.levelUpDue = null;
if (game.progress.level !== due.after) return false;
uiOpenLevelUp(app,{ before:due.before,after:due.after,unlocks:unlocksBetween(due.before,due.after),source:due.source });
return true;
}
function uiOpenReadyLevelUp(app) {
const due = app.game.levelUpDue;
return Boolean(due && due.waited) && uiGridInPlay(app) && uiOpenDueLevelUp(app);
}
function uiLevelUpWaitOver(app,due) {
due.waited = true;
if (uiOpenReadyLevelUp(app)) uiRenderApp(app);
}
function uiLevelUpAfterRender(app) {
const due = app.game.levelUpDue;
if (!due || !due.waited || !uiGridInPlay(app)) return;
window.setTimeout(function () { if (uiOpenReadyLevelUp(app)) uiRenderApp(app); },0);
}
function uiQueueLevelUp(app,crossing) {
const game = app.game;
const due = game.levelUpDue;
if (due) window.clearTimeout(due.timer);
const before = due && due.after === crossing.before ? due.before :crossing.before;
const next = { before,after:crossing.after,source:crossing.source,waited:Boolean(uiPrefersReducedMotion()),timer:0 };
game.levelUpDue = next;
if (next.waited) { uiOpenReadyLevelUp(app); return; }
next.timer = window.setTimeout(function () { uiLevelUpWaitOver(app,next); },UI_LEVEL_UP_WAIT_MS[crossing.source]);
}
function uiLevelUpAfter(app,change) {
const after = app.game.progress.level;
uiEmit(GAME_EVENT.XP,{ gained:change.gained,xp:app.game.progress.xp,durationMs:0,source:change.source });
if (after > change.levelBefore) uiQueueLevelUp(app,{ before:change.levelBefore,after,source:change.source });
}
function uiLevelUpBeforeLeaving(app) {
if (!uiOpenDueLevelUp(app)) return false;
app.game.walk.plan = { dirs:[app.game.avatar.facing] };
return true;
}
function uiOnCache(app,info) {
const game = app.game;
const levelBefore = game.progress.level;
const claim = claimCache(game.save,info.event.id);
uiCommitSave(app,claim.save);
uiEmitStep(game,info.from);
uiEmit(GAME_EVENT.CACHE,{ id:info.event.id,cell:game.avatar.pos,xp:claim.gained });
uiShowToast(app,{ text:'DATA CACHE +' + claim.gained + ' XP',kind:'reward',announced:true });
uiLevelUpAfter(app,{ gained:claim.gained,levelBefore,source:'cache' });
return true;
}
function uiOnBump(app) {
uiEmit(GAME_EVENT.BUMP,{ pos:app.game.avatar.pos,facing:app.game.avatar.facing });
uiCheckNear(app.game);
return false;
}
function uiBlock(app,info) {
const thing = app.game.world.things[info.event.id];
const text = blockedText(app.game.world,info.event);
uiEmit(GAME_EVENT.BLOCKED,{ id:thing.id,kind:thing.kind,text });
uiShowToast(app,{ text,kind:'warn',announced:true });
uiCheckNear(app.game);
return true;
}
function uiClaimCore(app,event) {
const game = app.game;
const levelBefore = game.progress.level;
const claim = claimCore(game.save,event.family);
uiCommitSave(app,claim.save);
const name = sectorName(game.world,event.family);
const core = game.world.cores[event.family];
uiEmit(GAME_EVENT.SECTOR_CLEAR,{ family:event.family,name,xp:claim.gained,cell:{ col:core.col,row:core.row } });
uiShowToast(app,{ kind:'sector',head:'SECTOR CLEAR',text:name,detail:'+' + claim.gained + ' XP',announced:true });
uiLevelUpAfter(app,{ gained:claim.gained,levelBefore,source:'core' });
return true;
}
function uiOnCore(app,info) {
uiActedOn(app.game);
if (!info.event.ready) return uiBlock(app,info);
if (!info.event.claimed) return uiClaimCore(app,info.event);
uiShowToast(app,{ text:sectorName(app.game.world,info.event.family) + ' CORE already claimed',kind:'info' });
return true;
}
function uiOnTerminal(app,info) {
uiActedOn(app.game);
if (!uiLevelUpBeforeLeaving(app)) uiJackIn(app,info.event.key);
return true;
}
function uiOnKernel(app) {
uiActedOn(app.game);
if (!uiLevelUpBeforeLeaving(app)) uiOpenEnding(app);
return true;
}
function uiStoryKeepsFocus(app) {
if (!app.story) return;
app.story.returnKey = app.lastFocusKey;
app.lastFocusKey = UI_STORY_FOCUS_KEY;
}
function uiOpenRigScreen(app,rig) {
app.entering = true;
uiOpenRigHost(app,rig).then(function () {
if (app.screen === 'grid') return;
uiStoryKeepsFocus(app);
uiRenderApp(app);
}).catch(function () {
uiShowToast(app,{ text:rig.title + ' could not load. Try again.',kind:'info' });
uiRenderKeepingFocus(app);
}).finally(function () {
app.entering = false;
});
}
function uiRigMeeting(app,rig) {
const meeting = rigMeeting(rig.id,rig.storyId ?? rig.labId);
uiStoryShow(app,meeting.show);
const unseen = meeting.skip.filter((id) => !app.game.save.story.includes(id));
if (unseen.length > 0) uiCommitSave(app,markBeatsSeen(app.game.save,unseen));
}
function uiOnRig(app,info) {
const game = app.game;
if (app.entering) return false;
uiActedOn(game);
if (uiLevelUpBeforeLeaving(app)) return true;
const rig = rigOf(info.event.rigId);
if (!info.event.met) uiCommitSave(app,markMet(game.save,rig.id));
uiEmit(GAME_EVENT.RIG_ENTER,{ rigId:rig.id,cell:{ ...game.avatar.pos } });
uiRigMeeting(app,rig);
uiOpenRigScreen(app,rig);
return true;
}
const UI_TICKING_EVENTS = new Set(['step','bump']);
const UI_STEP_HANDLERS = {
step:uiOnStep,cache:uiOnCache,bump:uiOnBump,blocked:uiBlock,encrypted:uiBlock,
terminal:uiOnTerminal,core:uiOnCore,kernel:uiOnKernel,rig:uiOnRig,
};
function uiApplyStepEvent(app,result) {
const game = app.game;
const from = game.avatar.pos;
game.avatar = { pos:result.pos,facing:result.facing };
uiCommitSave(app,withPosition(game.save,game.avatar));
uiNoteDoorway(app,result.pos);
const hurt = UI_TICKING_EVENTS.has(result.event.type) && uiActorsTick(app);
const rerender = UI_STEP_HANDLERS[result.event.type](app,{ event:result.event,from });
if (rerender || hurt) uiRenderKeepingFocus(app);
}

export { uiApplyStepEvent, uiNearDir, uiOpenReadyLevelUp, uiLevelUpAfterRender, uiLevelUpAfter };

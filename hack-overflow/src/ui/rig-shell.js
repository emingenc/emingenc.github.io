import { GAME_EVENT } from '../game/game-events.js';
import { rigUnlocked, rigVariant } from '../game/rig-reward.js';
import { labBest } from '../game/save.js';
import { uiEl, uiPrefersReducedMotion } from './dom.js';
import { uiEmit } from './bus.js';
import { uiRenderApp } from './app.js';
import { uiRigHostLeave, uiRigHostRecordWin } from './rig-host-common.js';
import { uiStoryLabFinish } from './story-dialogue.js';
import { RIG_MAX_STARS, RIG_STAR_FIRST_MS, RIG_STAR_STEP_MS, uiRigResultCard, uiRigStars } from './rig-result.js';

const RIG_BACK = 'rig-back';
const RIG_SKIP = 'rig-skip';
const RIG_CODE = 'rig-code';
const RIG_XP_COUNT_MS = 600;
const RIG_HOLD_MS = 700;
const RIG_LEVEL_ACTION = /^rig-level-(\d+)$/;

const uiRigTimers = new Set();
function uiRigLater(ms,run) {
const id = window.setTimeout(function () {
uiRigTimers.delete(id);
run();
},ms);
uiRigTimers.add(id);
}
function uiRigCancelTimers() {
uiRigTimers.forEach(function (id) { window.clearTimeout(id); });
uiRigTimers.clear();
}

function uiRigButton(action,label,kind) {
return uiEl('button',{ className:'btn rig-btn ' + kind,text:label,attrs:{ type:'button','data-action':action,'data-focus-key':action } });
}
function uiRigStarsWord(count) {
return count + ' star' + (count === 1 ? '' :'s');
}
function uiRigLevelId(app,machine) {
return machine.rig.levels[app.rig.levelIndex];
}
function uiRigShellOpen(app,machine) {
const firstVisit = !Object.hasOwn(app.game.save.labs,machine.rig.labId);
uiRigCancelTimers();
app.rig = { rigId:machine.rig.id,view:'select',root:firstVisit ? 'play' :'select',levelIndex:0,tries:machine.rig.levels.map(() => 0),xpNote:null,gained:0 };
app.screen = 'rig';
app.lastFocusKey = RIG_BACK;
if (firstVisit) machine.start(app);
}
function uiRigFreshRun(app) {
uiRigCancelTimers();
Object.assign(app.rig,{ ending:false,reveal:false,end:null,codeOpen:false,gained:0 });
}
function uiRigVariant(app,machine) {
return rigVariant(app.game.save,machine.rig,app.rig.levelIndex,app.rig.tries[app.rig.levelIndex]);
}
function uiRigLockedText(machine,index) {
return 'Clear ' + machine.titles[index - 1] + ' to open.';
}
function uiRigHasNext(app,machine) {
return app.rig.levelIndex < machine.titles.length - 1;
}


function uiRigLeave(app,machine) {
const note = app.rig.xpNote;
uiRigCancelTimers();
app.rig = null;
uiRigHostLeave(app,note,machine.rig.title);
}
function uiRigToSelect(app) {
uiRigFreshRun(app);
app.rig.view = 'select';
app.rig.root = 'select';
app.lastFocusKey = 'rig-level-' + app.rig.levelIndex;
}
function uiRigBack(app,machine) {
if (app.rig.root !== 'select' || app.rig.view === 'select') uiRigLeave(app,machine);
else uiRigToSelect(app);
}
function uiRigStart(app,machine) {
uiRigFreshRun(app);
machine.start(app);
}
function uiRigRetry(app,machine) {
if (app.rig.view === 'result') uiRigStart(app,machine);
}
function uiRigNext(app,machine) {
if (app.rig.view !== 'result' || !uiRigHasNext(app,machine)) return;
app.rig.levelIndex += 1;
uiRigStart(app,machine);
}
function uiRigPickLevel(app,machine,index) {
if (index >= machine.titles.length) return;
if (!rigUnlocked(app.game.save,machine.rig,index)) {
app.pendingAnnounce = uiRigLockedText(machine,index);
uiEmit(GAME_EVENT.RIG_BAD,{ rigId:machine.rig.id,reason:'locked' });
return;
}
app.rig.levelIndex = index;
uiRigStart(app,machine);
}
function uiRigToggleCode(app) {
if (app.rig.view !== 'result') return;
app.rig.codeOpen = !app.rig.codeOpen;
app.lastFocusKey = RIG_CODE;
}
const RIG_SHELL_ACTIONS = { [RIG_BACK]:uiRigBack,'rig-retry':uiRigRetry,'rig-next':uiRigNext,'rig-levels':uiRigToSelect,[RIG_CODE]:uiRigToggleCode };


function uiRigAllCleared(save,rig) {
return rig.levels.every((levelId) => labBest(save,rig.labId,levelId) > 0);
}
function uiRigRecordWin(app,machine,stars) {
uiRigHostRecordWin(app,app.rig,{ rig:machine.rig,levelId:uiRigLevelId(app,machine),stars });
}
function uiRigXpEvent(app,gained,atMs) {
const durationMs = uiPrefersReducedMotion() ? 0 :RIG_XP_COUNT_MS;
return { type:GAME_EVENT.XP,payload:{ gained,xp:app.game.save.xp,durationMs,source:'rig' },atMs };
}
function uiRigWinEvents(app,machine,end) {
const levelId = uiRigLevelId(app,machine);
const stars = Array.from({ length:end.stars },(_,index) => ({ type:GAME_EVENT.STAR,payload:{ index,of:RIG_MAX_STARS },atMs:RIG_STAR_FIRST_MS + index * RIG_STAR_STEP_MS }));
const clear = { type:GAME_EVENT.RIG_CLEAR,payload:{ rigId:machine.rig.id,levelId,stars:end.stars },atMs:0 };
const xp = app.rig.gained > 0 ? [uiRigXpEvent(app,app.rig.gained,RIG_STAR_FIRST_MS + end.stars * RIG_STAR_STEP_MS)] :[];
return [clear,...stars,...xp];
}
function uiRigEndEvents(app,machine,end) {
if (end.won) return uiRigWinEvents(app,machine,end);
return [{ type:GAME_EVENT.RIG_FAIL,payload:{ rigId:machine.rig.id,levelId:uiRigLevelId(app,machine),reason:end.reason },atMs:0 }];
}
function uiRigXpSpoken(gained) {
return gained > 0 ? ' Plus ' + gained + ' XP.' :' Best kept.';
}
function uiRigEmitEvent(event) {
if (event.done) return;
event.done = true;
uiEmit(event.type,event.payload);
}
function uiRigShowResult(app,machine,animate) {
const rig = app.rig;
const { end } = rig;
Object.assign(rig,{ view:'result',ending:false,reveal:animate });
app.lastFocusKey = end.focus;
app.pendingAnnounce = end.announce;
end.events.forEach(function (event) {
if (animate && event.atMs > 0) uiRigLater(event.atMs,() => uiRigEmitEvent(event));
else uiRigEmitEvent(event);
});
if (animate) uiRigLater(RIG_STAR_FIRST_MS + RIG_MAX_STARS * RIG_STAR_STEP_MS,() => { rig.reveal = false; });
if (end.won && !end.outroDone && uiRigAllCleared(app.game.save,machine.rig)) uiStoryLabFinish(app,machine.rig.id);
end.outroDone = true;
}
function uiRigHoldOver(app,machine,rig) {
if (app.rig !== rig || !rig.ending) return;
uiRigShowResult(app,machine,true);
uiRenderApp(app);
}
function uiRigEnd(app,machine,end) {
const rig = app.rig;
if (end.won) uiRigRecordWin(app,machine,end.stars);
else rig.tries[rig.levelIndex] += 1;
const focus = end.won && uiRigHasNext(app,machine) ? 'rig-next' :'rig-retry';
const announce = end.announce + (end.won ? uiRigXpSpoken(rig.gained) :'');
rig.end = { ...end,focus,announce,events:uiRigEndEvents(app,machine,end),outroDone:false };
if (uiPrefersReducedMotion()) return uiRigShowResult(app,machine,false);
rig.ending = true;
uiRigLater(RIG_HOLD_MS,() => uiRigHoldOver(app,machine,rig));
}
function uiRigSettle(app,machine) {
const rig = app.rig;
uiRigCancelTimers();
if (rig.ending) return uiRigShowResult(app,machine,false);
rig.reveal = false;
rig.end.events.forEach(uiRigEmitEvent);
}
function uiRigSettleFirst(app,machine,actionId) {
const rig = app.rig;
if (!rig.ending && !rig.reveal) return false;
if (actionId === RIG_BACK) return false;
const wasHolding = rig.ending;
uiRigSettle(app,machine);
return wasHolding || actionId === RIG_SKIP;
}
function uiRigShellAction(app,machine,actionId) {
if (uiRigSettleFirst(app,machine,actionId)) return true;
if (Object.hasOwn(RIG_SHELL_ACTIONS,actionId)) {
RIG_SHELL_ACTIONS[actionId](app,machine);
return true;
}
const level = RIG_LEVEL_ACTION.exec(actionId);
if (!level) return actionId === RIG_SKIP;
if (app.rig.view === 'select') uiRigPickLevel(app,machine,Number(level[1]));
return true;
}
function uiRigShellSync(app,active) {
if (!active || !app.rig) uiRigCancelTimers();
}
function uiRigFocusKey(app) {
if (!app.rig) return RIG_BACK;
if (app.rig.view === 'result') return app.rig.end ? app.rig.end.focus :'rig-retry';
return app.rig.view === 'select' ? 'rig-level-' + app.rig.levelIndex :RIG_BACK;
}


function uiRigHeader(machine,extras) {
const back = uiEl('button',{ className:'btn btn-ghost rig-back',text:'◄ BACK',attrs:{ type:'button','data-action':RIG_BACK,'data-focus-key':RIG_BACK,'aria-label':'Back' } });
return uiEl('header',{ className:'rig-head',children:[back,uiEl('h1',{ className:'rig-title',text:machine.rig.title }),...extras] });
}
function uiRigLevelNote(app,machine,index) {
if (!rigUnlocked(app.game.save,machine.rig,index)) return { text:uiRigLockedText(machine,index),open:false };
const best = labBest(app.game.save,machine.rig.labId,machine.rig.levels[index]);
return { text:uiRigStars(best),open:true,spoken:'Best ' + best + ' of ' + RIG_MAX_STARS + ' stars.' };
}
function uiRigLevelButton(app,machine,index) {
const action = 'rig-level-' + index;
const note = uiRigLevelNote(app,machine,index);
const title = machine.titles[index];
const attrs = { type:'button','data-action':action,'data-focus-key':action,'aria-label':title + '. ' + (note.spoken || note.text) };
if (!note.open) attrs['aria-disabled'] = 'true';
return uiEl('button',{ className:'btn rig-level' + (note.open ? '' :' is-locked'),attrs,children:[
uiEl('span',{ className:'rig-level-title',text:(index + 1) + '. ' + title }),
uiEl('span',{ className:'rig-level-note',text:note.text }),
] });
}
function uiRigSelect(app,machine,className) {
const levels = machine.titles.map((title,index) => uiRigLevelButton(app,machine,index));
const pitch = machine.rig.pitch.charAt(0).toUpperCase() + machine.rig.pitch.slice(1) + '.';
return uiEl('section',{ className:'screen rig-screen ' + className,attrs:{ 'data-screen':'rig' },children:[
uiRigHeader(machine,[]),
uiEl('p',{ className:'rig-pitch',text:pitch }),
uiEl('div',{ className:'rig-levels',children:levels }),
] });
}
function uiRigResultButtons(app,machine,card) {
const next = card.won && uiRigHasNext(app,machine);
const buttons = [next ? uiRigButton('rig-next','NEXT ►','btn-primary') :null,
uiRigButton('rig-retry','RETRY',next ? 'btn-ghost' :'btn-primary'),uiRigButton('rig-levels','LEVELS','btn-ghost')];
return uiEl('div',{ className:'rig-actions',children:buttons.filter(Boolean) });
}
function uiRigResult(app,machine,card) {
const rig = app.rig;
const view = { reveal:Boolean(rig.reveal),gained:rig.gained,codeOpen:Boolean(rig.codeOpen) };
const result = uiRigResultCard(card,view,uiRigResultButtons(app,machine,card));
return uiEl('section',{ className:'screen rig-screen rig-result-screen ' + card.className,attrs:{ 'data-screen':'rig' },children:[uiRigHeader(machine,[]),result] });
}

export {
uiRigShellOpen,uiRigShellAction,uiRigShellSync,uiRigVariant,uiRigHasNext,uiRigEnd,uiRigLeave,uiRigBack,uiRigFocusKey,
uiRigHeader,uiRigSelect,uiRigResult,uiRigStarsWord,
};

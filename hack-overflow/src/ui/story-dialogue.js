import { markBeatsSeen } from '../game/save.js';
import { advanceFlow,beatsDue,earnedToastIds,finalBeat,labBeat,lineAt,pendingIds,startFlow,toastText,unseenBeats } from '../game/story/story.js';
import { uiAnnounce } from './dom.js';
import { uiCommitSave } from './game-state.js';
import { uiShowToast } from './grid-toast.js';
import { uiWalkReleaseAll } from './grid-walk.js';
import { sheetGuardShow,uiSheetGuardWire } from './sheet-guard.js';
import { uiStoryLineDone,uiStoryStopTimer } from './story-render.js';

const STORY_NEXT_KEY = 'story-next';

function uiStoryAnnounceLine(story) {
const line = lineAt(story.flow);
uiAnnounce(line.who + ': ' + line.text);
}
function uiStoryMarkSeen(app,ids) {
const missing = ids.filter((id) => !app.game.save.story.includes(id));
if (missing.length > 0) uiCommitSave(app,markBeatsSeen(app.game.save,missing));
}
function uiStoryBegin(app,flow,choice) {
uiWalkReleaseAll(app);
app.game.walk.plan = null;
const now = performance.now();
app.story = { flow,lineStartedAt:now,revealed:false,returnKey:app.lastFocusKey,guard:sheetGuardShow(now),choice };
app.lastFocusKey = STORY_NEXT_KEY;
uiSheetGuardWire(app);
if (!choice) uiStoryMarkSeen(app,[lineAt(flow).beatId]);
uiStoryAnnounceLine(app.story);
}
function uiStoryOpenFlow(app,flow) {
uiStoryBegin(app,flow,null);
}
function uiStoryClose(app) {
uiStoryStopTimer();
const { returnKey,onClose } = app.story;
app.lastFocusKey = returnKey;
app.story = null;
app.sheetClosedAt = performance.now();
if (onClose) onClose();
}
function uiStoryClosed(app) {
return new Promise(function (resolve) {
if (app.story) app.story.onClose = resolve;
else resolve();
});
}
function uiStoryToast(app,beat) {
uiStoryMarkSeen(app,[beat.id]);
if (app.screen === 'grid') uiShowToast(app,{ text:toastText(beat),kind:'info' });
return true;
}
function uiStoryShow(app,beats) {
if (app.story) return false;
const unseen = unseenBeats(app.game.save.story,beats);
const flow = startFlow(unseen.filter((beat) => !beat.toast));
if (flow) {
uiStoryOpenFlow(app,flow);
return true;
}
return unseen.length > 0 ? uiStoryToast(app,unseen[0]) :false;
}
function uiStoryOnGrid(app) {
if (app.screen !== 'grid' || app.menuOpen) return false;
const progress = app.game.progress;
return uiStoryShow(app,beatsDue({ seen:app.game.save.story,level:progress.level,locksLeft:progress.left,ended:progress.ended }));
}
function uiStoryMarkEarnedToasts(app) {
const progress = app.game.progress;
uiStoryMarkSeen(app,earnedToastIds({ level:progress.level,locksLeft:progress.left }));
}
function uiStoryLabFinish(app,labId) {
return uiStoryShow(app,[labBeat(labId,'outro')]);
}
function uiStoryFinal(app) {
return uiStoryShow(app,[finalBeat()]);
}
function uiStoryGoOn(app,next) {
const story = app.story;
const now = performance.now();
app.story = { ...story,flow:next,lineStartedAt:now,revealed:false,guard:sheetGuardShow(now) };
if (!story.choice) uiStoryMarkSeen(app,[lineAt(next).beatId]);
uiStoryAnnounceLine(app.story);
}
function uiStoryNext(app) {
const story = app.story;
if (!story) return;
if (!uiStoryLineDone(story)) {
story.revealed = true;
return;
}
const next = advanceFlow(story.flow);
if (next) uiStoryGoOn(app,next);
else if (!story.choice) uiStoryClose(app);
}
function uiStorySettle(app,choiceId) {
const { resolve } = app.story.choice;
uiStoryClose(app);
resolve(choiceId);
}
function uiStoryEscapeChoice(app) {
const marked = app.story.choice.choices.find((choice) => choice.default === true);
if (marked) uiStorySettle(app,marked.id);
}
function uiStorySkip(app) {
if (!app.story) return;
if (app.story.choice) {
uiStoryEscapeChoice(app);
return;
}
uiStoryMarkSeen(app,pendingIds(app.story.flow));
uiStoryClose(app);
}
async function uiStoryChoice(app,sheet) {
const kit = await import('./story-choice.js');
return kit.uiChoiceRun(app,sheet);
}

export {
uiStoryShow,uiStoryClosed,uiStoryOnGrid,uiStoryMarkEarnedToasts,uiStoryLabFinish,uiStoryFinal,uiStoryNext,uiStorySkip,uiStoryChoice,uiStoryBegin,uiStorySettle,
};

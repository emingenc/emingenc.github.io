import { markBeatsSeen } from '../game/save.js';
import { advanceFlow,beatsDue,earnedToastIds,finalBeat,labBeat,lineAt,pendingIds,startFlow,toastText,unseenBeats } from '../game/story/story.js';
import { uiAnnounce } from './dom.js';
import { uiCommitSave } from './game-state.js';
import { uiShowToast } from './grid-toast.js';
import { uiWalkReleaseAll } from './grid-walk.js';
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
function uiStoryOpenFlow(app,flow) {
uiWalkReleaseAll(app);
app.game.walk.plan = null;
app.story = { flow,lineStartedAt:performance.now(),revealed:false,returnKey:app.lastFocusKey };
app.lastFocusKey = STORY_NEXT_KEY;
uiStoryMarkSeen(app,[lineAt(flow).beatId]);
uiStoryAnnounceLine(app.story);
}
function uiStoryClose(app) {
uiStoryStopTimer();
const { returnKey,onClose } = app.story;
app.lastFocusKey = returnKey;
app.story = null;
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
function uiStoryNext(app) {
const story = app.story;
if (!story) return;
if (!uiStoryLineDone(story)) {
story.revealed = true;
return;
}
const next = advanceFlow(story.flow);
if (!next) {
uiStoryClose(app);
return;
}
app.story = { ...story,flow:next,lineStartedAt:performance.now(),revealed:false };
uiStoryMarkSeen(app,[lineAt(next).beatId]);
uiStoryAnnounceLine(app.story);
}
function uiStorySkip(app) {
if (!app.story) return;
uiStoryMarkSeen(app,pendingIds(app.story.flow));
uiStoryClose(app);
}

export { uiStoryShow,uiStoryClosed,uiStoryOnGrid,uiStoryMarkEarnedToasts,uiStoryLabFinish,uiStoryFinal,uiStoryNext,uiStorySkip };

import { markBeatsSeen } from '../game/save.js';
import { advanceFlow,beatsDue,finalBeat,labBeat,lineAt,pendingIds,startFlow,unseenBeats } from '../game/story/story.js';
import { uiAnnounce } from './dom.js';
import { uiCommitSave } from './game-state.js';
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
app.lastFocusKey = app.story.returnKey;
app.story = null;
}
function uiStoryShow(app,beats) {
if (app.story) return false;
const flow = startFlow(unseenBeats(app.game.save.story,beats));
if (!flow) return false;
uiStoryOpenFlow(app,flow);
return true;
}
function uiStoryOnGrid(app) {
if (app.screen !== 'grid' || app.menuOpen) return false;
const progress = app.game.progress;
return uiStoryShow(app,beatsDue({ seen:app.game.save.story,level:progress.level,locksLeft:progress.left,ended:progress.ended }));
}
function uiStoryLabOpen(app,labId) {
return uiStoryShow(app,[labBeat(labId,'intro')]);
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

export { uiStoryShow,uiStoryOnGrid,uiStoryLabOpen,uiStoryLabFinish,uiStoryFinal,uiStoryNext,uiStorySkip };

import * as MACHINE_BEATS from '../game/story/machine-beats.js';
import { labBeat } from '../game/story/story.js';
import { uiStoryShow } from './story-dialogue.js';


function uiStoryLabOpen(app,labId) {
return uiStoryShow(app,[labBeat(labId,'intro',MACHINE_BEATS)]);
}
function uiStoryLabFinish(app,labId) {
return uiStoryShow(app,[labBeat(labId,'outro',MACHINE_BEATS)]);
}

export { uiStoryLabOpen,uiStoryLabFinish };

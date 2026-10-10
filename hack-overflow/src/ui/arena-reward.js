import { recordLab } from '../game/save.js';
import { uiCommitSave } from './game-state.js';


function uiArenaRecordWin(app,win) {
const { rig,levelId,stars } = win;
const recorded = recordLab(app.game.save,{ labId:rig.labId,levelId },stars);
uiCommitSave(app,recorded.save);
return { improved:recorded.improved,bestBefore:recorded.bestBefore };
}

export { uiArenaRecordWin };

import { hasLookup } from '../game/powers.js';
import { rigRankGain } from '../game/rig-reward.js';
import { withRank } from '../game/save-ext.js';
import { recordLab } from '../game/save.js';
import { uiCommitExt } from './ext-storage.js';
import { uiCommitSave } from './game-state.js';


function uiArenaRecordWin(app,win) {
const { rig,levelId,stars } = win;
const lookupBefore = hasLookup(app.game.save);
const recorded = recordLab(app.game.save,{ labId:rig.labId,levelId },stars);
const rankGain = rigRankGain(rig,recorded.bestBefore,stars);
uiCommitSave(app,recorded.save);
uiCommitExt(app,withRank(app.game.ext,rankGain));
return { improved:recorded.improved,bestBefore:recorded.bestBefore,rankGain,lookupNew:!lookupBefore && hasLookup(recorded.save) };
}

export { uiArenaRecordWin };

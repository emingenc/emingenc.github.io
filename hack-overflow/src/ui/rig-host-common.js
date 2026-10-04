import { levelFor, unlocksBetween } from '../game/progress.js';
import { rigXpGain } from '../game/rig-reward.js';
import { labBest, recordLab } from '../game/save.js';
import { uiCommitSave } from './game-state.js';
import { uiShowToast } from './grid-toast.js';
import { uiEnterGrid } from './screen-grid.js';
import { uiOpenLevelUp } from './screen-levelup.js';


function uiRigHostLeave(app,note,title) {
uiEnterGrid(app);
if (!note) return;
if (note.levelAfter > note.levelBefore) {
uiOpenLevelUp(app,{ before:note.levelBefore,after:note.levelAfter,unlocks:unlocksBetween(note.levelBefore,note.levelAfter),source:'lab' });
} else if (note.gained > 0) {
uiShowToast(app,{ text:title + ': +' + note.gained + ' XP',kind:'reward' });
}
}
function uiRigHostNoteXp(session,xpBefore,gained) {
const old = session.xpNote;
session.xpNote = {
gained:(old ? old.gained :0) + gained,
levelBefore:old ? old.levelBefore :levelFor(xpBefore),
levelAfter:levelFor(xpBefore + gained),
};
session.gained = gained;
}
function uiRigHostRecordWin(app,session,win) {
const { rig,levelId,stars } = win;
const save = app.game.save;
const gained = rigXpGain(rig,labBest(save,rig.labId,levelId),stars);
uiCommitSave(app,{ ...recordLab(save,{ labId:rig.labId,levelId },stars).save,xp:save.xp + gained });
uiRigHostNoteXp(session,save.xp,gained);
return gained;
}

export { uiRigHostLeave,uiRigHostRecordWin };

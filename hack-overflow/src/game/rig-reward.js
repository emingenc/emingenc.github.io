import { rigOf } from './rig-catalog.js';

const VARIANTS = 3;
function levelRecord(save,rig,levelId) {
const levels = Object.hasOwn(save.labs,rig.labId) ? save.labs[rig.labId] :{};
return Object.hasOwn(levels,levelId) ? levels[levelId] :null;
}
function rigXpGain(rig,bestBefore,stars) {
return Math.max(0,rig.xp[stars] - rig.xp[bestBefore]);
}
function rigRankGain(rig,bestBefore,stars) {
return Math.max(0,rig.rank[stars] - rig.rank[bestBefore]);
}
function rigUnlocked(save,rig,levelIndex) {
return levelIndex === 0 || levelRecord(save,rig,rig.levels[levelIndex - 1]) !== null;
}
function rigVariant(save,rig,levelIndex,tries) {
const record = levelRecord(save,rig,rig.levels[levelIndex]);
return ((record ? record.clears :0) + tries) % VARIANTS;
}

function rigMet(save,rigId) {
const rig = rigOf(rigId);
if (!rig) return false;
return (save.met ?? []).includes(rigId) || Object.hasOwn(save.labs ?? {},rig.labId);
}

export { rigOf,rigMet,rigXpGain,rigRankGain,rigUnlocked,rigVariant };

import { rigOf } from './rig-catalog.js';

const VARIANTS = 3;
function levelRecord(save,rig,levelId) {
const levels = Object.hasOwn(save.labs,rig.labId) ? save.labs[rig.labId] :{};
return Object.hasOwn(levels,levelId) ? levels[levelId] :null;
}
function rigXpGain(rig,bestBefore,stars) {
return Math.max(0,rig.xp[stars] - rig.xp[bestBefore]);
}
function rigRankPays(rig,bestBefore,stars) {
const table = rig.rank;
if (!table || stars <= 0) return { quest:null,pays:[] };
const reached = Object.keys(table.stars).map(Number).filter((star) => star > bestBefore && star <= stars);
return { quest:table.clear,pays:reached.map((star) => ({ source:table.stars[star],amount:table.star })) };
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

export { rigOf,rigMet,rigRankPays,rigXpGain,rigUnlocked,rigVariant };

import { LEVEL_XP,gateLevel } from '../progress.js';
import { PILL_MAX } from './quests.js';

const GATE_FAMILY = 'two-pointers';
const GATE_NAME = 'PINCER';
const PILL_SEP = ' . ';

function byLargest(first,second) {
return second - first;
}
function locksToOpen(targetLevel,xp,unsolvedLockXpList) {
if (!Object.hasOwn(LEVEL_XP,targetLevel)) return 0;
let missing = LEVEL_XP[targetLevel] - xp;
let count = 0;
for (const pay of [...unsolvedLockXpList].sort(byLargest)) {
if (missing <= 0) break;
missing -= pay;
count += 1;
}
return missing > 0 ? 0 :count;
}
function pillText(gateName,locks) {
if (!gateName || !Number.isInteger(locks) || locks <= 0) return null;
return gateName + ' opens in ' + locks + (locks === 1 ? ' lock' :' locks');
}

function gatePillText(view) {
const target = gateLevel(GATE_FAMILY);
if (!view.told || view.open || view.level >= target) return null;
return pillText(GATE_NAME,locksToOpen(target,view.xp,view.unsolved));
}
function joinPills(quest,gate) {
if (!quest || !gate) return quest || gate || null;
const both = quest + PILL_SEP + gate;
return both.length <= PILL_MAX ? both :quest;
}

export { GATE_FAMILY,locksToOpen,pillText,gatePillText,joinPills };

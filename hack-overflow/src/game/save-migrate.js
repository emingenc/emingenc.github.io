import { hasBeenSolved } from '../logic/profile.js';
import { xpForBreach } from './progress.js';
import { createSave, isRecord } from './save.js';

const FIRST_SEEN_STARS = 1;
const IMPORT_SOURCE = 'ONE-LINER';

function wasSolved(state) {
return isRecord(state) && typeof state.solvedSeq === 'number' && hasBeenSolved(state);
}
function importableKeys(profile,world) {
const problems = isRecord(profile) ? profile.problems :null;
if (!isRecord(problems)) return [];
return Object.keys(problems).filter((key) => Object.hasOwn(world.problems,key) && wasSolved(problems[key]));
}
function importedLocks(keys) {
return Object.fromEntries(keys.map((key) => [key,{ best:FIRST_SEEN_STARS,clears:1,carried:true }]));
}
function importedXp(keys,world) {
return keys.reduce((sum,key) => sum + xpForBreach(world.problems[key].difficulty,FIRST_SEEN_STARS),0);
}
function migrateV1(profile,world) {
const keys = importableKeys(profile,world);
const save = { ...createSave(world),locks:importedLocks(keys),xp:importedXp(keys,world) };
return { save,imported:keys.length };
}
function migrationNotice(imported) {
if (imported === 0) return null;
return 'Imported ' + imported + (imported === 1 ? ' lock' :' locks') + ' from ' + IMPORT_SOURCE + ' (' + FIRST_SEEN_STARS + '★ each; replay for more)';
}

export { migrateV1, migrationNotice };

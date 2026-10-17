import { hasCosmetic } from './ext/badge-ops.js';
import { EXT_FIELDS,clampInt } from './ext/index.js';

const PIPS = 10;
const FIND_MARKS = Object.freeze([
{ id:'bit-glint',at:4,name:'GLINT' },
{ id:'bit-halo',at:8,name:'HALO' },
]);

function lvPips(level) {
return clampInt(level,1,PIPS);
}
function findMarks(ext) {
const finds = EXT_FIELDS.find((field) => field.KEY === 'finds').repair(ext && ext.finds);
return FIND_MARKS.filter((mark) => finds.length >= mark.at).map((mark) => mark.id);
}
function cosmeticsDue(ext) {
return findMarks(ext).filter((id) => !hasCosmetic(ext || {},id));
}

export { FIND_MARKS,PIPS,cosmeticsDue,findMarks,lvPips };

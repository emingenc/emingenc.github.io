import { repairExtFields } from './ext/index.js';
import { BEATS } from './finale/contract.js';
import { RANK_AT,nextAt,rankHearts,rankLevel } from './rank.js';
import { RIG_CATALOG,rigStars } from './rig-catalog.js';
import { QUESTS,STAGE } from './quest/quests.js';

const STAT_TRIALS = Object.freeze(['volley','ambush','bridge','lane','flood-held']);
const STAT_FUSIONS = Object.freeze(['loop-pinch','mono-deque','window-map']);
const ACCESS_MARK = 'ACCESS';

function isRecord(value) {
return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function safely(read,fallback) {
try {
return read();
} catch (error) {
return fallback;
}
}
function row(id,label,counts) {
return { id,label,done:counts.done,total:counts.total,mark:counts.mark || null };
}
function roomsRow(save) {
const rooms = Object.values(RIG_CATALOG).filter((rig) => rig.rank);
const labs = isRecord(save) && isRecord(safely(() => save.labs,null)) ? save.labs :{};
const cleared = rooms.filter((rig) => safely(() => rigStars({ labs },rig.id).cleared > 0,false));
return row('rooms','ROOMS',{ done:cleared.length,total:rooms.length });
}
function trialsRow(paid) {
return row('trials','TRIALS',{ done:STAT_TRIALS.filter((id) => paid.includes(id)).length,total:STAT_TRIALS.length });
}
function questsRow(quests) {
const ids = Object.keys(QUESTS);
return row('quests','QUESTS',{ done:ids.filter((id) => quests[id] === STAGE.done).length,total:ids.length });
}
function fusionsRow(ext) {
const done = STAT_FUSIONS.filter((id) => ext.rank.paid.includes(id) || ext.finds.includes(id));
return row('fusions','FUSIONS',{ done:done.length,total:STAT_FUSIONS.length });
}
function rootRow(ext,ended) {
const beaten = BEATS.kernel.filter((id) => ext.beats.includes(id));
return row('root','ROOT',{ done:beaten.length,total:BEATS.kernel.length,mark:ended ? ACCESS_MARK :null });
}

function rankStats(ext,save) {
const fields = repairExtFields(isRecord(ext) ? ext :{});
const points = fields.rank.r;
const level = rankLevel(points);
const ended = isRecord(save) && safely(() => save.ended,false) === true;
const rows = [roomsRow(save),trialsRow(fields.rank.paid),questsRow(fields.quests),fusionsRow(fields),rootRow(fields,ended)];
return { level,r:points,floor:RANK_AT[level - 1],next:nextAt(points),hearts:rankHearts(level),rows,finds:fields.finds.length,badges:fields.badges.length,access:ended };
}

export { STAT_TRIALS,STAT_FUSIONS,rankStats };

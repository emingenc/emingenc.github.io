import { EXT_FIELDS,LIMITS,clampInt,isId } from './index.js';

const GHOST_COUNTS = ['offered','trusted','verified','trustedWrong'];

function repairOf(key) {
return EXT_FIELDS.find((field) => field.KEY === key).repair;
}
function listWith(list,id,cap) {
return list.includes(id) ? list :[...list,id].slice(-cap);
}
function hasListed(ext,key,id) {
return repairOf(key)(ext[key]).includes(id);
}
function withListed(ext,key,id) {
if (!isId(id) || hasListed(ext,key,id)) return ext;
return { ...ext,[key]:listWith(repairOf(key)(ext[key]),id,LIMITS[key]) };
}

function rankOf(ext) {
return repairOf('rank')(ext && ext.rank).r;
}
function addRank(ext,sourceId,amount) {
const now = repairOf('rank')(ext.rank);
const gain = clampInt(amount,0,LIMITS.rank);
if (!isId(sourceId) || now.paid.includes(sourceId) || gain === 0) return ext;
return { ...ext,rank:{ r:Math.min(LIMITS.rank,now.r + gain),paid:listWith(now.paid,sourceId,LIMITS.paid) } };
}
function hasFind(ext,id) {
return hasListed(ext,'finds',id);
}
function withFind(ext,id) {
return withListed(ext,'finds',id);
}
function hasBeat(ext,id) {
return hasListed(ext,'beats',id);
}
function withBeat(ext,id) {
return withListed(ext,'beats',id);
}
function hasMet(ext,id) {
return hasListed(ext,'met',id);
}
function withMet(ext,id) {
return withListed(ext,'met',id);
}
function questState(ext,id) {
const quests = repairOf('quests')(ext.quests);
return Object.hasOwn(quests,id) ? quests[id] :0;
}
function withQuest(ext,id,state) {
const quests = repairOf('quests')(ext.quests);
const full = !Object.hasOwn(quests,id) && Object.keys(quests).length >= LIMITS.quests;
if (!isId(id) || full) return ext;
return { ...ext,quests:{ ...quests,[id]:clampInt(state,0,LIMITS.state) } };
}
function withPin(ext,id) {
return { ...ext,pin:repairOf('pin')(id) };
}
function withGhost(ext,patch) {
return { ...ext,ghost:repairOf('ghost')({ ...repairOf('ghost')(ext.ghost),...patch }) };
}
function bumpGhost(ext,name) {
if (!GHOST_COUNTS.includes(name)) return ext;
return withGhost(ext,{ [name]:repairOf('ghost')(ext.ghost)[name] + 1 });
}
function withNpc(ext,patch) {
return { ...ext,npc:repairOf('npc')({ ...repairOf('npc')(ext.npc),...patch }) };
}

export { addRank,bumpGhost,hasBeat,hasFind,hasMet,questState,rankOf,withBeat,withFind,withGhost,withMet,withNpc,withPin,withQuest };

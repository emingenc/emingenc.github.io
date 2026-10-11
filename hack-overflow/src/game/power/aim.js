import { BOLT_RANGE,nearestAwakeFoe } from '../actors.js';
import { LIMITS } from '../ext/index.js';

const TAG_CAP = LIMITS.tags;
const FIXED_NAMES = ['s1','d1','d2'];

function reach(spot,pos) {
return Math.max(Math.abs(spot.col - pos.col),Math.abs(spot.row - pos.row));
}
function targetOf(kind,spot) {
return { kind,id:spot.id,col:spot.col,row:spot.row };
}
function aimTarget(actors,{ hero,tagged,spots = [] }) {
const foe = nearestAwakeFoe(actors.filter((actor) => !tagged.includes(actor.id)),hero);
if (foe) return targetOf('foe',foe);
const near = spots.filter((spot) => !tagged.includes(spot.id) && reach(spot,hero) <= BOLT_RANGE);
const spot = near.reduce((best,one) => (best && reach(best,hero) <= reach(one,hero) ? best :one),null);
return spot && targetOf('tile',spot);
}
function aimLabels(verb,name) {
return { text:'AIM . ' + verb + ' ' + name,aria:'Aim: ' + verb.toLowerCase() + ' ' + name };
}
function numbered(initial,taken) {
let number = 1;
while (taken.has(initial + number)) number += 1;
return initial + number;
}
function tagNames(tagged,actors) {
const names = {};
const isGeneric = (id) => !FIXED_NAMES.includes(id) && actors.some((actor) => actor.id === id);
const taken = new Set(tagged.filter((id) => !isGeneric(id)).map((id) => id.toUpperCase()));
for (const id of tagged) {
const actor = actors.find((one) => one.id === id);
names[id] = isGeneric(id) ? numbered((actor.kind ?? 'drone')[0].toUpperCase(),taken) :id.toUpperCase();
taken.add(names[id]);
}
return names;
}
function tagName(id,tagged,actors) {
return tagNames(tagged.includes(id) ? tagged :[...tagged,id],actors)[id];
}
function addTag(tagged,id) {
if (tagged.includes(id)) return { tags:tagged,kind:'already' };
return tagged.length >= TAG_CAP ? { tags:tagged,kind:'full' } :{ tags:[...tagged,id],kind:'tagged' };
}

export { TAG_CAP,addTag,aimLabels,aimTarget,tagName,tagNames,targetOf };

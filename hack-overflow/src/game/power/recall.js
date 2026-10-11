import { hitActor } from '../actors.js';

const RECALL_ONE_DMG = 1;
const RECALL_ALL_DMG = 3;

function recallOne(actors,id) {
const result = hitActor(actors,id,RECALL_ONE_DMG);
return { actors:result.actors,hit:result.actors !== actors,killed:result.killed };
}
function recallAll(actors,foeIds,tileIds = []) {
const result = { actors,visited:tileIds.length,hits:0,killed:[],skipped:[] };
for (const id of foeIds) {
const hit = hitActor(result.actors,id,RECALL_ALL_DMG);
if (hit.actors === result.actors) result.skipped.push(id);
else Object.assign(result,{ actors:hit.actors,visited:result.visited + 1,hits:result.hits + 1 });
if (hit.killed) result.killed.push(id);
}
return result;
}

export { RECALL_ONE_DMG,RECALL_ALL_DMG,recallOne,recallAll };

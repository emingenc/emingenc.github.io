import { buildContext } from '../judge/context.js';

function indexByKey(items) {
const byKey = new Map();
for (const item of items) byKey.set(item.key,item);
return byKey;
}
function createCatalog(data) {
const problemByKey = indexByKey(data.problems);
const familyByKey = indexByKey(data.families);
const contextByKey = new Map();
function contextFor(key) {
if (!contextByKey.has(key)) {
contextByKey.set(key,buildContext(problemByKey.get(key),data.budget));
}
return contextByKey.get(key);
}
return { data,problemByKey,familyByKey,contextFor };
}

export { createCatalog };

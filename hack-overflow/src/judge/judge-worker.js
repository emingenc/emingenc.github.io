import content from '../content.gen.js';
import { createCatalog } from '../logic/context.js';
import { act } from '../logic/run.js';

const catalog = createCatalog(content);

function respond(id,payload) {
self.postMessage({ id,...payload });
}
function runAct(run,optionId) {
return { ok:true,run:act(catalog,run,optionId) };
}
function runMaxTestCheck(key) {
const problem = catalog.problemByKey.get(key);
const context = catalog.contextFor(key);
return {
ok:true,
maxTestCheck:{
inputHashOk:context.maxHashes.inputHash === problem.max.input_hash,
expectedHashOk:context.maxHashes.expectedHash === problem.max.expected_hash,
},
};
}
self.onmessage = function (event) {
const { id,kind,run,optionId,key } = event.data;
try {
respond(id,kind === 'maxTestCheck' ? runMaxTestCheck(key) :runAct(run,optionId));
} catch (error) {
respond(id,{ ok:false,error:error && error.message ? error.message :String(error) });
}
};

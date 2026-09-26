import content from '../content.gen.js';
import { createCatalog } from '../logic/context.js';
import { act } from '../logic/run.js';

// Module Web Worker that runs the RUN/SUBMIT reducer, and the max-test
// data-integrity check (the same judge-context build HO_AUDIT.checks.maxTest
// runs), off the main thread. `act` and `catalog.contextFor` (and every
// judge/py module beneath them) are pure, DOM-free functions of their own
// arguments, so they run here unchanged and post back their result for the
// main thread to apply. Loaded from `src/ui/judge-client.js`; see
// `src/ui/dispatch-audit.js` and `src/ui/app.js` for the call sites.
// HO_AUDIT's other synchronous checks still call the judge directly on the
// main thread and never go through this worker.
const catalog = createCatalog(content);

function respond(id,payload) {
self.postMessage({ id,...payload });
}
function runAct(run,optionId) {
return { ok:true,run:act(catalog,run,optionId) };
}
// Builds the same judging context maxTest's main-thread version builds
// (`logic/audit.js`'s maxTestCheck): for a problem with a large max test,
// that build alone is the ~1s+ cost finding 5 flagged, so it must happen
// here rather than blocking the main thread a second time.
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

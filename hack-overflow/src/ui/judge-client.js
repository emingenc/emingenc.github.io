// Thin request/response wrapper around the judge Web Worker
// (`src/judge/judge-worker.js`). The worker is created lazily, on first
// use, so importing this module has no side effect: `node --test` never
// touches the DOM or `Worker`, and this file must stay import-safe there
// (see test/ui-tray-focus.test.js, which imports a sibling UI module).
import { NONE, PyTuple, PySlice, PyDict, PySet, PyRange, PyBuiltinFunction } from '../py/value-types.js';

let worker = null;
let nextId = 1;
const pending = new Map();
function rejectAllPending(message) {
for (const entry of pending.values()) entry.reject(new Error(message));
pending.clear();
}
function handleWorkerMessage(event) {
const { id,ok,error } = event.data;
const entry = pending.get(id);
if (!entry) return;
pending.delete(id);
if (ok) entry.resolve(event.data); else entry.reject(new Error(error || 'judge worker failed'));
}
function ensureWorker() {
if (worker) return worker;
worker = new Worker(new URL('../judge/judge-worker.js',import.meta.url),{ type:'module' });
worker.addEventListener('message',handleWorkerMessage);
// A worker-script error (e.g. blocked by CSP, or a load failure) leaves
// every in-flight request unresolved unless it is rejected here.
worker.addEventListener('error',function (event) {
rejectAllPending(event.message || 'judge worker error');
});
return worker;
}
// postMessage's structured clone keeps a Python value's fields but not its
// identity: `None` arrives as a copy of the NONE sentinel and a tuple, dict,
// set, range, slice or builtin as a plain object, so pyType (and pyRepr in
// the RUN/SUBMIT panels) would throw on it. These rebuild the originals.
function reviveMap(map,reviveEntry) {
return new Map(Array.from(map,([key,entry]) => [key,reviveEntry(entry)]));
}
function withFields(instance,fields) {
return Object.assign(instance,fields);
}
function revivePyObject(value) {
if (value.pyNone === true) return NONE;
if (Array.isArray(value.items)) return new PyTuple(value.items.map(revivePyValue));
if (value.items instanceof Map) return withFields(new PySet(),{ items:reviveMap(value.items,revivePyValue) });
if (value.entries instanceof Map) {
return withFields(new PyDict(),{ entries:reviveMap(value.entries,(entry) => ({ key:revivePyValue(entry.key),value:revivePyValue(entry.value) })) });
}
if ('length' in value) return withFields(Object.create(PyRange.prototype),value);
if ('step' in value) return withFields(Object.create(PySlice.prototype),value);
return withFields(Object.create(PyBuiltinFunction.prototype),value);
}
function revivePyValue(value) {
if (Array.isArray(value)) return value.map(revivePyValue);
return value !== null && typeof value === 'object' ? revivePyObject(value) :value;
}
function reviveShown(shown) {
return shown && { ...shown,input:revivePyValue(shown.input),expected:revivePyValue(shown.expected),got:revivePyValue(shown.got) };
}
function reviveRun(run) {
if (!run || !run.lock) return run;
const { lastRun,lastSubmit } = run.lock;
const revivedLastRun = lastRun && { ...lastRun,examples:lastRun.examples.map(reviveShown) };
return { ...run,lock:{ ...run.lock,lastRun:revivedLastRun,lastSubmit:reviveShown(lastSubmit) } };
}
/**
 * Runs `act(catalog,run,optionId)` on the judge worker and resolves with
 * the resulting run. Rejects if the worker cannot be created, fails to
 * load, or the reducer itself throws.
 * @param {object} run - the current run state (structured-cloneable)
 * @param {string} optionId - 'run' or 'submit'
 * @returns {Promise<object>} the next run state
 */
function judgeAct(run,optionId) {
const id = nextId;
nextId += 1;
return new Promise(function (resolve,reject) {
pending.set(id,{ resolve:function (data) { resolve(reviveRun(data.run)); },reject });
ensureWorker().postMessage({ id,kind:'act',run,optionId });
});
}
/**
 * Runs the max-test data-integrity check (`HO_AUDIT.checks.maxTest`'s
 * judge-context build) on the judge worker instead of the main thread: for a
 * problem with a large max test, building that context is itself the
 * multi-second cost finding 5 flagged, so it must happen off-thread rather
 * than blocking the click that triggers it (`app.js`'s
 * uiSyncJudgeDataBadge).
 * @param {string} key - the problem key to check
 * @returns {Promise<{inputHashOk:boolean, expectedHashOk:boolean}>}
 */
function checkMaxTestData(key) {
const id = nextId;
nextId += 1;
return new Promise(function (resolve,reject) {
pending.set(id,{ resolve:function (data) { resolve(data.maxTestCheck); },reject });
ensureWorker().postMessage({ id,kind:'maxTestCheck',key });
});
}
/**
 * Starts creating the judge worker ahead of the first RUN/SUBMIT, so that
 * one-time cost (spawning the worker and loading its module graph) lands
 * during page boot instead of blocking the player's first click. Call
 * once, from the browser entry point only (`src/ui/events.js`'s uiBoot):
 * never at this module's own load time, so importing it stays side-effect
 * free and safe under `node --test` (see the file header).
 * @returns {void}
 */
function warmJudgeWorker() {
ensureWorker();
}

export { judgeAct, checkMaxTestData, warmJudgeWorker };

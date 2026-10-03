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
worker.addEventListener('error',function (event) {
rejectAllPending(event.message || 'judge worker error');
});
return worker;
}
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
function judgeAct(run,optionId) {
const id = nextId;
nextId += 1;
return new Promise(function (resolve,reject) {
pending.set(id,{ resolve:function (data) { resolve(reviveRun(data.run)); },reject });
ensureWorker().postMessage({ id,kind:'act',run,optionId });
});
}
function checkMaxTestData(key) {
const id = nextId;
nextId += 1;
return new Promise(function (resolve,reject) {
pending.set(id,{ resolve:function (data) { resolve(data.maxTestCheck); },reject });
ensureWorker().postMessage({ id,kind:'maxTestCheck',key });
});
}
function warmJudgeWorker() {
ensureWorker();
}

export { judgeAct, checkMaxTestData, warmJudgeWorker };

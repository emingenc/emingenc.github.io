import { pyType, PyTuple, PyDict, PySet } from './value-types.js';
import { dictEntries, dictSet, setValues, setAdd } from './containers.js';

function copyList(value) {
return value.map(pyDeepCopy);
}
function copyTuple(value) {
return new PyTuple(value.items.map(pyDeepCopy));
}
function copyDict(value) {
const fresh = new PyDict();
for (const [key,item] of dictEntries(value)) dictSet(fresh,pyDeepCopy(key),pyDeepCopy(item));
return fresh;
}
function copySet(value) {
const fresh = new PySet();
for (const item of setValues(value)) setAdd(fresh,pyDeepCopy(item));
return fresh;
}
const DEEP_COPIERS = { list:copyList,tuple:copyTuple,dict:copyDict,set:copySet };
function pyDeepCopy(value) {
const copy = DEEP_COPIERS[pyType(value)];
return copy ? copy(value) :value;
}

export { pyDeepCopy };

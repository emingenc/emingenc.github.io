import { hashKey } from './value-types.js';
import { PyError } from './errors.js';
import { unhashableContextMessage } from './error-messages.js';

const DICT_KEY_CONTEXT = 'dict key';
const SET_ELEMENT_CONTEXT = 'set element';
/**
 * `hashKey`, wrapped so an unhashable value's error names the container it
 * was being placed into (CPython: `d[[1]] = 1` says "cannot use 'list' as
 * a dict key (unhashable type: 'list')", not the bare inner error).
 */
/** int/str/bool are always hashable, so this hot path skips the try/catch below entirely. */
function isAlwaysHashablePrimitive(value) {
const jsType = typeof value;
return jsType === 'number' || jsType === 'string' || jsType === 'boolean';
}
function hashKeyFor(value,contextLabel) {
if (isAlwaysHashablePrimitive(value)) return hashKey(value);
try {
return hashKey(value);
} catch (error) {
if (error instanceof PyError && error.pyClass === 'TypeError') {
throw new PyError('TypeError',unhashableContextMessage(value,contextLabel,error.pyMessage));
}
throw error;
}
}
function dictLookup(dict,key) {
const found = dict.entries.get(hashKeyFor(key,DICT_KEY_CONTEXT));
return found ? { found:true,value:found.value } :{ found:false,value:undefined };
}
function dictSet(dict,key,value) {
dict.entries.set(hashKeyFor(key,DICT_KEY_CONTEXT),{ key,value });
}
function dictHas(dict,key) {
return dict.entries.has(hashKeyFor(key,DICT_KEY_CONTEXT));
}
function dictDelete(dict,key) {
dict.entries.delete(hashKeyFor(key,DICT_KEY_CONTEXT));
}
function dictEntries(dict) {
return Array.from(dict.entries.values()).map((entry) => [entry.key,entry.value]);
}
function setAdd(set,value) {
set.items.set(hashKeyFor(value,SET_ELEMENT_CONTEXT),value);
}
function setHas(set,value) {
return set.items.has(hashKeyFor(value,SET_ELEMENT_CONTEXT));
}
function setRemove(set,value) {
const key = hashKeyFor(value,SET_ELEMENT_CONTEXT);
const had = set.items.has(key);
set.items.delete(key);
return had;
}
function setValues(set) {
return Array.from(set.items.values());
}

export { dictLookup, dictSet, dictHas, dictDelete, dictEntries, setAdd, setHas, setRemove, setValues };

import { PyError } from './errors.js';

const NONE = Object.freeze({ pyNone:true });
class PyTuple {
constructor(items) {
this.items = items;
}
}
function assignBounds(instance,bounds) {
instance.start = bounds.start;
instance.stop = bounds.stop;
instance.step = bounds.step;
}
class PySlice {
constructor(start,stop,step) {
assignBounds(this,{ start,stop,step });
}
}
class PyDict {
constructor() {
this.entries = new Map();
}
}
class PySet {
constructor() {
this.items = new Map();
}
}
class PyBuiltinFunction {
constructor(name) {
this.name = name;
}
}
function pyRangeLength(start,stop,step) {
if (step > 0) return stop > start ? Math.ceil((stop - start) / step) :0;
return stop < start ? Math.ceil((start - stop) / -step) :0;
}
class PyRange {
constructor(start,stop,step) {
assignBounds(this,{ start,stop,step });
this.length = pyRangeLength(start,stop,step);
}
}
function pyRangeItem(range,at) {
return range.start + at * range.step;
}
function pyRangeValues(range) {
const values = [];
for (let at = 0; at < range.length; at += 1) values.push(pyRangeItem(range,at));
return values;
}
const TYPE_TESTS = [
['NoneType',(value) => value === NONE],
['bool',(value) => typeof value === 'boolean'],
['int',(value) => typeof value === 'number'],
['str',(value) => typeof value === 'string'],
['list',(value) => Array.isArray(value)],
['tuple',(value) => value instanceof PyTuple],
['dict',(value) => value instanceof PyDict],
['set',(value) => value instanceof PySet],
['slice',(value) => value instanceof PySlice],
['range',(value) => value instanceof PyRange],
['builtin_function_or_method',(value) => value instanceof PyBuiltinFunction],
];
const PRIMITIVE_TYPE_NAMES = { boolean:'bool',number:'int',string:'str' };
function pyType(value) {
const primitive = PRIMITIVE_TYPE_NAMES[typeof value];
if (primitive) return primitive;
const found = TYPE_TESTS.find(([,test]) => test(value));
if (!found) throw new PyError('TypeError');
return found[0];
}
const TRUTHY_CHECKS = {
NoneType:() => false,
bool:(value) => value,
int:(value) => value !== 0,
str:(value) => value.length > 0,
list:(value) => value.length > 0,
tuple:(value) => value.items.length > 0,
dict:(value) => value.entries.size > 0,
set:(value) => value.items.size > 0,
slice:() => true,
range:(value) => value.length > 0,
builtin_function_or_method:() => true,
};
function pyTruthy(value) {
return TRUTHY_CHECKS[pyType(value)](value);
}
const HASH_BUILDERS = {
NoneType:() => 'N',
bool:(value) => (value ? 1 : 0),
int:(value) => value,
str:(value) => `s:${value}`,
tuple:(value) => `t:${value.items.map(hashKey).join(',')}`,
slice:(value) => `l:${hashKey(value.start)}:${hashKey(value.stop)}:${hashKey(value.step)}`,
builtin_function_or_method:(value) => `b:${value.name}`,
};
function hashKey(value) {
const jsType = typeof value;
if (jsType === 'number') return value;
if (jsType === 'boolean') return value ? 1 :0;
const type = pyType(value);
const build = HASH_BUILDERS[type];
if (!build) throw new PyError('TypeError',`unhashable type: '${type}'`);
return build(value);
}

export { NONE, PyTuple, PySlice, PyDict, PySet, PyRange, PyBuiltinFunction, pyRangeItem, pyRangeValues, pyType, pyTruthy, hashKey };

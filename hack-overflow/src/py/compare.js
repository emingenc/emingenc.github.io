import { pyType, PyDict } from './value-types.js';
import { dictLookup, dictEntries, dictHas, setHas, setValues } from './containers.js';
import { PyError } from './errors.js';
import { compareMessage, containsMessage, stringContainsMessage } from './error-messages.js';

function numeric(type) {
return type === 'int' || type === 'bool';
}
function listEquals(left,right) {
return left.length === right.length && left.every((item,index) => pyEquals(item,right[index]));
}
function tupleEquals(left,right) {
return listEquals(left.items,right.items);
}
function sameEntry(dict,key,value) {
const found = dictLookup(dict,key);
return found.found && pyEquals(value,found.value);
}
function dictEquals(left,right) {
if (left.entries.size !== right.entries.size) return false;
return dictEntries(left).every(([key,value]) => sameEntry(right,key,value));
}
function setEquals(left,right) {
return left.items.size === right.items.size && setValues(left).every((item) => setHas(right,item));
}
function sliceEquals(left,right) {
return pyEquals(left.start,right.start) && pyEquals(left.stop,right.stop) && pyEquals(left.step,right.step);
}
const EQUALITY_BY_TYPE = { list:listEquals,tuple:tupleEquals,dict:dictEquals,set:setEquals,slice:sliceEquals };
function pyEquals(left,right) {
const leftType = pyType(left);
const rightType = pyType(right);
if (numeric(leftType) && numeric(rightType)) return Number(left) === Number(right);
if (leftType !== rightType) return false;
const compare = EQUALITY_BY_TYPE[leftType];
return compare ? compare(left,right) :left === right;
}
const NUMERIC_OPS = {
'<':(left,right) => left < right,'>':(left,right) => left > right,
'<=':(left,right) => left <= right,'>=':(left,right) => left >= right,
};
const SIGN_OPS = {
'<':(sign) => sign < 0,'>':(sign) => sign > 0,'<=':(sign) => sign <= 0,'>=':(sign) => sign >= 0,
};
function isSubset(left,right) {
return setValues(left).every((item) => setHas(right,item));
}
const SET_OPS = {
'<=':(left,right) => isSubset(left,right),
'<':(left,right) => isSubset(left,right) && left.items.size !== right.items.size,
'>=':(left,right) => isSubset(right,left),
'>':(left,right) => isSubset(right,left) && left.items.size !== right.items.size,
};
function elementSign(left,right) {
if (pyEquals(left,right)) return 0;
return pyOrder('<',left,right) ? -1 :1;
}
function lexCompare(leftItems,rightItems) {
const shortest = Math.min(leftItems.length,rightItems.length);
for (let index = 0; index < shortest; index += 1) {
const sign = elementSign(leftItems[index],rightItems[index]);
if (sign !== 0) return sign;
}
return Math.sign(leftItems.length - rightItems.length);
}
function numericOrder(op,left,right) {
return NUMERIC_OPS[op](Number(left),Number(right));
}
function strOrder(op,left,right) {
return NUMERIC_OPS[op](left,right);
}
function listOrder(op,left,right) {
return SIGN_OPS[op](lexCompare(left,right));
}
function tupleOrder(op,left,right) {
return SIGN_OPS[op](lexCompare(left.items,right.items));
}
function setOrder(op,left,right) {
return SET_OPS[op](left,right);
}
const SAME_TYPE_ORDERS = { str:strOrder,list:listOrder,tuple:tupleOrder,set:setOrder };
function orderFamily(leftType,rightType) {
if (numeric(leftType) && numeric(rightType)) return numericOrder;
return leftType === rightType ? SAME_TYPE_ORDERS[leftType] :undefined;
}
function pyOrder(op,left,right) {
const family = orderFamily(pyType(left),pyType(right));
if (!family) throw new PyError('TypeError',compareMessage(op,left,right));
return family(op,left,right);
}
function containsInStr(item,text) {
if (pyType(item) !== 'str') throw new PyError('TypeError',stringContainsMessage(item));
return text.includes(item);
}
function setContains(item,container) {
if (pyType(item) !== 'set') return setHas(container,item);
return setValues(container).some((element) => pyEquals(item,element));
}
function withinRangeBounds(value,range) {
return range.step > 0
? value >= range.start && value < range.stop
:value <= range.start && value > range.stop;
}
function rangeContains(item,range) {
const type = pyType(item);
if (type !== 'int' && type !== 'bool') return false;
const value = Number(item);
return withinRangeBounds(value,range) && (value - range.start) % range.step === 0;
}
function numericEquals(item,element) {
const type = typeof element;
return (type === 'number' || type === 'boolean') && Number(item) === Number(element);
}
function sequenceContains(item,items) {
if (typeof item === 'number' || typeof item === 'boolean') {
for (let i = 0; i < items.length; i += 1) if (numericEquals(item,items[i])) return true;
return false;
}
return items.some((element) => pyEquals(item,element));
}
const CONTAINS_TESTS = {
list:(item,container) => sequenceContains(item,container),
tuple:(item,container) => sequenceContains(item,container.items),
str:containsInStr,
dict:(item,container) => dictHas(container,item),
set:setContains,
range:rangeContains,
};
function pyContains(item,container) {
if (container instanceof PyDict) return dictHas(container,item);
const test = CONTAINS_TESTS[pyType(container)];
if (!test) throw new PyError('TypeError',containsMessage(container));
return test(item,container);
}

export { pyEquals, pyOrder, pyContains };

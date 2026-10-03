import { pyType, PyTuple } from './value-types.js';
import { PyError } from './errors.js';
import { binOpTypeMessage, unaryMinusMessage, unaryPlusMessage } from './error-messages.js';

const MAX_INT_MAGNITUDE = Number.MAX_SAFE_INTEGER;
const ZERO_DIVISION_MESSAGE = 'division by zero';
const INTERNAL_ERROR_CLASS = 'InternalError';

function isNumericType(type) {
return type === 'int' || type === 'bool';
}
function guardIntMagnitude(value) {
if (typeof value === 'number' && Math.abs(value) > MAX_INT_MAGNITUDE) {
throw new PyError(INTERNAL_ERROR_CLASS,'integer too large for this judge');
}
return value;
}
function requireNumericPair(op,left,right) {
if (!isNumericType(pyType(left)) || !isNumericType(pyType(right))) {
throw new PyError('TypeError',binOpTypeMessage(op,left,right));
}
}
function requireNonZeroDivisor(right) {
if (Number(right) === 0) throw new PyError('ZeroDivisionError',ZERO_DIVISION_MESSAGE);
}
function repeatList(list,count) {
const result = [];
for (let i = 0; i < count; i += 1) result.push(...list);
return result;
}
function repeatCount(value) {
return isNumericType(pyType(value)) ? Number(value) :null;
}
function addValues(left,right) {
const lt = pyType(left);
const rt = pyType(right);
if (isNumericType(lt) && isNumericType(rt)) return guardIntMagnitude(Number(left) + Number(right));
if (lt === 'str' && rt === 'str') return left + right;
if (lt === 'list' && rt === 'list') return [...left,...right];
if (lt === 'tuple' && rt === 'tuple') return new PyTuple([...left.items,...right.items]);
throw new PyError('TypeError',binOpTypeMessage('+',left,right));
}
function subValues(left,right) {
requireNumericPair('-',left,right);
return guardIntMagnitude(Number(left) - Number(right));
}
function sequenceAndCount(sequenceType,left,right) {
if (pyType(left) === sequenceType && repeatCount(right) !== null) return [left,repeatCount(right)];
if (pyType(right) === sequenceType && repeatCount(left) !== null) return [right,repeatCount(left)];
return null;
}
function mulValues(left,right) {
if (isNumericType(pyType(left)) && isNumericType(pyType(right))) return guardIntMagnitude(Number(left) * Number(right));
const list = sequenceAndCount('list',left,right);
if (list) return repeatList(list[0],list[1]);
const tuple = sequenceAndCount('tuple',left,right);
if (tuple) return new PyTuple(repeatList(tuple[0].items,tuple[1]));
const str = sequenceAndCount('str',left,right);
if (str) return str[1] > 0 ? str[0].repeat(str[1]) :'';
throw new PyError('TypeError',binOpTypeMessage('*',left,right));
}
function repeatResultSize(left,right) {
const list = sequenceAndCount('list',left,right);
if (list) return list[0].length * Math.max(list[1],0);
const tuple = sequenceAndCount('tuple',left,right);
if (tuple) return tuple[0].items.length * Math.max(tuple[1],0);
const str = sequenceAndCount('str',left,right);
if (str) return str[0].length * Math.max(str[1],0);
return null;
}
function floorDivValues(left,right) {
requireNumericPair('//',left,right);
requireNonZeroDivisor(right);
return guardIntMagnitude(Math.floor(Number(left) / Number(right)));
}
function modValues(left,right) {
requireNumericPair('%',left,right);
requireNonZeroDivisor(right);
const leftNum = Number(left);
const rightNum = Number(right);
return guardIntMagnitude(leftNum - Math.floor(leftNum / rightNum) * rightNum);
}
const BIN_OPS = { '+':addValues,'-':subValues,'*':mulValues,'//':floorDivValues,'%':modValues };
function applyBinOp(op,left,right) {
return BIN_OPS[op](left,right);
}
function negateValue(value) {
if (!isNumericType(pyType(value))) throw new PyError('TypeError',unaryMinusMessage(value));
return guardIntMagnitude(-Number(value));
}
function posateValue(value) {
if (!isNumericType(pyType(value))) throw new PyError('TypeError',unaryPlusMessage(value));
return guardIntMagnitude(Number(value));
}

export {
applyBinOp, negateValue, posateValue, guardIntMagnitude, isNumericType, INTERNAL_ERROR_CLASS,
repeatResultSize,
};

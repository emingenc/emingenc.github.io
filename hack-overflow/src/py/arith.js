import { pyType, PyTuple } from './value-types.js';
import { PyError } from './errors.js';
import { binOpTypeMessage, unaryMinusMessage, unaryPlusMessage } from './error-messages.js';

const MAX_INT_MAGNITUDE = Number.MAX_SAFE_INTEGER;
// CPython 3.14.6's actual str(ZeroDivisionError) for both int `//` and `%` is
// 'division by zero' (verified against a live interpreter), not the older
// 'integer division or modulo by zero' wording from Python 2.
const ZERO_DIVISION_MESSAGE = 'division by zero';
const INTERNAL_ERROR_CLASS = 'InternalError';

/** True for the two numeric chip types (`int`, `bool`); both behave as Python ints in arithmetic. */
function isNumericType(type) {
return type === 'int' || type === 'bool';
}
/** Raises the judge's overflow guard when an int result would leave the safe-integer range. */
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
/**
 * Python's `*` sequence-repeat is commutative in operand order: `seq * n`
 * and `n * seq` both repeat, because `int.__mul__(seq)` returns
 * `NotImplemented` and CPython falls back to `seq.__rmul__(int)` (verified
 * live: `3 * (1, 2)` and `(1, 2) * 3` both give `(1, 2, 1, 2, 1, 2)`, and
 * likewise for `list`/`str`). Picks whichever operand is the named sequence
 * type and the other the repeat count, or `null` if this pairing doesn't match.
 */
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
/**
 * The length a `left * right` (or `right * left`) sequence repeat would build, mirroring
 * `pycost.py`'s `_repeat_size` - `null` when neither side is a repeatable sequence paired with an
 * int count, in which case `*` is plain numeric multiplication (or a `TypeError`).
 */
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
/** Applies a Python binary operator (`+ - * // %`) with floor-division/modulo and overflow-guard semantics. */
function applyBinOp(op,left,right) {
return BIN_OPS[op](left,right);
}
/** Applies unary `-` with the same numeric and overflow rules as binary arithmetic. */
function negateValue(value) {
if (!isNumericType(pyType(value))) throw new PyError('TypeError',unaryMinusMessage(value));
return guardIntMagnitude(-Number(value));
}
/** Applies unary `+`: numeric only, always yields a plain `int` (`+True` is `1`, not `True`). */
function posateValue(value) {
if (!isNumericType(pyType(value))) throw new PyError('TypeError',unaryPlusMessage(value));
return guardIntMagnitude(Number(value));
}

export {
applyBinOp, negateValue, posateValue, guardIntMagnitude, isNumericType, INTERNAL_ERROR_CLASS,
repeatResultSize,
};

import { PySet, PyRange, pyType } from './value-types.js';
import { pySize } from './size.js';
import { pyOrder } from './compare.js';
import { pyRepr } from './repr.js';
import { iterableItems } from './run-iterable.js';
import { applyBinOp, isNumericType } from './arith.js';
import { PyError } from './errors.js';
import {
rangeArgTypeMessage, RANGE_TOO_FEW_ARGS_MESSAGE, rangeTooManyArgsMessage, setTooManyArgsMessage,
intTooManyArgsMessage, intArgTypeMessage, absArgCountMessage, absArgTypeMessage,
SUM_TOO_FEW_ARGS_MESSAGE, sumTooManyArgsMessage, extremeTooFewArgsMessage, extremeEmptyMessage,
extremeUnexpectedKeywordMessage,
} from './error-messages.js';

class PyEnumerate {
constructor(target) {
this.target = target;
}
}
function callLen(positional) {
return pySize(positional[0]);
}
function requireRangeInt(value) {
const type = pyType(value);
if (type !== 'int' && type !== 'bool') throw new PyError('TypeError',rangeArgTypeMessage(value));
return Number(value);
}
function rangeArgsFromThree(positional) {
const step = requireRangeInt(positional[2]);
if (step === 0) throw new PyError('ValueError','range() arg 3 must not be zero');
return { start:requireRangeInt(positional[0]),stop:requireRangeInt(positional[1]),step };
}
const RANGE_MAX_ARGS = 3;
function rangeArgs(positional) {
if (positional.length === 0) throw new PyError('TypeError',RANGE_TOO_FEW_ARGS_MESSAGE);
if (positional.length === 1) return { start:0,stop:requireRangeInt(positional[0]),step:1 };
if (positional.length === 2) return { start:requireRangeInt(positional[0]),stop:requireRangeInt(positional[1]),step:1 };
if (positional.length === RANGE_MAX_ARGS) return rangeArgsFromThree(positional);
throw new PyError('TypeError',rangeTooManyArgsMessage(positional.length));
}
function callRange(positional) {
const { start,stop,step } = rangeArgs(positional);
return new PyRange(start,stop,step);
}
function callEnumerate(positional) {
return new PyEnumerate(positional[0]);
}
function callSet(positional) {
if (positional.length > 0) throw new PyError('TypeError',setTooManyArgsMessage(positional.length));
return new PySet();
}
function pickExtreme(items,better,name) {
if (items.length === 0) throw new PyError('ValueError',extremeEmptyMessage(name));
let current = items[0];
for (let index = 1; index < items.length; index += 1) {
if (better(items[index],current)) current = items[index];
}
return current;
}
function extremeArgs(positional) {
return positional.length === 1 ? iterableItems(positional[0]) :positional;
}
/**
 * CPython's real `min`/`max` check the positional-argument count before
 * ever looking at keywords, so a keyword-only call (`min(x=1)`) still
 * reports "expected at least 1 argument, got 0" - never a keyword error.
 */
function requireExtremeArgs(name,positional,keyword) {
if (positional.length === 0) throw new PyError('TypeError',extremeTooFewArgsMessage(name));
if (keyword.length > 0) throw new PyError('TypeError',extremeUnexpectedKeywordMessage(name,keyword[0].name));
}
/**
 * Shared implementation of `min()`/`max()`: same argument shapes (one
 * iterable, or two-or-more positional candidates), differing only in the
 * comparator and the builtin's own name (used in its error wording).
 * @param {{better: Function, name: string, positional: Array<*>, keyword: Array<*>}} call
 */
function callExtreme({ better,name,positional,keyword }) {
requireExtremeArgs(name,positional,keyword);
return pickExtreme(extremeArgs(positional),better,name);
}
function pyLess(left,right) {
return typeof left === 'number' && typeof right === 'number' ? left < right :pyOrder('<',left,right);
}
function pyGreater(left,right) {
return typeof left === 'number' && typeof right === 'number' ? left > right :pyOrder('>',left,right);
}
function callMin(positional,keyword) {
return callExtreme({ better:pyLess,name:'min',positional,keyword });
}
function callMax(positional,keyword) {
return callExtreme({ better:pyGreater,name:'max',positional,keyword });
}
const INT_LITERAL_RE = /^[+-]?[0-9]+$/;
function invalidIntLiteral(original) {
return new PyError('ValueError',`invalid literal for int() with base 10: ${pyRepr(original)}`);
}
function intFromString(text) {
const trimmed = text.trim();
if (!INT_LITERAL_RE.test(trimmed)) throw invalidIntLiteral(text);
return Number(trimmed);
}
function callInt(positional) {
if (positional.length === 0) return 0;
if (positional.length > 1) throw new PyError('TypeError',intTooManyArgsMessage(positional.length));
const [value] = positional;
const type = pyType(value);
if (isNumericType(type)) return Number(value);
if (type === 'str') return intFromString(value);
throw new PyError('TypeError',intArgTypeMessage(value));
}
function callAbs(positional) {
if (positional.length !== 1) throw new PyError('TypeError',absArgCountMessage(positional.length));
const [value] = positional;
if (!isNumericType(pyType(value))) throw new PyError('TypeError',absArgTypeMessage(value));
return Math.abs(Number(value));
}
function sumStart(positional) {
return positional.length > 1 ? positional[1] :0;
}
function callSum(positional) {
if (positional.length < 1) throw new PyError('TypeError',SUM_TOO_FEW_ARGS_MESSAGE);
if (positional.length > 2) throw new PyError('TypeError',sumTooManyArgsMessage(positional.length));
const items = iterableItems(positional[0]);
return items.reduce((total,item) => applyBinOp('+',total,item),sumStart(positional));
}
const BUILTINS = {
len:callLen,range:callRange,enumerate:callEnumerate,set:callSet,min:callMin,max:callMax,
int:callInt,sum:callSum,abs:callAbs,
};

export { BUILTINS, PyEnumerate };

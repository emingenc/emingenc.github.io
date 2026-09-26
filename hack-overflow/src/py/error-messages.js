import { pyType } from './value-types.js';

/**
 * CPython 3.14's exact `str(exc)` wording for every runtime error the
 * interpreter can raise. Every function here is a pure string formatter -
 * verified against a live `python3` 3.14.6 interpreter (never typed from
 * memory) - so a throw site only needs to supply the values involved.
 */

const CONCAT_ONLY_TYPES = new Set(['str', 'list', 'tuple']);
function concatMismatchMessage(leftType, rightType) {
  return `can only concatenate ${leftType} (not "${rightType}") to ${leftType}`;
}
const NUMERIC_TYPES = new Set(['int', 'bool']);
const REPEATABLE_TYPES = new Set(['str', 'list', 'tuple']);
function sequenceRepeatMismatch(leftType, rightType) {
  if (REPEATABLE_TYPES.has(leftType) && !NUMERIC_TYPES.has(rightType)) return rightType;
  if (REPEATABLE_TYPES.has(rightType) && !NUMERIC_TYPES.has(leftType)) return leftType;
  return null;
}
function unsupportedOperandMessage(op, leftType, rightType) {
  return `unsupported operand type(s) for ${op}: '${leftType}' and '${rightType}'`;
}
/** `1 + 'a'`, `[1] * 'a'`, `{} - 1`: CPython's binary-operator type mismatch. */
function binOpTypeMessage(op, left, right) {
  const leftType = pyType(left);
  const rightType = pyType(right);
  if (op === '+' && CONCAT_ONLY_TYPES.has(leftType)) return concatMismatchMessage(leftType, rightType);
  const nonIntType = op === '*' ? sequenceRepeatMismatch(leftType, rightType) : null;
  if (nonIntType !== null) return `can't multiply sequence by non-int of type '${nonIntType}'`;
  return unsupportedOperandMessage(op, leftType, rightType);
}
/** `-'a'`: CPython's unary-minus type mismatch. */
function unaryMinusMessage(value) {
  return `bad operand type for unary -: '${pyType(value)}'`;
}
/** `+'a'`: CPython's unary-plus type mismatch. */
function unaryPlusMessage(value) {
  return `bad operand type for unary +: '${pyType(value)}'`;
}
/** `1 < 'a'`: CPython's ordering-comparison type mismatch. */
function compareMessage(op, left, right) {
  return `'${op}' not supported between instances of '${pyType(left)}' and '${pyType(right)}'`;
}
/** `5 in 3`: the right operand of `in`/`not in` supports neither. */
function containsMessage(container) {
  return `argument of type '${pyType(container)}' is not a container or iterable`;
}
/** `1 in 'abc'`: a string's `in` requires a string left operand. */
function stringContainsMessage(item) {
  return `'in <string>' requires string as left operand, not ${pyType(item)}`;
}
/** `for x in 1`, `sum(1)`, `list(1)`: the value has no iterator. */
function notIterableMessage(value) {
  return `'${pyType(value)}' object is not iterable`;
}
/**
 * `x = *1, 2` or `f(a, *1)`: CPython's own wording for a `*`-unpack of a
 * non-iterable is not `notIterableMessage`'s `'int' object is not iterable`
 * - it's this unquoted-type form (verified live: `max(1, *5)`, `x = *5, 6`).
 */
function starredNotIterableMessage(value) {
  return `Value after * must be an iterable, not ${pyType(value)}`;
}
/** `(1)[0]`: the value cannot be subscripted at all. */
function notSubscriptableMessage(value) {
  return `'${pyType(value)}' object is not subscriptable`;
}
/** `len(1)`: the value has no `__len__`. */
function noLenMessage(value) {
  return `object of type '${pyType(value)}' has no len()`;
}
/** `x = 1; x()`: the value is not callable. */
function notCallableMessage(value) {
  return `'${pyType(value)}' object is not callable`;
}
/** `x.foo`: the value's type has no attribute or method of that name. */
function noAttributeMessage(value, name) {
  return `'${pyType(value)}' object has no attribute '${name}'`;
}
/** `x = 1; x[0] = 1`: the value's type does not support item assignment. */
function itemAssignmentMessage(value) {
  return `'${pyType(value)}' object does not support item assignment`;
}
const INDEX_TYPE_MESSAGES = {
  list: (indexType) => `list indices must be integers or slices, not ${indexType}`,
  tuple: (indexType) => `tuple indices must be integers or slices, not ${indexType}`,
  range: (indexType) => `range indices must be integers or slices, not ${indexType}`,
  str: (indexType) => `string indices must be integers, not '${indexType}'`,
};
/** `x[1.0]`/`x['a']`: a non-integer index, worded per container kind. */
function indexTypeMessage(kind, indexValue) {
  return INDEX_TYPE_MESSAGES[kind](pyType(indexValue));
}
const INDEX_RANGE_MESSAGES = {
  list: 'list index out of range',
  tuple: 'tuple index out of range',
  str: 'string index out of range',
  range: 'range object index out of range',
};
const LIST_ASSIGN_RANGE_MESSAGE = 'list assignment index out of range';
/** `x[5]` past the end, worded per container kind (assignment has its own wording, list-only). */
function indexRangeMessage(kind, { isAssignment = false } = {}) {
  return isAssignment ? LIST_ASSIGN_RANGE_MESSAGE : INDEX_RANGE_MESSAGES[kind];
}
const SLICE_INDEX_TYPE_MESSAGE = 'slice indices must be integers or None or have an __index__ method';
const SLICE_STEP_ZERO_MESSAGE = 'slice step cannot be zero';
/** `d[[1]]`, `s.add([1])`: an unhashable value used as a dict key or set element. */
function unhashableContextMessage(value, contextLabel, innerMessage) {
  return `cannot use '${pyType(value)}' as a ${contextLabel} (${innerMessage})`;
}
function tooManyValuesMessage(expected, got) {
  return `too many values to unpack (expected ${expected}, got ${got})`;
}
function notEnoughValuesMessage(expected, got) {
  return `not enough values to unpack (expected ${expected}, got ${got})`;
}
/** `a, b = [1, 2, 3]`: a tuple/list-unpack target count mismatch. */
function unpackMismatchMessage(expected, got) {
  return got > expected ? tooManyValuesMessage(expected, got) : notEnoughValuesMessage(expected, got);
}
/** `a, *b, c = [1]`: a starred tuple-unpack given fewer items than its fixed (non-starred) targets. */
function notEnoughValuesForStarredMessage(fixedCount, got) {
  return `not enough values to unpack (expected at least ${fixedCount}, got ${got})`;
}
/** `x[0:5:2] = [9]`: an extended-slice assignment size mismatch. */
function extendedSliceSizeMessage(gotSize, sliceSize) {
  return `attempt to assign sequence of size ${gotSize} to extended slice of size ${sliceSize}`;
}
/** `print(qqq)`: a name never bound anywhere in this function. */
function nameErrorMessage(name) {
  return `name '${name}' is not defined`;
}
/** A name this function assigns somewhere, read before that assignment ran. */
function unboundLocalMessage(name) {
  return `cannot access local variable '${name}' where it is not associated with a value`;
}
/**
 * The same not-yet-assigned local, but read from inside the op-cost model's
 * chained-comparison thunk (a nested closure CPython's compiler generates to
 * evaluate each operand of an `in`/`not in` comparison chain of 2+ operators):
 * the closure captures the name as a free variable, so CPython reports the
 * closure-style message and `NameError` instead of `UnboundLocalError`.
 */
function freeVariableMessage(name) {
  return `cannot access free variable '${name}' where it is not associated with a value in enclosing scope`;
}
/** `range('a')`: a `range()` argument that is not an integer. */
function rangeArgTypeMessage(value) {
  return `'${pyType(value)}' object cannot be interpreted as an integer`;
}
const RANGE_TOO_FEW_ARGS_MESSAGE = 'range expected at least 1 argument, got 0';
function rangeTooManyArgsMessage(count) {
  return `range expected at most 3 arguments, got ${count}`;
}
function setTooManyArgsMessage(count) {
  return `set expected at most 1 argument, got ${count}`;
}
function intTooManyArgsMessage(count) {
  return `int expected at most 2 arguments, got ${count}`;
}
/** `int([1])`: an `int()` argument of a type that cannot be converted. */
function intArgTypeMessage(value) {
  return `int() argument must be a string, a bytes-like object or a real number, not '${pyType(value)}'`;
}
function absArgCountMessage(count) {
  return `abs() takes exactly one argument (${count} given)`;
}
/** `abs('a')`: an `abs()` argument of a non-numeric type. */
function absArgTypeMessage(value) {
  return `bad operand type for abs(): '${pyType(value)}'`;
}
const SUM_TOO_FEW_ARGS_MESSAGE = 'sum() takes at least 1 positional argument (0 given)';
function sumTooManyArgsMessage(count) {
  return `sum() takes at most 2 arguments (${count} given)`;
}
function extremeTooFewArgsMessage(name) {
  return `${name} expected at least 1 argument, got 0`;
}
/** `min([])`/`max([])`: an empty iterable, named by which builtin raised it. */
function extremeEmptyMessage(name) {
  return `${name}() iterable argument is empty`;
}
/** `min(1, bogus=2)`: a keyword this subset doesn't recognize, given at least one positional argument. */
function extremeUnexpectedKeywordMessage(name, keywordName) {
  return `${name}() got an unexpected keyword argument '${keywordName}'`;
}
const EXTENDED_SLICE_NOT_ITERABLE_MESSAGE = 'must assign iterable to extended slice';
/** `a, = 5`, `for a, b in 5: ...`: a tuple-unpack target given a non-iterable value. */
function unpackNotIterableMessage(value) {
  return `cannot unpack non-iterable ${pyType(value)} object`;
}
/** `[1].append()`, `[1].count(1, 2)`: a method that takes exactly one argument, given some other count. */
function methodArgCountMessage(qualifiedName, count) {
  return `${qualifiedName}() takes exactly one argument (${count} given)`;
}

export {
  binOpTypeMessage, unaryMinusMessage, unaryPlusMessage, compareMessage, containsMessage, stringContainsMessage,
  notIterableMessage, starredNotIterableMessage, notSubscriptableMessage, noLenMessage, notCallableMessage, noAttributeMessage,
  itemAssignmentMessage, indexTypeMessage, indexRangeMessage, SLICE_INDEX_TYPE_MESSAGE, SLICE_STEP_ZERO_MESSAGE,
  unhashableContextMessage, unpackMismatchMessage, notEnoughValuesForStarredMessage, extendedSliceSizeMessage, nameErrorMessage, unboundLocalMessage,
  freeVariableMessage,
  rangeArgTypeMessage, RANGE_TOO_FEW_ARGS_MESSAGE, rangeTooManyArgsMessage, setTooManyArgsMessage,
  intTooManyArgsMessage, intArgTypeMessage, absArgCountMessage, absArgTypeMessage,
  SUM_TOO_FEW_ARGS_MESSAGE, sumTooManyArgsMessage, extremeTooFewArgsMessage, extremeEmptyMessage,
  extremeUnexpectedKeywordMessage, EXTENDED_SLICE_NOT_ITERABLE_MESSAGE, unpackNotIterableMessage,
  methodArgCountMessage,
};

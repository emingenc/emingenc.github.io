import { pyType } from './value-types.js';


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
function binOpTypeMessage(op, left, right) {
  const leftType = pyType(left);
  const rightType = pyType(right);
  if (op === '+' && CONCAT_ONLY_TYPES.has(leftType)) return concatMismatchMessage(leftType, rightType);
  const nonIntType = op === '*' ? sequenceRepeatMismatch(leftType, rightType) : null;
  if (nonIntType !== null) return `can't multiply sequence by non-int of type '${nonIntType}'`;
  return unsupportedOperandMessage(op, leftType, rightType);
}
function unaryMinusMessage(value) {
  return `bad operand type for unary -: '${pyType(value)}'`;
}
function unaryPlusMessage(value) {
  return `bad operand type for unary +: '${pyType(value)}'`;
}
function compareMessage(op, left, right) {
  return `'${op}' not supported between instances of '${pyType(left)}' and '${pyType(right)}'`;
}
function containsMessage(container) {
  return `argument of type '${pyType(container)}' is not a container or iterable`;
}
function stringContainsMessage(item) {
  return `'in <string>' requires string as left operand, not ${pyType(item)}`;
}
function notIterableMessage(value) {
  return `'${pyType(value)}' object is not iterable`;
}
function starredNotIterableMessage(value) {
  return `Value after * must be an iterable, not ${pyType(value)}`;
}
function notSubscriptableMessage(value) {
  return `'${pyType(value)}' object is not subscriptable`;
}
function noLenMessage(value) {
  return `object of type '${pyType(value)}' has no len()`;
}
function notCallableMessage(value) {
  return `'${pyType(value)}' object is not callable`;
}
function noAttributeMessage(value, name) {
  return `'${pyType(value)}' object has no attribute '${name}'`;
}
function itemAssignmentMessage(value) {
  return `'${pyType(value)}' object does not support item assignment`;
}
const INDEX_TYPE_MESSAGES = {
  list: (indexType) => `list indices must be integers or slices, not ${indexType}`,
  tuple: (indexType) => `tuple indices must be integers or slices, not ${indexType}`,
  range: (indexType) => `range indices must be integers or slices, not ${indexType}`,
  str: (indexType) => `string indices must be integers, not '${indexType}'`,
};
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
function indexRangeMessage(kind, { isAssignment = false } = {}) {
  return isAssignment ? LIST_ASSIGN_RANGE_MESSAGE : INDEX_RANGE_MESSAGES[kind];
}
const SLICE_INDEX_TYPE_MESSAGE = 'slice indices must be integers or None or have an __index__ method';
const SLICE_STEP_ZERO_MESSAGE = 'slice step cannot be zero';
function unhashableContextMessage(value, contextLabel, innerMessage) {
  return `cannot use '${pyType(value)}' as a ${contextLabel} (${innerMessage})`;
}
function tooManyValuesMessage(expected, got) {
  return `too many values to unpack (expected ${expected}, got ${got})`;
}
function notEnoughValuesMessage(expected, got) {
  return `not enough values to unpack (expected ${expected}, got ${got})`;
}
function unpackMismatchMessage(expected, got) {
  return got > expected ? tooManyValuesMessage(expected, got) : notEnoughValuesMessage(expected, got);
}
function notEnoughValuesForStarredMessage(fixedCount, got) {
  return `not enough values to unpack (expected at least ${fixedCount}, got ${got})`;
}
function extendedSliceSizeMessage(gotSize, sliceSize) {
  return `attempt to assign sequence of size ${gotSize} to extended slice of size ${sliceSize}`;
}
function nameErrorMessage(name) {
  return `name '${name}' is not defined`;
}
function unboundLocalMessage(name) {
  return `cannot access local variable '${name}' where it is not associated with a value`;
}
function freeVariableMessage(name) {
  return `cannot access free variable '${name}' where it is not associated with a value in enclosing scope`;
}
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
function intArgTypeMessage(value) {
  return `int() argument must be a string, a bytes-like object or a real number, not '${pyType(value)}'`;
}
function absArgCountMessage(count) {
  return `abs() takes exactly one argument (${count} given)`;
}
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
function extremeEmptyMessage(name) {
  return `${name}() iterable argument is empty`;
}
function extremeUnexpectedKeywordMessage(name, keywordName) {
  return `${name}() got an unexpected keyword argument '${keywordName}'`;
}
const EXTENDED_SLICE_NOT_ITERABLE_MESSAGE = 'must assign iterable to extended slice';
function unpackNotIterableMessage(value) {
  return `cannot unpack non-iterable ${pyType(value)} object`;
}
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

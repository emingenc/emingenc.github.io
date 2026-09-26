import { NONE, PySlice, pyRangeItem, pyType } from './value-types.js';
import { dictLookup } from './containers.js';
import { pySize } from './size.js';
import { sliceSequence } from './run-slice.js';
import { sliceResultCost } from './op-cost.js';
import { evaluateExpr } from './run-expr.js';
import { pyRepr } from './repr.js';
import { PyError } from './errors.js';
import { notSubscriptableMessage, indexTypeMessage, indexRangeMessage } from './error-messages.js';

const SEQUENCE_KINDS = new Set(['list','tuple','str']);
function evalSlicePart(node,ctx) {
return node === null ? NONE :evaluateExpr(node,ctx);
}
function evalPySlice(node,ctx) {
return new PySlice(evalSlicePart(node.lower,ctx),evalSlicePart(node.upper,ctx),evalSlicePart(node.step,ctx));
}
function evalSubscriptKey(sliceNode,ctx) {
return sliceNode.type === 'Slice' ? evalPySlice(sliceNode,ctx) :evaluateExpr(sliceNode,ctx);
}
function readDict(object,node,ctx) {
const key = evalSubscriptKey(node.slice,ctx);
const { found,value } = dictLookup(object,key);
if (!found) throw new PyError('KeyError',pyRepr(key));
return value;
}
function isIndexType(value) {
return pyType(value) === 'int' || pyType(value) === 'bool';
}
/**
 * Validates and normalizes a subscript index against a container's length,
 * with CPython's exact wording for each container `kind` ('list', 'tuple',
 * 'str' or 'range'; list assignment has its own out-of-range wording).
 * @param {*} index - the evaluated index value
 * @param {number} length - the container's current length
 * @param {{kind: string, isAssignment?: boolean}} options
 * @returns {number} the resolved, non-negative index
 */
function boundIndex(index,length,{ kind,isAssignment = false }) {
if (!isIndexType(index)) throw new PyError('TypeError',indexTypeMessage(kind,index));
const at = Number(index) < 0 ? Number(index) + length :Number(index);
if (at < 0 || at >= length) throw new PyError('IndexError',indexRangeMessage(kind,{ isAssignment }));
return at;
}
const SEQUENCE_READERS = {
list:(object,at) => object[at],
tuple:(object,at) => object.items[at],
str:(object,at) => object[at],
};
function readSliceOfSequence(object,sliceNode,ctx) {
const result = sliceSequence(object,evalPySlice(sliceNode,ctx));
ctx.chargeSlot(sliceResultCost(result));
return result;
}
function readSequenceIndex(object,node,ctx) {
const kind = pyType(object);
const at = boundIndex(evaluateExpr(node.slice,ctx),pySize(object),{ kind });
return SEQUENCE_READERS[kind](object,at);
}
function readSequence(object,node,ctx) {
return node.slice.type === 'Slice' ? readSliceOfSequence(object,node.slice,ctx) :readSequenceIndex(object,node,ctx);
}
function readRangeIndex(object,node,ctx) {
const at = boundIndex(evaluateExpr(node.slice,ctx),object.length,{ kind:'range' });
return pyRangeItem(object,at);
}
function evaluateSubscript(node,ctx) {
const object = evaluateExpr(node.object,ctx);
const kind = pyType(object);
if (kind === 'dict') return readDict(object,node,ctx);
if (kind === 'range') return readRangeIndex(object,node,ctx);
if (SEQUENCE_KINDS.has(kind)) return readSequence(object,node,ctx);
evalSubscriptKey(node.slice,ctx);
throw new PyError('TypeError',notSubscriptableMessage(object));
}

export { evaluateSubscript, evalPySlice, evalSubscriptKey, boundIndex };

import { pyType } from './value-types.js';
import { dictSet } from './containers.js';
import { sliceWindow, sliceIndexList } from './run-slice.js';
import { iterableItems } from './run-iterable.js';
import { evaluateExpr } from './run-expr.js';
import { evalSubscriptKey, evalPySlice, boundIndex } from './run-subscript.js';
import { setVar } from './run-context.js';
import { PyError } from './errors.js';
import {
itemAssignmentMessage, unpackMismatchMessage, notEnoughValuesForStarredMessage, extendedSliceSizeMessage,
EXTENDED_SLICE_NOT_ITERABLE_MESSAGE, unpackNotIterableMessage,
} from './error-messages.js';

/**
 * `iterableItems`, wrapped so a non-iterable assignment source gets the
 * CPython wording for *this* assignment shape (extended-slice vs unpack)
 * instead of the bare "not iterable" wording a `for` loop would use.
 */
function itemsForAssign(value,message) {
try {
return iterableItems(value);
} catch (error) {
if (error instanceof PyError && error.pyClass === 'TypeError') throw new PyError('TypeError',message);
throw error;
}
}
function storeListIndex(list,node,write) {
const at = boundIndex(evaluateExpr(node.slice,write.ctx),list.length,{ kind:'list',isAssignment:true });
list[at] = write.value;
}
function storeListSlice(list,sliceNode,write) {
const window = sliceWindow(evalPySlice(sliceNode,write.ctx),list.length);
const items = itemsForAssign(write.value,EXTENDED_SLICE_NOT_ITERABLE_MESSAGE);
if (window.step === 1) {
list.splice(window.start,Math.max(0,window.stop - window.start),...items);
return;
}
const indices = sliceIndexList(window);
if (items.length !== indices.length) {
throw new PyError('ValueError',extendedSliceSizeMessage(items.length,indices.length));
}
indices.forEach((at,k) => { list[at] = items[k]; });
}
function storeList(list,node,write) {
if (node.slice.type === 'Slice') storeListSlice(list,node.slice,write);
else storeListIndex(list,node,write);
}
function storeSubscript(target,write) {
const object = evaluateExpr(target.object,write.ctx);
const kind = pyType(object);
if (kind === 'dict') { dictSet(object,evalSubscriptKey(target.slice,write.ctx),write.value); return; }
if (kind === 'list') { storeList(object,target,write); return; }
evalSubscriptKey(target.slice,write.ctx);
throw new PyError('TypeError',itemAssignmentMessage(object));
}
function storeTupleFlat(target,items,write) {
if (items.length !== target.elts.length) {
throw new PyError('ValueError',unpackMismatchMessage(target.elts.length,items.length));
}
target.elts.forEach((element,i) => storeTarget(element,items[i],write.ctx));
}
/**
 * PEP 3132 `a, *b, c = seq`: the one `Starred` element among the target's
 * `elts` absorbs every item not claimed by a fixed (non-starred) target on
 * either side of it, as a plain list - CPython verified: `a, *b, c = [1,2,3]`
 * gives `b == [2]`; `a, *b, c = [1]` raises `not enough values to unpack
 * (expected at least 2, got 1)`.
 */
function storeTupleStarred(target,starIndex,items,write) {
const fixedCount = target.elts.length - 1;
if (items.length < fixedCount) {
throw new PyError('ValueError',notEnoughValuesForStarredMessage(fixedCount,items.length));
}
const before = target.elts.slice(0,starIndex);
const after = target.elts.slice(starIndex + 1);
const starCount = items.length - fixedCount;
before.forEach((element,i) => storeTarget(element,items[i],write.ctx));
storeTarget(target.elts[starIndex].value,items.slice(starIndex,starIndex + starCount),write.ctx);
after.forEach((element,i) => storeTarget(element,items[starIndex + starCount + i],write.ctx));
}
function storeTuple(target,write) {
const items = itemsForAssign(write.value,unpackNotIterableMessage(write.value));
const starIndex = target.elts.findIndex((element) => element.type === 'Starred');
if (starIndex === -1) storeTupleFlat(target,items,write);
else storeTupleStarred(target,starIndex,items,write);
}
const TARGET_STORERS = {
Name:(target,write) => setVar(write.ctx,target.id,write.value),
Subscript:storeSubscript,
Tuple:storeTuple,
};
function storeTarget(target,value,ctx) {
TARGET_STORERS[target.type](target,{ value,ctx });
}
function assignTargets(targets,value,ctx) {
targets.forEach((target) => storeTarget(target,value,ctx));
}

export { storeTarget, assignTargets };

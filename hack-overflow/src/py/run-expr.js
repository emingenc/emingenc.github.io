import { NONE, PyTuple, PyDict, PyBuiltinFunction, pyType, pyTruthy } from './value-types.js';
import { dictSet } from './containers.js';
import { pyEquals, pyOrder, pyContains } from './compare.js';
import { containsCost } from './op-cost.js';
import { getVar } from './run-context.js';
import { evaluateCall } from './run-call.js';
import { BUILTINS } from './run-builtins.js';
import { evaluateSubscript, evalPySlice } from './run-subscript.js';
import { applyBinOp, negateValue, posateValue, INTERNAL_ERROR_CLASS, repeatResultSize } from './arith.js';
import { PyError } from './errors.js';
import { starredItems } from './run-iterable.js';

const NAME_CONSTANTS = { True:true,False:false,None:NONE };
/**
 * A bare builtin name read as a *value* (not called) - `x = max`, then
 * `max > 1` - is CPython's `builtin_function_or_method` object, not a
 * `NameError`; only unshadowed builtins qualify, the same shadow rule
 * `run-call.js`'s `isBuiltinCall` uses for the call form.
 */
function isBareBuiltinName(id,ctx) {
return Boolean(BUILTINS[id]) && !ctx.scope.has(id) && !ctx.localNames.has(id);
}
function evalName(node,ctx) {
if (isBareBuiltinName(node.id,ctx)) return new PyBuiltinFunction(node.id);
return getVar(ctx,node.id);
}
function evalNameConstant(node) {
return NAME_CONSTANTS[node.value];
}
/**
 * Evaluates a tuple/list display's elements, spreading a `*expr` (Starred)
 * element's own iterable items into the result (PEP 448) instead of
 * pushing the Starred node's value itself.
 * @param {Array<object>} elts
 * @param {object} ctx
 * @returns {Array<*>}
 */
function evaluateElements(elts,ctx) {
const items = [];
for (const elt of elts) {
if (elt.type === 'Starred') items.push(...starredItems(evaluateExpr(elt.value,ctx)));
else items.push(evaluateExpr(elt,ctx));
}
return items;
}
function evalList(node,ctx) {
return evaluateElements(node.elts,ctx);
}
function evalTuple(node,ctx) {
return new PyTuple(evaluateElements(node.elts,ctx));
}
function evalDict(node,ctx) {
const dict = new PyDict();
for (let i = 0; i < node.keys.length; i += 1) {
const key = evaluateExpr(node.keys[i],ctx);
dictSet(dict,key,evaluateExpr(node.values[i],ctx));
}
return dict;
}
function evalBoolOp(node,ctx) {
const left = evaluateExpr(node.left,ctx);
const stopHere = node.op === 'and' ? !pyTruthy(left) :pyTruthy(left);
return stopHere ? left :evaluateExpr(node.right,ctx);
}
function evalUnaryNot(node,ctx) {
return !pyTruthy(evaluateExpr(node.value,ctx));
}
function evalUnaryMinus(node,ctx) {
return negateValue(evaluateExpr(node.value,ctx));
}
function evalUnaryPlus(node,ctx) {
return posateValue(evaluateExpr(node.value,ctx));
}
/**
 * `*`'s sequence repeat (`[1] * n`) is charged the size of the result *before* building it -
 * matching `pycost.py`'s `_arith` - so a runaway repeat times out instead of allocating first
 * and only then discovering it went over budget. Plain numeric `*` (and every other op) has no
 * growth of its own to charge; `guardIntMagnitude` inside `applyBinOp` already bounds it.
 */
function evalBinOp(node,ctx) {
const left = evaluateExpr(node.left,ctx);
const right = evaluateExpr(node.right,ctx);
if (node.op === '*') {
const size = repeatResultSize(left,right);
if (size !== null) ctx.chargeSlot(size);
}
return applyBinOp(node.op,left,right);
}
const COMPARATORS = {
'==':(left,right) => pyEquals(left,right),
'!=':(left,right) => !pyEquals(left,right),
'<':(left,right) => pyOrder('<',left,right),
'<=':(left,right) => pyOrder('<=',left,right),
'>':(left,right) => pyOrder('>',left,right),
'>=':(left,right) => pyOrder('>=',left,right),
in:(left,right) => pyContains(left,right),
'not in':(left,right) => !pyContains(left,right),
};
function compareLink(op,operands,ctx) {
const [left,right] = operands;
// containsCost(right) only matters when ctx.chargeSlot will actually charge it
// (the slot line), so skip building it on every off-slot in/not-in check -
// e.g. a loop header re-evaluated up to the op budget every tick (perf only,
// same charged amount as before: chargeSlot itself already no-ops off-slot).
if ((op === 'in' || op === 'not in') && ctx.onSlotLine) ctx.chargeSlot(containsCost(right));
return COMPARATORS[op](left,right);
}
const MEMBERSHIP_COMPARE_OPS = new Set(['in','not in']);
/**
 * CPython's op-cost model only wraps a comparison chain's operands in
 * per-operand closures (see `RunContext.withChainThunk`) when the chain has
 * 2+ operators and at least one is `in`/`not in`; a lone `in`/`not in` test
 * is metered inline with no closure involved.
 */
function needsChainThunk(node) {
return node.ops.length > 1 && node.ops.some((op) => MEMBERSHIP_COMPARE_OPS.has(op));
}
function evalCompareChain(node,ctx) {
let current = evaluateExpr(node.left,ctx);
for (let i = 0; i < node.ops.length; i += 1) {
const next = evaluateExpr(node.comparators[i],ctx);
if (!compareLink(node.ops[i],[current,next],ctx)) return false;
current = next;
}
return true;
}
function evalCompare(node,ctx) {
if (ctx.onSlotLine && needsChainThunk(node)) return ctx.withChainThunk(() => evalCompareChain(node,ctx));
return evalCompareChain(node,ctx);
}
/**
 * Evaluates one parsed expression node against the current run context.
 * A `switch` on `node.type` rather than a `{Type: fn}` dispatch object: this
 * is the single hottest call in the interpreter (every expression anywhere
 * in a running program passes through it, often millions of times for one
 * slow judged line), and V8's inline cache for a plain-object property
 * lookup goes megamorphic across this many distinct `node.type` strings,
 * costing far more than a `switch`'s string-compare chain (profiled: this
 * change alone cut a 400,000-op line's judge time by about a fifth).
 */
function evaluateExpr(node,ctx) {
switch (node.type) {
case 'Name':return evalName(node,ctx);
case 'Num':return node.value;
case 'Str':return node.value;
case 'NameConstant':return evalNameConstant(node);
case 'List':return evalList(node,ctx);
case 'Tuple':return evalTuple(node,ctx);
case 'Dict':return evalDict(node,ctx);
case 'BoolOp':return evalBoolOp(node,ctx);
case 'UnaryNot':return evalUnaryNot(node,ctx);
case 'UnaryMinus':return evalUnaryMinus(node,ctx);
case 'UnaryPlus':return evalUnaryPlus(node,ctx);
case 'BinOp':return evalBinOp(node,ctx);
case 'Compare':return evalCompare(node,ctx);
case 'Call':return evaluateCall(node,ctx);
case 'Subscript':return evaluateSubscript(node,ctx);
case 'Slice':return evalPySlice(node,ctx);
default:throw new PyError(INTERNAL_ERROR_CLASS,`unsupported expression: ${node.type}`);
}
}

export { evaluateExpr, applyBinOp };

import { BUILTINS } from './run-builtins.js';
import { findMethod } from './run-methods.js';
import { builtinCost, methodCost } from './op-cost.js';
import { evaluateExpr } from './run-expr.js';
import { starredItems } from './run-iterable.js';
import { PyError } from './errors.js';
import { notCallableMessage } from './error-messages.js';

/**
 * The CPython oracle (tools/content/pycost.py's `_CostTransformer.visit_Call`)
 * rewrites every slot-line call `f(a, *b)` into a helper call whose arguments
 * are first assembled into an ordinary `(a, *b)` tuple *literal* so it can
 * charge ops before invoking - so a non-iterable splat argument always raises
 * CPython's generic tuple-display wording ("Value after * must be an
 * iterable, not X"), never the callee-named "f() argument after * ..." form
 * real un-instrumented CPython would use for a sole splat argument (verified
 * both live and via `pycost.py --check`, which reproduces the committed
 * fixtures unchanged). `starredItems` already throws that generic wording.
 */
function evalArgs(node,ctx) {
const positional = [];
for (const arg of node.args) {
if (arg.type === 'Starred') positional.push(...starredItems(evaluateExpr(arg.value,ctx)));
else positional.push(evaluateExpr(arg,ctx));
}
const keyword = node.keywords.map((kw) => ({ name:kw.name,value:evaluateExpr(kw.value,ctx) }));
return { positional,keyword };
}
function evaluateBuiltinCall(node,ctx) {
const { positional,keyword } = evalArgs(node,ctx);
ctx.chargeSlot(builtinCost(node.func.id,positional));
return BUILTINS[node.func.id](positional,keyword);
}
function evaluateMethodCall(node,ctx) {
const receiver = evaluateExpr(node.func.object,ctx);
const { positional } = evalArgs(node,ctx);
const method = findMethod(receiver,node.func.name);
ctx.chargeSlot(methodCost(receiver,node.func.name,positional));
return method(receiver,positional);
}
function evaluateOtherCall(node,ctx) {
const func = evaluateExpr(node.func,ctx);
// CPython evaluates the callee, then every argument (left to right), and
// only then attempts the call - the "is it callable" failure is a property
// of the CALL bytecode itself, which never runs until both are on the
// stack. So an error raised while evaluating an argument (e.g. an unbound
// local read) must surface before this call's own not-callable error, not
// be masked by it.
evalArgs(node,ctx);
throw new PyError('TypeError',notCallableMessage(func));
}
/**
 * A builtin name only resolves to the builtin when nothing shadows it: a
 * variable already bound to something else, or a local slot this function
 * assigns anywhere (CPython: `max = max(x)` raises `UnboundLocalError` on
 * that same call, never falls back to the builtin `max`).
 */
function isBuiltinCall(node,ctx) {
if (node.func.type !== 'Name' || !BUILTINS[node.func.id]) return false;
return !ctx.scope.has(node.func.id) && !ctx.localNames.has(node.func.id);
}
function evaluateCall(node,ctx) {
if (isBuiltinCall(node,ctx)) return evaluateBuiltinCall(node,ctx);
if (node.func.type === 'Attribute') return evaluateMethodCall(node,ctx);
return evaluateOtherCall(node,ctx);
}

export { evaluateCall };

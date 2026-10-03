import { BUILTINS } from './run-builtins.js';
import { findMethod } from './run-methods.js';
import { builtinCost, methodCost } from './op-cost.js';
import { evaluateExpr } from './run-expr.js';
import { starredItems } from './run-iterable.js';
import { PyError } from './errors.js';
import { notCallableMessage } from './error-messages.js';

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
evalArgs(node,ctx);
throw new PyError('TypeError',notCallableMessage(func));
}
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

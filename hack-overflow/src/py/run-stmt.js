import { NONE, pyType, pyTruthy } from './value-types.js';
import { evaluateExpr, applyBinOp } from './run-expr.js';
import { assignTargets, storeTarget } from './run-assign.js';
import { evalSubscriptKey } from './run-subscript.js';
import { iterableItems } from './run-iterable.js';
import { PyReturn, PyError } from './errors.js';
import { execFor, execWhile } from './run-loop.js';
import { INTERNAL_ERROR_CLASS, repeatResultSize } from './arith.js';
import { augAddCost } from './op-cost.js';

function execExprStmt(node,ctx) {
evaluateExpr(node.value,ctx);
}
function execReturn(node,ctx) {
throw new PyReturn(node.value ? evaluateExpr(node.value,ctx) :NONE);
}
function execAssign(node,ctx) {
assignTargets(node.targets,evaluateExpr(node.value,ctx),ctx);
}
const AUG_TO_BIN = { '+=':'+','-=':'-','*=':'*','//=':'//','%=':'%' };
function augAddResult(current,rhs) {
if (pyType(current) === 'list') { current.push(...iterableItems(rhs)); return current; }
return applyBinOp('+',current,rhs);
}
function chargeAugGrowth(op,current,rhs,ctx) {
if (op === '+=') { ctx.chargeSlot(augAddCost(current,rhs)); return; }
if (op !== '*=') return;
const size = repeatResultSize(current,rhs);
if (size !== null) ctx.chargeSlot(size);
}
function execAugAssign(node,ctx) {
const current = evaluateExpr(node.target,ctx);
const rhs = evaluateExpr(node.value,ctx);
chargeAugGrowth(node.op,current,rhs,ctx);
const result = node.op === '+=' ? augAddResult(current,rhs) :applyBinOp(AUG_TO_BIN[node.op],current,rhs);
storeTarget(node.target,result,ctx);
}
function execAnnSubscriptTarget(target,ctx) {
evaluateExpr(target.object,ctx);
evalSubscriptKey(target.slice,ctx);
}
function execAnnAssign(node,ctx) {
if (node.value) { assignTargets([node.target],evaluateExpr(node.value,ctx),ctx); return; }
if (node.target.type === 'Subscript') execAnnSubscriptTarget(node.target,ctx);
}
function chargeHeaderTick(node,ctx) {
if (ctx.slotKind === 'header' && ctx.isSlotLine(node)) ctx.meter.charge(1);
}
function headerTest(node,ctx) {
chargeHeaderTick(node,ctx);
if (ctx.slotKind === 'header' && ctx.isSlotLine(node)) {
return ctx.withSlot(() => pyTruthy(evaluateExpr(node.test,ctx)));
}
return pyTruthy(evaluateExpr(node.test,ctx));
}
function execIf(node,ctx) {
execBody(headerTest(node,ctx) ? node.body :node.orelse,ctx);
}
function execStatement(node,ctx) {
switch (node.type) {
case 'ExprStmt':execExprStmt(node,ctx); return;
case 'Return':execReturn(node,ctx); return;
case 'Assign':execAssign(node,ctx); return;
case 'AugAssign':execAugAssign(node,ctx); return;
case 'AnnAssign':execAnnAssign(node,ctx); return;
case 'If':execIf(node,ctx); return;
case 'For':execFor(node,ctx); return;
case 'While':execWhile(node,ctx); return;
default:throw new PyError(INTERNAL_ERROR_CLASS,`unsupported statement: ${node.type}`);
}
}
function execOne(node,ctx) {
const startsSlotStatement = ctx.slotKind === 'statement' && ctx.isSlotLine(node) && !ctx.onSlotLine;
if (!startsSlotStatement) { execStatement(node,ctx); return; }
ctx.meter.charge(1);
ctx.withSlot(() => execStatement(node,ctx));
}
function execBody(statements,ctx) {
for (let i = 0; i < statements.length; i += 1) execOne(statements[i],ctx);
}

export { execBody, execStatement, headerTest };

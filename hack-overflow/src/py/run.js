import { NONE } from './value-types.js';
import { RunContext, setVar } from './run-context.js';
import { execBody } from './run-stmt.js';
import { PyError, PyReturn, TimeLimitExceeded } from './errors.js';
import { INTERNAL_ERROR_CLASS } from './arith.js';
import { collectLocalNames } from './scope.js';

function bindParams(funcNode,args,ctx) {
funcNode.params.forEach((name,i) => setVar(ctx,name,args[i]));
}
/**
 * The statement-runner boundary: any JS error that escaped statement
 * execution without already being a `PyError` or a budget signal is an
 * interpreter gap, not something the player should see as a JS crash.
 */
function asInternalError(signal) {
return new PyError(INTERNAL_ERROR_CLASS,`internal error: ${signal.message ?? signal}`);
}
function runBody(funcNode,ctx) {
execBody(funcNode.body,ctx);
return NONE;
}
/**
 * Runs one compiled candidate call from function-node setup through its
 * body. Every step - building the context, binding parameters, executing
 * the body - is covered by one boundary: a `PyReturn` unwinds to its value,
 * a `PyError`/`TimeLimitExceeded` propagates as-is, and anything else (a
 * malformed `funcNode`, or any other interpreter gap) becomes an
 * `InternalError` verdict instead of a raw JS crash reaching the judge.
 */
function callFunction(funcNode,args,run) {
try {
const ctx = new RunContext(run.meter,run.slot,collectLocalNames(funcNode.body));
bindParams(funcNode,args,ctx);
return runBody(funcNode,ctx);
} catch (signal) {
if (signal instanceof PyReturn) return signal.value;
if (signal instanceof PyError || signal instanceof TimeLimitExceeded) throw signal;
throw asInternalError(signal);
}
}

export { callFunction };

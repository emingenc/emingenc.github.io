import { NONE } from './value-types.js';
import { RunContext, setVar } from './run-context.js';
import { execBody } from './run-stmt.js';
import { PyError, PyReturn, TimeLimitExceeded } from './errors.js';
import { INTERNAL_ERROR_CLASS } from './arith.js';
import { collectLocalNames } from './scope.js';

function bindParams(funcNode,args,ctx) {
funcNode.params.forEach((name,i) => setVar(ctx,name,args[i]));
}
function asInternalError(signal) {
return new PyError(INTERNAL_ERROR_CLASS,`internal error: ${signal.message ?? signal}`);
}
function runBody(funcNode,ctx) {
execBody(funcNode.body,ctx);
return NONE;
}
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

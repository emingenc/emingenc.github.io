import { callFunction } from '../py/run.js';
import { Meter, budgetFor } from '../py/meter.js';
import { pyDeepCopy } from '../py/copy.js';
import { matches } from './compare.js';
import { PyError, TimeLimitExceeded } from '../py/errors.js';

function runOutcome(compiled,run,testCase) {
const got = callFunction(compiled.func,run.args,{ meter:run.meter,slot:compiled.slot });
if (matches(compiled.compare,got,testCase.expected)) return { letter:'P',ops:run.meter.ops,detail:null,message:null };
return { letter:'W',ops:run.meter.ops,detail:got,message:null };
}
function caughtOutcome(error,meter) {
if (error instanceof TimeLimitExceeded) return { letter:'T',ops:meter.ops,detail:null,message:null };
if (error instanceof PyError) return { letter:'R',ops:meter.ops,detail:error.pyClass,message:error.pyMessage };
throw error;
}
/**
 * Runs one case against a compiled line and reports its verdict letter,
 * op count, evidence detail, and a nullable failure `message` holding the
 * exact CPython `str(exc)` text for a runtime-error verdict.
 * @param {{func:object, slot:object, compare:string, budget:object}} compiled
 * @param {{args:Array<*>, expected:*}} testCase
 * @returns {{letter:string, ops:number, detail:*, message:?string}}
 */
function runCaseDetail(compiled,testCase) {
const meter = new Meter(budgetFor(compiled.budget,testCase.args));
const run = { meter,args:testCase.args.map(pyDeepCopy) };
try {
return runOutcome(compiled,run,testCase);
} catch (error) {
return caughtOutcome(error,meter);
}
}

export { runCaseDetail };

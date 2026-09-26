import { judgeLine } from '../judge/index.js';
import { compileLine } from '../judge/compile.js';
import { compiledLine } from '../judge/index.js';
import { runCaseDetail } from '../judge/case.js';
import { matches } from '../judge/compare.js';
import { EXAMPLE_KIND } from '../judge/counts.js';
import { Meter, budgetFor, sizeOfArgs } from '../py/meter.js';
import { callFunction } from '../py/run.js';
import { pyDeepCopy } from '../py/copy.js';
import { PyError, TimeLimitExceeded } from '../py/errors.js';
import { parseCandidate } from './parse-bridge.js';

function fullJudge(catalog,key,text) {
const problem = catalog.problemByKey.get(key);
return judgeLine(problem,text,catalog.contextFor(key));
}
function isFullPass(outcomes) {
return [...outcomes].every((letter) => letter === 'P');
}
function exampleCases(context) {
return context.cases.small.filter((testCase) => testCase.kind === EXAMPLE_KIND);
}
function runForDisplay(compiled,testCase) {
const meter = new Meter(budgetFor(compiled.budget,testCase.args));
try {
const got = callFunction(compiled.func,testCase.args.map(pyDeepCopy),{ meter,slot:compiled.slot });
return { pass:matches(compiled.compare,got,testCase.expected),got,error:null,errorMessage:null };
} catch (error) {
if (error instanceof TimeLimitExceeded) return { pass:false,got:null,error:null,errorMessage:null };
if (error instanceof PyError) return { pass:false,got:null,error:error.pyClass,errorMessage:error.pyMessage };
throw error;
}
}
/**
 * Formats the combined `"<class>: <message>"` line shown for a runtime
 * error, or `null` when no CPython message applies.
 * @param {?string} pyClass
 * @param {?string} pyMessage
 * @returns {?string}
 */
function errorText(pyClass,pyMessage) {
return pyMessage === null ? null :`${pyClass}: ${pyMessage}`;
}
function exampleView(compiled,testCase) {
const outcome = runForDisplay(compiled,testCase);
return {
input:testCase.args,expected:testCase.expected,got:outcome.got,error:outcome.error,
message:outcome.errorMessage,errorText:errorText(outcome.error,outcome.errorMessage),pass:outcome.pass,
};
}
function runMessage(exampleCount,hiddenCount) {
return `EXAMPLES PASS ${exampleCount}/${exampleCount}. SUBMIT runs all ${hiddenCount} hidden tests and the max test.`;
}
function passedExamplesMessage(examples,counts) {
const allPassed = examples.every((example) => example.pass);
if (!allPassed) return null;
return runMessage(counts.examples,counts.hidden);
}
/**
 * Judges the visible-example run (RUN), using the problem's single
 * {examples, hidden, total} test-count set (judge/counts.js) so its
 * "N hidden tests" wording can never diverge from SUBMIT's counts.
 * @param {object} catalog - `createCatalog(content)`
 * @param {string} key - problem key
 * @param {string} text - the candidate slot line
 * @returns {object} the RUN view model
 */
function examplesFor(catalog,key,text) {
const problem = catalog.problemByKey.get(key);
const func = compileLine(problem,text);
if (!func) return { ok:false,syntaxError:parseCandidate(problem,text),examples:[],message:null };
const context = catalog.contextFor(key);
const compiled = compiledLine(func,problem,context);
const examples = exampleCases(context).map((testCase) => exampleView(compiled,testCase));
return { ok:true,syntaxError:null,examples,message:passedExamplesMessage(examples,context.counts) };
}

export { fullJudge, isFullPass, examplesFor };

import { compileLine } from '../judge/compile.js';
import { compiledLine } from '../judge/index.js';
import { runCaseDetail } from '../judge/case.js';
import { budgetFor, sizeOfArgs } from '../py/meter.js';

const VERDICT_WORDS = { P:'ACCEPTED',W:'WRONG ANSWER',R:'RUNTIME ERROR',T:'TIME LIMIT EXCEEDED' };
const SYNTAX_ERROR_VERDICT = 'SYNTAX ERROR';
function emptyFields() {
return { input:null,expected:null,got:null,error:null,message:null,errorText:null,n:null,ops:null,budget:null };
}
function syntaxErrorSubmit() {
return { verdict:SYNTAX_ERROR_VERDICT,test:null,of:null,...emptyFields() };
}
function wrongAnswerFields(testCase,result) {
return { ...emptyFields(),input:testCase.args,expected:testCase.expected,got:result.detail };
}
/**
 * Formats the combined `"<class>: <message>"` line shown for a runtime
 * error, or `null` when no CPython message applies.
 * @param {?string} pyClass
 * @param {?string} message
 * @returns {?string}
 */
function errorText(pyClass,message) {
return message === null ? null :`${pyClass}: ${message}`;
}
function runtimeErrorFields(testCase,result) {
return {
...emptyFields(),input:testCase.args,error:result.detail,message:result.message,
errorText:errorText(result.detail,result.message),
};
}
function timeLimitFields(judging,testCase) {
return { ...emptyFields(),input:testCase.args,budget:budgetFor(judging.compiled.budget,testCase.args) };
}
const SMALL_FAILURE_FIELDS = {
W:(judging,testCase,result) => wrongAnswerFields(testCase,result),
R:(judging,testCase,result) => runtimeErrorFields(testCase,result),
T:(judging,testCase) => timeLimitFields(judging,testCase),
};
function smallCaseSubmit(judging,failure) {
const { index,testCase,result } = failure;
const fields = SMALL_FAILURE_FIELDS[result.letter](judging,testCase,result);
return { verdict:VERDICT_WORDS[result.letter],test:index + 1,of:judging.context.counts.total,...fields };
}
function maxCaseFields(judging,maxResult) {
const maxArgs = judging.context.cases.max.args;
return { n:sizeOfArgs(maxArgs),ops:maxResult.ops,budget:budgetFor(judging.compiled.budget,maxArgs) };
}
function acceptedSubmit(judging,maxResult) {
const total = judging.context.counts.total;
return { verdict:'ACCEPTED',test:total,of:total,...emptyFields(),...maxCaseFields(judging,maxResult) };
}
function maxFailureFields(maxResult) {
if (maxResult.letter !== 'R') return { error:null,message:null,errorText:null };
return { error:maxResult.detail,message:maxResult.message,errorText:errorText(maxResult.detail,maxResult.message) };
}
function maxFailureSubmit(judging,maxResult) {
const base = { verdict:VERDICT_WORDS[maxResult.letter],test:null,of:judging.context.counts.total,...emptyFields() };
return { ...base,...maxFailureFields(maxResult),...maxCaseFields(judging,maxResult) };
}
function evaluateSmallCases(compiled,smallCases) {
return smallCases.map((testCase,index) => ({ index,testCase,result:runCaseDetail(compiled,testCase) }));
}
function firstFailure(evaluated) {
return evaluated.find((entry) => entry.result.letter !== 'P') || null;
}
/**
 * Judges one SUBMIT: every small case, then the max case, using the
 * problem's single {examples, hidden, total} test-count set (judge/counts.js)
 * for every count shown so it can never diverge from the RUN panel.
 * @param {object} catalog - `createCatalog(content)`
 * @param {string} key - problem key
 * @param {string} text - the candidate slot line
 * @returns {object} the submit view model
 */
function submitFor(catalog,key,text) {
const problem = catalog.problemByKey.get(key);
const func = compileLine(problem,text);
if (!func) return syntaxErrorSubmit();
const context = catalog.contextFor(key);
const compiled = compiledLine(func,problem,context);
const judging = { compiled,context };
const failure = firstFailure(evaluateSmallCases(compiled,context.cases.small));
if (failure) return smallCaseSubmit(judging,failure);
const maxResult = runCaseDetail(compiled,context.cases.max);
return maxResult.letter === 'P' ? acceptedSubmit(judging,maxResult) :maxFailureSubmit(judging,maxResult);
}

export { submitFor, VERDICT_WORDS };

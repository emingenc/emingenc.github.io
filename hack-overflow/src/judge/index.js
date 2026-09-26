import { compileLine } from './compile.js';
import { runCaseDetail } from './case.js';
import { pyRepr } from '../py/repr.js';
import { buildContext } from './context.js';

const MAX_LABEL = 'max';
function evidenceDetail(caseLabel,result) {
if (result.letter === 'R') return result.detail;
if (result.letter === 'W' && caseLabel !== MAX_LABEL) return pyRepr(result.detail);
return null;
}
function evidence(caseLabel,result) {
return { case:caseLabel,letter:result.letter,detail:evidenceDetail(caseLabel,result) };
}
function compiledLine(func,problem,context) {
return { func,slot:{ line:context.slotLine,kind:problem.slot_kind },compare:problem.compare,budget:context.budget };
}
function outcomesFor(compiled,cases) {
const results = cases.small.map((testCase) => runCaseDetail(compiled,testCase));
const letters = results.map((result) => result.letter).join('');
const failingIndex = results.findIndex((result) => result.letter !== 'P');
if (failingIndex !== -1) {
const failing = results[failingIndex];
return { outcomes:`${letters}-`,max_ops:null,first:evidence(failingIndex,failing),message:failing.message };
}
const maxResult = runCaseDetail(compiled,cases.max);
const first = maxResult.letter === 'P' ? null :evidence(MAX_LABEL,maxResult);
const message = maxResult.letter === 'P' ? null :maxResult.message;
return { outcomes:letters + maxResult.letter,max_ops:maxResult.ops,first,message };
}
function judgeLine(problem,text,context) {
const func = compileLine(problem,text);
if (!func) return { outcomes:'S',max_ops:null,first:null,message:null };
return outcomesFor(compiledLine(func,problem,context),context.cases);
}

export { judgeLine, buildContext, compiledLine };

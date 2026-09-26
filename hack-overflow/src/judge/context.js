import { compileLine, slotLineOf } from './compile.js';
import { maxTestArgs } from './max-tests.js';
import { jsonHash } from './hash.js';
import { testCounts } from './counts.js';
import { callFunction } from '../py/run.js';
import { Meter, budgetFor } from '../py/meter.js';
import { pyDeepCopy } from '../py/copy.js';

function buildMaxCase(problem,budget) {
const args = maxTestArgs(problem.max.args);
const func = compileLine(problem,problem.answer.join(' '));
const slot = { line:slotLineOf(problem),kind:problem.slot_kind };
const meter = new Meter(budgetFor(budget,args));
const expected = callFunction(func,args.map(pyDeepCopy),{ meter,slot });
return {
testCase:{ args,expected,kind:'max' },
inputHash:jsonHash(args),
expectedHash:jsonHash(expected),
};
}
/**
 * Builds the judging context for one problem: its small and max cases,
 * its own budget (every merged problem carries one), and the single
 * {examples, hidden, total} test-count set every view reads from.
 * @param {object} problem - a merged content.gen.js problem
 * @returns {object} the judging context
 */
function buildContext(problem) {
const budget = problem.budget;
const built = buildMaxCase(problem,budget);
return {
cases:{ small:problem.cases,max:built.testCase },
counts:testCounts(problem.cases),
budget,
slotLine:slotLineOf(problem),
maxHashes:{ inputHash:built.inputHash,expectedHash:built.expectedHash },
};
}

export { buildContext };

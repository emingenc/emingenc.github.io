import { TimeLimitExceeded } from './errors.js';

class Meter {
constructor(budget) {
this.ops = 0;
this.budget = budget;
}
charge(amount) {
this.ops += amount;
if (this.ops > this.budget) throw new TimeLimitExceeded();
}
}
/**
 * The max test's time budget: `problem.budget.per_item * n + problem.budget.base`
 * (e.md: "budget = 1024 * n + 1000"), using the caller's own `budget`
 * object so each problem's override (content.gen.js 2.6) applies.
 * @param {{per_item:number, base:number}} budget - the problem's own budget
 * @param {Array<*>} args - the case's argument list
 * @returns {number} the op budget for this case
 */
function budgetFor(budget,args) {
return budget.per_item * sizeOfArgs(args) + budget.base;
}
/**
 * n = the total length of every list and string argument. A nested list
 * (e.g. a grid) counts only its outer length: cost is charged by container
 * size, not by recursively summing every nested element.
 * @param {Array<*>} args
 * @returns {number}
 */
function sizeOfArgs(args) {
return args.reduce((total,arg) => total + argLength(arg),0);
}
function argLength(arg) {
if (typeof arg === 'string') return arg.length;
return Array.isArray(arg) ? arg.length :0;
}

export { Meter, budgetFor, sizeOfArgs };

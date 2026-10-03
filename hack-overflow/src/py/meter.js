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
function budgetFor(budget,args) {
return budget.per_item * sizeOfArgs(args) + budget.base;
}
function sizeOfArgs(args) {
return args.reduce((total,arg) => total + argLength(arg),0);
}
function argLength(arg) {
if (typeof arg === 'string') return arg.length;
return Array.isArray(arg) ? arg.length :0;
}

export { Meter, budgetFor, sizeOfArgs };

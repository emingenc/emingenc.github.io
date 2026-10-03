import { pyRepr } from '../py/repr.js';
import { MAX_STARS_PER_LOCK } from '../logic/index.js';

function uiInputAssignments(problem,args) {
return problem.params.map(function (name,index) {
return name + ' = ' + pyRepr(args[index]);
});
}
function uiMaxTestExpression(max) {
return max.display.join('; ');
}
function uiFormatNumber(value) {
return value.toLocaleString('en-US');
}
function uiFormatFraction(part,total) {
return uiFormatNumber(part) + '/' + uiFormatNumber(total);
}
function uiStarGlyphs(stars) {
const filled = new Array(stars).fill('★').join('');
const empty = new Array(MAX_STARS_PER_LOCK - stars).fill('☆').join('');
return filled + empty;
}
function uiCostModelText(budget) {
return 'Budget per test: ' + budget.per_item + ' × n + ' + budget.base + ' ops. '
+ 'Each loop step: 1. Your line: 1 each run. '
+ 'On your line: x in list/str = its length; count/index = the length; '
+ 'a slice = its length; min/max of one list = its length.';
}

export { uiInputAssignments, uiMaxTestExpression, uiFormatNumber, uiFormatFraction, uiStarGlyphs, uiCostModelText };

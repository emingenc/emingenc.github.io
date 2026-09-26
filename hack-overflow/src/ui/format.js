import { pyRepr } from '../py/repr.js';
import { hashStr, MAX_STARS_PER_LOCK } from '../logic/index.js';

const LOCK_ID_MASK = 0xffff;
const LOCK_ID_HEX_DIGITS = 4;
const UI_HEX_RADIX = 16;
const UI_DAY_LABEL_OFFSET = 1;
function uiInputAssignments(problem,args) {
return problem.params.map(function (name,index) {
return name + ' = ' + pyRepr(args[index]);
});
}
function uiLockIdText(key,when) {
const seed = key + ':' + when.day + ':' + when.attempt;
const masked = hashStr(seed) & LOCK_ID_MASK;
return masked.toString(UI_HEX_RADIX).toUpperCase().padStart(LOCK_ID_HEX_DIGITS,'0');
}
function uiDayLabel(day) {
return day + UI_DAY_LABEL_OFFSET;
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
const UI_BAR_MAX_PERCENT = 100;
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

export { UI_BAR_MAX_PERCENT, uiInputAssignments, uiLockIdText, uiDayLabel, uiMaxTestExpression, uiFormatNumber, uiFormatFraction, uiStarGlyphs, uiCostModelText };

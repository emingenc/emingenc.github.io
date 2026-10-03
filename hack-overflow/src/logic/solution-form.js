const NO_SPACE_BEFORE = new Set([':', ',', ')', ']']);
const NO_SPACE_AFTER_SUFFIX = new Set(['(', '[']);
const DOT = '.';
const UNARY_MINUS = '-';
const CLASS_BODY_INDENT = '    ';
const SLOT_PLACEHOLDER = '{slot}';

const UNARY_MINUS_CONTEXT = new Set([
'return', 'and', 'or', 'not', 'in', 'if', 'elif', 'while',
',', ':', '=', '==', '!=', '<', '>', '<=', '>=', '+', '-', '*', '//', '%',
]);

function opensUnaryMinus(prevChip) {
if (prevChip === undefined) return true;
if (UNARY_MINUS_CONTEXT.has(prevChip)) return true;
const lastChar = prevChip[prevChip.length - 1];
return NO_SPACE_AFTER_SUFFIX.has(lastChar);
}

function isUnaryMinusAt(chips, index) {
return chips[index] === UNARY_MINUS && opensUnaryMinus(chips[index - 1]);
}

function gluesToPrevious(chips, index) {
const prevChip = chips[index - 1];
const chip = chips[index];
if (chip === DOT || prevChip === DOT) return true;
if (NO_SPACE_BEFORE.has(chip[0])) return true;
if (NO_SPACE_AFTER_SUFFIX.has(prevChip[prevChip.length - 1])) return true;
return isUnaryMinusAt(chips, index - 1);
}

function prettyLine(chips) {
return chips.reduce(function (text, chip, index) {
if (index === 0) return chip;
const glue = gluesToPrevious(chips, index);
return text + (glue ? '' : ' ') + chip;
}, '');
}

function typedParam(problem, index) {
return problem.params[index] + ': ' + problem.types.params[index];
}

function classDefLine(problem) {
const params = problem.params.map(function (_name, index) { return typedParam(problem, index); });
return 'def ' + problem.function + '(self, ' + params.join(', ') + ') -> ' + problem.types.returns + ':';
}

function classBodyLine(skeletonLine, lineText) {
return CLASS_BODY_INDENT + skeletonLine.replace(SLOT_PLACEHOLDER, lineText);
}

function classForm(problem, lineText) {
const bodyLines = problem.skeleton.slice(1).map(function (line) { return classBodyLine(line, lineText); });
return ['class Solution:', CLASS_BODY_INDENT + classDefLine(problem), ...bodyLines].join('\n');
}

export { prettyLine, classForm, classDefLine };

const NO_SPACE_BEFORE = new Set([':', ',', ')', ']']);
const NO_SPACE_AFTER_SUFFIX = new Set(['(', '[']);
const DOT = '.';
const UNARY_MINUS = '-';
const CLASS_BODY_INDENT = '    ';
const SLOT_PLACEHOLDER = '{slot}';

// Chips after which a following "-" chip reads as a unary minus (no operand
// on its left), so it must glue tight to whatever chip comes next.
const UNARY_MINUS_CONTEXT = new Set([
'return', 'and', 'or', 'not', 'in', 'if', 'elif', 'while',
',', ':', '=', '==', '!=', '<', '>', '<=', '>=', '+', '-', '*', '//', '%',
]);

/**
 * True when a "-" chip right after `prevChip` must be read as unary (there
 * is no left operand for it to subtract from).
 * @param {string|undefined} prevChip - the chip before the "-", or
 *   undefined when "-" opens the line
 * @returns {boolean}
 */
function opensUnaryMinus(prevChip) {
if (prevChip === undefined) return true;
if (UNARY_MINUS_CONTEXT.has(prevChip)) return true;
const lastChar = prevChip[prevChip.length - 1];
return NO_SPACE_AFTER_SUFFIX.has(lastChar);
}

/**
 * True when chips[index] is a "-" that opens as unary (no left operand),
 * so the chip after it must glue tight with no space.
 * @param {string[]} chips
 * @param {number} index
 * @returns {boolean}
 */
function isUnaryMinusAt(chips, index) {
return chips[index] === UNARY_MINUS && opensUnaryMinus(chips[index - 1]);
}

/**
 * True when chips[index] must glue to chips[index - 1], per PEP 8: no space
 * before ":" "," ")" "]", no space after "(" "[", no space around a bare
 * ".", and no space right after a unary "-".
 * @param {string[]} chips
 * @param {number} index
 * @returns {boolean}
 */
function gluesToPrevious(chips, index) {
const prevChip = chips[index - 1];
const chip = chips[index];
if (chip === DOT || prevChip === DOT) return true;
if (NO_SPACE_BEFORE.has(chip[0])) return true;
if (NO_SPACE_AFTER_SUFFIX.has(prevChip[prevChip.length - 1])) return true;
return isUnaryMinusAt(chips, index - 1);
}

/**
 * Joins tray chips into a PEP 8-spaced Python line, e.g.
 * ["if","x","in","seen",":","return","True"] -> "if x in seen: return True".
 * @param {string[]} chips - chip texts in line order
 * @returns {string} the pretty-printed line
 */
function prettyLine(chips) {
return chips.reduce(function (text, chip, index) {
if (index === 0) return chip;
const glue = gluesToPrevious(chips, index);
return text + (glue ? '' : ' ') + chip;
}, '');
}

/**
 * One "name: Type" parameter for the class-form def line.
 * @param {object} problem - merged problem (params, types)
 * @param {number} index - position in problem.params
 * @returns {string}
 */
function typedParam(problem, index) {
return problem.params[index] + ': ' + problem.types.params[index];
}

/**
 * The LeetCode `class Solution` method's def line, e.g.
 * "def containsDuplicate(self, nums: List[int]) -> bool:".
 * @param {object} problem - merged problem (function, params, types)
 * @returns {string}
 */
function classDefLine(problem) {
const params = problem.params.map(function (_name, index) { return typedParam(problem, index); });
return 'def ' + problem.function + '(self, ' + params.join(', ') + ') -> ' + problem.types.returns + ':';
}

/**
 * One skeleton body line indented one extra level for `class Solution:`,
 * with the {slot} placeholder filled by the pretty-printed answer line.
 * @param {string} skeletonLine - a line from problem.skeleton (not the def line)
 * @param {string} lineText - prettyLine's output for the player's answer
 * @returns {string}
 */
function classBodyLine(skeletonLine, lineText) {
return CLASS_BODY_INDENT + skeletonLine.replace(SLOT_PLACEHOLDER, lineText);
}

/**
 * The full LeetCode `class Solution` method text for a problem and its
 * (already pretty-printed) answer line, ready to display and copy.
 * @param {object} problem - merged problem (function, params, types, skeleton)
 * @param {string} lineText - prettyLine's output for the slot
 * @returns {string} the class form, newline-joined
 */
function classForm(problem, lineText) {
const bodyLines = problem.skeleton.slice(1).map(function (line) { return classBodyLine(line, lineText); });
return ['class Solution:', CLASS_BODY_INDENT + classDefLine(problem), ...bodyLines].join('\n');
}

export { prettyLine, classForm, classDefLine };

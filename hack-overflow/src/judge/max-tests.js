/**
 * Max-test argument DSL. Each generator turns one `max.args[i]` spec into
 * the JS value CPython's `gen.py` would build for the same spec; the
 * FNV-1a hashes in judge/context.js prove the two agree.
 */

const DEFAULT_STEP = 1;
const DEFAULT_START = 0;
const DEFAULT_REVERSE = false;

function genRange({ start,stop,step = DEFAULT_STEP }) {
const values = [];
for (let value = start; step > 0 ? value < stop :value > stop; value += step) values.push(value);
return values;
}
function genSawtooth({ size,top,period }) {
const values = [];
for (let i = 0; i < size; i += 1) values.push(top - (i % period));
return values;
}
function genTextCycle({ size,first,count,reverse = DEFAULT_REVERSE }) {
let text = '';
for (let i = 0; i < size; i += 1) text += String.fromCharCode(first + (i % count));
return reverse ? Array.from(text).reverse().join('') :text;
}
function genTextRepeat({ parts }) {
return parts.map(([text,times]) => text.repeat(times)).join('');
}
function genCycleList({ items,size }) {
const values = [];
for (let i = 0; i < size; i += 1) values.push(items[i % items.length]);
return values;
}
function genRepeat({ value,size }) {
return new Array(size).fill(value);
}
function genGridRange({ rows,cols,start = DEFAULT_START,step = DEFAULT_STEP }) {
const grid = [];
for (let row = 0; row < rows; row += 1) {
const line = [];
for (let col = 0; col < cols; col += 1) line.push(start + (row * cols + col) * step);
grid.push(line);
}
return grid;
}
function genRotate({ of,by }) {
const values = resolveMaxArg(of);
return values.slice(by).concat(values.slice(0,by));
}
function genConst({ value }) {
return value;
}
const MAX_ARG_GENERATORS = {
range:genRange,
sawtooth:genSawtooth,
text_cycle:genTextCycle,
text_repeat:genTextRepeat,
cycle_list:genCycleList,
repeat:genRepeat,
grid_range:genGridRange,
rotate:genRotate,
const:genConst,
};

/**
 * Resolves one `max.args[i]` DSL spec into its JS value.
 * @param {{gen:string}} argSpec - one entry of `problem.max.args`
 * @returns {*} a Python-value-shaped JS value (number, string, or array)
 */
function resolveMaxArg(argSpec) {
return MAX_ARG_GENERATORS[argSpec.gen](argSpec);
}

/**
 * Resolves every entry of `problem.max.args` into the max test's argument list.
 * @param {Array<{gen:string}>} argSpecs - `problem.max.args`
 * @returns {Array<*>} the arguments to call the compiled line with
 */
function maxTestArgs(argSpecs) {
return argSpecs.map(resolveMaxArg);
}

export { maxTestArgs, resolveMaxArg, MAX_ARG_GENERATORS };

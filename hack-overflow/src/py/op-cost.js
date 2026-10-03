import { pyType } from './value-types.js';
import { pySize, hasPySize } from './size.js';

const LINEAR_METHODS = new Set(['count','index','remove','insert']);
const SEQUENCE_TYPES = new Set(['list','tuple','str']);
const ITERABLE_BUILTINS = new Set(['min','max','sum','any','all','list','set','tuple','sorted']);
function containsCost(container) {
return SEQUENCE_TYPES.has(pyType(container)) ? pySize(container) :1;
}
const GROWTH_METHODS = new Set(['extend']);
function methodCost(receiver,name,positionalArgs) {
if (GROWTH_METHODS.has(name) && pyType(receiver) === 'list') {
const [argument] = positionalArgs;
return hasPySize(argument) ? pySize(argument) :1;
}
const isSequence = SEQUENCE_TYPES.has(pyType(receiver));
const linear = LINEAR_METHODS.has(name) && isSequence;
const popped = name === 'pop' && positionalArgs.length > 0 && pyType(receiver) === 'list';
return linear || popped ? pySize(receiver) :1;
}
function augAddCost(current,addend) {
if (!SEQUENCE_TYPES.has(pyType(current))) return 0;
return hasPySize(addend) ? pySize(addend) :1;
}
function sortedCost(size) {
return size > 1 ? size * Math.ceil(Math.log2(size)) :size;
}
function takesSingleIterableArg(name,positionalArgs) {
return name === 'sum' ? positionalArgs.length >= 1 :positionalArgs.length === 1;
}
function builtinCost(name,positionalArgs) {
if (!ITERABLE_BUILTINS.has(name) || !takesSingleIterableArg(name,positionalArgs)) return 1;
const [argument] = positionalArgs;
const size = hasPySize(argument) ? pySize(argument) :1;
return name === 'sorted' ? sortedCost(size) :size;
}
function sliceResultCost(result) {
return pySize(result);
}

export { containsCost, methodCost, builtinCost, sliceResultCost, augAddCost };

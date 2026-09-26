import { NONE, pyType } from './value-types.js';
import { dictLookup, dictDelete, setAdd, setRemove } from './containers.js';
import { pyEquals } from './compare.js';
import { pyRepr } from './repr.js';
import { PyError } from './errors.js';
import { iterableItems } from './run-iterable.js';
import { noAttributeMessage, methodArgCountMessage } from './error-messages.js';

const LIST_INDEX_NOT_FOUND_MESSAGE = 'list.index(x): x not in list';
const POP_FROM_EMPTY_MESSAGE = 'pop from empty list';
const POP_INDEX_OUT_OF_RANGE_MESSAGE = 'pop index out of range';
const EXACTLY_ONE_ARG = 1;
/** `[1].append()`/`[1].append(1, 2)`: `list.append`/`list.count` each take exactly one argument. */
function requireOneArg(qualifiedName,args) {
if (args.length !== EXACTLY_ONE_ARG) throw new PyError('TypeError',methodArgCountMessage(qualifiedName,args.length));
}
function listAppend(receiver,args) {
requireOneArg('list.append',args);
receiver.push(args[0]);
return NONE;
}
function listExtend(receiver,args) {
requireOneArg('list.extend',args);
receiver.push(...iterableItems(args[0]));
return NONE;
}
function popIndex(receiver,args) {
const raw = args.length > 0 ? Number(args[0]) :-1;
return raw < 0 ? raw + receiver.length :raw;
}
function listPop(receiver,args) {
if (receiver.length === 0) throw new PyError('IndexError',POP_FROM_EMPTY_MESSAGE);
const index = popIndex(receiver,args);
if (index < 0 || index >= receiver.length) throw new PyError('IndexError',POP_INDEX_OUT_OF_RANGE_MESSAGE);
return receiver.splice(index,1)[0];
}
function sameListItem(item,target) {
return typeof item === 'number' && typeof target === 'number' ? item === target :pyEquals(item,target);
}
function listCount(receiver,args) {
requireOneArg('list.count',args);
let count = 0;
for (let index = 0; index < receiver.length; index += 1) {
if (sameListItem(receiver[index],args[0])) count += 1;
}
return count;
}
function listIndex(receiver,args) {
for (let index = 0; index < receiver.length; index += 1) {
if (sameListItem(receiver[index],args[0])) return index;
}
throw new PyError('ValueError',LIST_INDEX_NOT_FOUND_MESSAGE);
}
function setAddMethod(receiver,args) {
setAdd(receiver,args[0]);
return NONE;
}
function setRemoveMethod(receiver,args) {
if (!setRemove(receiver,args[0])) throw new PyError('KeyError',pyRepr(args[0]));
return NONE;
}
function dictGet(receiver,args) {
const { found,value } = dictLookup(receiver,args[0]);
if (found) return value;
return args.length > 1 ? args[1] :NONE;
}
function dictPop(receiver,args) {
const { found,value } = dictLookup(receiver,args[0]);
if (found) { dictDelete(receiver,args[0]); return value; }
if (args.length > 1) return args[1];
throw new PyError('KeyError',pyRepr(args[0]));
}
function countSubstring(text,sub) {
if (sub.length === 0) return text.length + 1;
let count = 0;
let index = 0;
for (let found = text.indexOf(sub,index); found !== -1; found = text.indexOf(sub,index)) {
count += 1;
index = found + sub.length;
}
return count;
}
function strCount(receiver,args) {
return countSubstring(receiver,args[0]);
}
/** Unicode-aware `str.isalnum()`: true only for a non-empty string of letters/digits. Our content is ASCII, so the ASCII case is exact CPython; broader Unicode uses the `\p{L}\p{N}` approximation (see content/README.md). */
const ALNUM_RE = /^[\p{L}\p{N}]+$/u;
function strIsalnum(receiver) {
return ALNUM_RE.test(receiver);
}
function strLower(receiver) {
return receiver.toLowerCase();
}
const METHODS = {
list:{ append:listAppend,extend:listExtend,pop:listPop,count:listCount,index:listIndex },
set:{ add:setAddMethod,remove:setRemoveMethod },
dict:{ get:dictGet,pop:dictPop },
str:{ count:strCount,isalnum:strIsalnum,lower:strLower },
};
function findMethod(receiver,name) {
const group = METHODS[pyType(receiver)];
const method = group && group[name];
if (!method) throw new PyError('AttributeError',noAttributeMessage(receiver,name));
return method;
}

export { findMethod };

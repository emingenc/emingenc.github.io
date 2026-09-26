import { PyTuple } from '../py/value-types.js';

const FNV_OFFSET = 2166136261;
const FNV_PRIME = 16777619;
function fnvHash(text) {
let digest = FNV_OFFSET;
for (let i = 0; i < text.length; i += 1) digest = Math.imul(digest ^ text.charCodeAt(i),FNV_PRIME) >>> 0;
return digest;
}
function toJsonValue(value) {
if (Array.isArray(value)) return value.map(toJsonValue);
if (value instanceof PyTuple) return value.items.map(toJsonValue);
return value;
}
function jsonHash(value) {
return fnvHash(JSON.stringify(toJsonValue(value)));
}

export { fnvHash, jsonHash, toJsonValue };

import { EXT_FIELDS,LIMITS,isId } from './index.js';

const CHAIN_STEPS = 5;

function repairOf(key) {
return EXT_FIELDS.find((field) => field.KEY === key).repair;
}
function hasListed(ext,key,id) {
return repairOf(key)(ext && ext[key]).includes(id);
}
function withListed(ext,key,id) {
if (!isId(id) || hasListed(ext,key,id)) return ext;
return { ...ext,[key]:[...repairOf(key)(ext[key]),id].slice(-LIMITS[key]) };
}
function hasBadge(ext,id) {
return hasListed(ext,'badges',id);
}
function withBadge(ext,id) {
return withListed(ext,'badges',id);
}
function hasCosmetic(ext,id) {
return hasListed(ext,'cosmetics',id);
}
function withCosmetic(ext,id) {
return withListed(ext,'cosmetics',id);
}
function chainSteps(ext) {
const bits = repairOf('chain')(ext && ext.chain);
return Array.from({ length: CHAIN_STEPS },(unused,step) => (bits & (1 << step)) !== 0);
}
function withChainStep(ext,step) {
if (!Number.isInteger(step) || step < 0 || step >= CHAIN_STEPS || chainSteps(ext)[step]) return ext;
return { ...ext,chain:repairOf('chain')(ext.chain) | (1 << step) };
}

export { chainSteps,hasBadge,hasCosmetic,withBadge,withChainStep,withCosmetic };

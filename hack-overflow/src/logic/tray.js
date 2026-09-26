const TRAY_HASH_OFFSET = 2166136261;
const TRAY_HASH_PRIME = 16777619;
function hashStr(text) {
let digest = TRAY_HASH_OFFSET;
for (let i = 0; i < text.length; i += 1) {
digest ^= text.charCodeAt(i);
digest = Math.imul(digest,TRAY_HASH_PRIME);
}
return digest >>> 0;
}
const MULBERRY32_INCREMENT = 0x6d2b79f5;
const MULBERRY32_MIX_SHIFT_1 = 15;
const MULBERRY32_MIX_SHIFT_2 = 7;
const MULBERRY32_MIX_SHIFT_3 = 14;
const MULBERRY32_MIX_MASK = 61;
const UINT32_SPAN = 4294967296;
function mulberry32(seed) {
let state = seed >>> 0;
return function nextRandom() {
state = (state + MULBERRY32_INCREMENT) | 0;
let mixed = Math.imul(state ^ (state >>> MULBERRY32_MIX_SHIFT_1),1 | state);
mixed = (mixed + Math.imul(mixed ^ (mixed >>> MULBERRY32_MIX_SHIFT_2),MULBERRY32_MIX_MASK | mixed)) ^ mixed;
return ((mixed ^ (mixed >>> MULBERRY32_MIX_SHIFT_3)) >>> 0) / UINT32_SPAN;
};
}
function seededPermutation(count,seedText) {
const randomNext = mulberry32(hashStr(seedText));
const indices = [];
for (let i = 0; i < count; i += 1) indices.push(i);
for (let i = count - 1; i > 0; i -= 1) {
const j = Math.floor(randomNext() * (i + 1));
const swap = indices[i];
indices[i] = indices[j];
indices[j] = swap;
}
return indices;
}
function traySeed(problem,day,attempt) {
return `${problem.key}:tray:${day}:${attempt}`;
}
function buildTray(problem,day,attempt) {
const order = seededPermutation(problem.palette.length,traySeed(problem,day,attempt));
return { order,labels:order.map((paletteIndex) => problem.palette[paletteIndex]) };
}

export { hashStr, mulberry32, seededPermutation, buildTray };

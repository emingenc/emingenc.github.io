import { prng } from './turret-stream.js';


const GENERATE_LIMIT = 300000;
const caches = new Map();

function collectPool(where,rules) {
const key = where.tag + ':' + where.seed + ':' + where.size;
if (caches.has(key)) return caches.get(key);
const next = prng(where.seed);
const seen = new Set();
const out = [];
for (let tries = 0; out.length < where.size && tries < (where.limit ?? GENERATE_LIMIT); tries += 1) {
const item = rules.candidate(next,out.length);
const id = rules.id(item);
if (!seen.has(id) && !rules.why(item)) {
seen.add(id);
out.push(item);
}
}
caches.set(key,out);
return out;
}
function randomMoveBot(seed,movesOf) {
const next = prng(seed);
return function choose(state) {
const moves = movesOf(state);
return moves[Math.floor(next() * moves.length)];
};
}

export { collectPool,randomMoveBot };

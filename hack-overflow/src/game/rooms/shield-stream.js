import { POOL,SHIELD_W1 } from './data/shield-wave1.js';
import { judgeVolley } from './shield.js';
import { pickStream,prng } from './turret-stream.js';


const PLAIN = '(';
const MIXED = '([';
const ANY_GLYPH = '()[]';
const SWAP = { ')':']',']':')' };
const CLOSERS = new Set([')',']']);
const KINDS = ['(','['];
const CLOSE_BIAS = 0.5;
const MIN_VALID = 2;
const RETRY_LIMIT = 60;
const GENERATE_LIMIT = 300000;
const MIXED_SLOT = { types:MIXED,kinds:['valid','cross','stray'] };
const SLOTS = [
{ types:PLAIN,kinds:['valid'] },
{ types:PLAIN,kinds:['leftover'] },
MIXED_SLOT,
MIXED_SLOT,
MIXED_SLOT,
MIXED_SLOT,
];

function choose(next,list) {
return list[Math.floor(next() * list.length)];
}
function counterVerdict(volley) {
let depth = 0;
for (const glyph of volley) {
depth += CLOSERS.has(glyph) ? -1 :1;
if (depth < 0) return false;
}
return depth === 0;
}
function validVolley(next,types) {
const stack = [];
let text = '';
while (text.length < SHIELD_W1.length) {
const left = SHIELD_W1.length - text.length;
const mustClose = stack.length === left;
const closes = stack.length > 0 && (mustClose || next() < CLOSE_BIAS);
if (closes) {
text += stack.pop() === '(' ? ')' :']';
} else {
const opener = choose(next,types.split(''));
stack.push(opener);
text += opener;
}
}
return text;
}
function replaceAt(text,index,glyph) {
return text.slice(0,index) + glyph + text.slice(index + 1);
}
function crossIndexes(text) {
return [...text].flatMap((glyph,index) => (CLOSERS.has(glyph) && SWAP[glyph] === text[index + 1] ? [index] :[]));
}
const MAKERS = {
valid:(next,types) => validVolley(next,types),
leftover:(next,types) => {
const text = validVolley(next,types);
return replaceAt(text,text.length - 1,choose(next,types.split('')));
},
cross:(next,types) => {
const text = validVolley(next,types);
const spots = crossIndexes(text);
if (spots.length === 0) return text;
const at = choose(next,spots);
return replaceAt(replaceAt(text,at,text[at + 1]),at + 1,text[at]);
},
stray:(next,types) => {
const text = validVolley(next,types);
return replaceAt(text,Math.floor(next() * text.length),choose(next,ANY_GLYPH.split('')));
},
};
const WANTED = {
valid:(text,types) => judgeVolley(text).valid && types.split('').every((kind) => types === PLAIN || text.includes(kind)),
leftover:(text) => judgeVolley(text).reason === 'leftover',
cross:(text) => counterVerdict(text) && judgeVolley(text).reason === 'mismatch',
stray:(text) => judgeVolley(text).reason === 'mismatch',
};
function makeVolley(next,slot) {
const kind = choose(next,slot.kinds);
let text = MAKERS[kind](next,slot.types);
for (let tries = 0; tries < RETRY_LIMIT && !WANTED[kind](text,slot.types); tries += 1) text = MAKERS[kind](next,slot.types);
return text;
}
function hasBrackets(volley) {
return volley.includes('[') || volley.includes(']');
}
function shapeProblem(wave) {
if (wave.length !== SHIELD_W1.volleys) return 'volley count';
const short = wave.findIndex((volley) => volley.length !== SHIELD_W1.length);
if (short >= 0) return 'length at volley ' + (short + 1);
const early = wave.findIndex((volley,index) => index < SHIELD_W1.plainVolleys && hasBrackets(volley));
if (early >= 0) return 'brackets before the mixed half at volley ' + (early + 1);
const mixed = wave.slice(SHIELD_W1.plainVolleys).join('');
return mixed.includes('[') && mixed.includes('(') ? '' :'the mixed half needs both kinds';
}
function playProblem(wave) {
const verdicts = wave.map(judgeVolley);
if (!wave.some((volley) => counterVerdict(volley) && judgeVolley(volley).reason === 'mismatch')) return 'no crossed volley a counter passes';
if (verdicts.filter((verdict) => verdict.reason === 'mismatch').length < SHIELD_W1.integrity) return 'too few mismatches for a counter to lose';
if (verdicts.filter((verdict) => verdict.valid).length < MIN_VALID) return 'too few valid volleys';
if (!verdicts.some((verdict) => verdict.reason === 'leftover')) return 'no leftover volley';
return new Set(wave).size === wave.length ? '' :'a volley repeats';
}
function waveWhy(wave) {
return shapeProblem(wave) || playProblem(wave);
}
const poolCache = new Map();
function buildPool(seed = POOL.seed,size = POOL.size) {
const key = seed + ':' + size;
if (poolCache.has(key)) return poolCache.get(key);
const next = prng(seed);
const seen = new Set();
const out = [];
for (let tries = 0; out.length < size && tries < GENERATE_LIMIT; tries += 1) {
const wave = SLOTS.map((slot) => makeVolley(next,slot));
const id = wave.join(',');
if (!seen.has(id) && !waveWhy(wave)) {
seen.add(id);
out.push(wave);
}
}
poolCache.set(key,out);
return out;
}
function pickWave(pool,lastIndex,next) {
const picked = pickStream(pool,lastIndex,next);
return { wave:picked.stream,index:picked.index };
}

export { buildPool,pickWave,waveWhy,counterVerdict };

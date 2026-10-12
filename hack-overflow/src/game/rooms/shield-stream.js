import { POOL,SHIELD_W1 } from './data/shield-wave1.js';
import { W1_SPEC,W2_SPEC } from './data/shield-waves.js';
import { judgeVolley } from './shield.js';
import { collectPool } from './pool-util.js';
import { pickStream } from './turret-stream.js';


const PLAIN = '(';
const MIXED = '([';
const THREE = '([{';
const CLOSER_OF = { '(':')','[':']','{':'}' };
const CLOSERS = new Set(Object.values(CLOSER_OF));
const CLOSE_BIAS = 0.5;
const MIN_VALID = 2;
const RETRY_LIMIT = 60;
const MIXED_SLOT = { types:MIXED,kinds:['valid','cross','stray'] };
const SLOTS = [
{ types:PLAIN,kinds:['valid'] },
{ types:PLAIN,kinds:['leftover'] },
MIXED_SLOT,
MIXED_SLOT,
MIXED_SLOT,
MIXED_SLOT,
];
const THREE_SLOT = { types:THREE,kinds:['valid','cross','stray'] };
const SLOTS_W2 = [
{ types:THREE,kinds:['valid'] },
{ types:THREE,kinds:['leftover'] },
THREE_SLOT,
THREE_SLOT,
THREE_SLOT,
THREE_SLOT,
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
function validVolley(next,types,length) {
const stack = [];
let text = '';
while (text.length < length) {
const left = length - text.length;
const mustClose = stack.length === left;
const closes = stack.length > 0 && (mustClose || next() < CLOSE_BIAS);
if (closes) {
text += CLOSER_OF[stack.pop()];
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
return [...text].flatMap((glyph,index) => (CLOSERS.has(glyph) && CLOSERS.has(text[index + 1]) && glyph !== text[index + 1] ? [index] :[]));
}
function anyGlyph(types) {
return [...types].flatMap((opener) => [opener,CLOSER_OF[opener]]);
}
const MAKERS = {
valid:(next,types,length) => validVolley(next,types,length),
leftover:(next,types,length) => {
const text = validVolley(next,types,length);
return replaceAt(text,text.length - 1,choose(next,types.split('')));
},
cross:(next,types,length) => {
const text = validVolley(next,types,length);
const spots = crossIndexes(text);
if (spots.length === 0) return text;
const at = choose(next,spots);
return replaceAt(replaceAt(text,at,text[at + 1]),at + 1,text[at]);
},
stray:(next,types,length) => {
const text = validVolley(next,types,length);
return replaceAt(text,Math.floor(next() * text.length),choose(next,anyGlyph(types)));
},
};
const WANTED = {
valid:(text,types) => judgeVolley(text).valid && types.split('').every((kind) => types === PLAIN || text.includes(kind)),
leftover:(text) => judgeVolley(text).reason === 'leftover',
cross:(text) => counterVerdict(text) && judgeVolley(text).reason === 'mismatch',
stray:(text) => judgeVolley(text).reason === 'mismatch',
};
function makeVolley(next,slot,length) {
const kind = choose(next,slot.kinds);
let text = MAKERS[kind](next,slot.types,length);
for (let tries = 0; tries < RETRY_LIMIT && !WANTED[kind](text,slot.types); tries += 1) text = MAKERS[kind](next,slot.types,length);
return text;
}
function hasBrackets(volley) {
return volley.includes('[') || volley.includes(']');
}
function sizeProblem(wave,spec) {
if (wave.length !== spec.volleys) return 'volley count';
const short = wave.findIndex((volley) => volley.length !== spec.length);
return short >= 0 ? 'length at volley ' + (short + 1) :'';
}
function shapeProblem(wave) {
const size = sizeProblem(wave,W1_SPEC);
if (size) return size;
const early = wave.findIndex((volley,index) => index < SHIELD_W1.plainVolleys && hasBrackets(volley));
if (early >= 0) return 'brackets before the mixed half at volley ' + (early + 1);
const mixed = wave.slice(SHIELD_W1.plainVolleys).join('');
return mixed.includes('[') && mixed.includes('(') ? '' :'the mixed half needs both kinds';
}
function shapeProblemW2(wave) {
const size = sizeProblem(wave,W2_SPEC);
if (size) return size;
const all = wave.join('');
return [...W2_SPEC.types].every((opener) => all.includes(opener)) ? '' :'all three kinds must appear';
}
function playProblem(wave,spec) {
const verdicts = wave.map(judgeVolley);
if (!wave.some((volley) => counterVerdict(volley) && judgeVolley(volley).reason === 'mismatch')) return 'no crossed volley a counter passes';
if (verdicts.filter((verdict) => verdict.reason === 'mismatch').length < spec.integrity) return 'too few mismatches for a counter to lose';
if (verdicts.filter((verdict) => verdict.valid).length < MIN_VALID) return 'too few valid volleys';
if (!verdicts.some((verdict) => verdict.reason === 'leftover')) return 'no leftover volley';
return new Set(wave).size === wave.length ? '' :'a volley repeats';
}
function waveWhy(wave) {
return shapeProblem(wave) || playProblem(wave,W1_SPEC);
}
function waveW2Why(wave) {
return shapeProblemW2(wave) || playProblem(wave,W2_SPEC);
}
const FAMILIES = {
w1:{ slots:SLOTS,length:W1_SPEC.length,why:waveWhy },
w2:{ slots:SLOTS_W2,length:W2_SPEC.length,why:waveW2Why },
};
function poolOf(id,seed,size) {
const { slots,length,why } = FAMILIES[id];
const candidate = (next) => slots.map((slot) => makeVolley(next,slot,length));
return collectPool({ tag:'shield-' + id,seed,size },{ candidate,why,id:(wave) => wave.join(',') });
}
function buildPool(seed = POOL.seed,size = POOL.size) {
return poolOf('w1',seed,size);
}
function buildW2Pool(seed,size) {
return poolOf('w2',seed,size);
}
function pickWave(pool,lastIndex,next) {
const picked = pickStream(pool,lastIndex,next);
return { wave:picked.stream,index:picked.index };
}

export { buildPool,buildW2Pool,pickWave,waveWhy,waveW2Why,counterVerdict };

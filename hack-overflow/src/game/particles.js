import { lerp } from './ease.js';


const PARTICLE_CAP = 200;
const MS_PER_SECOND = 1000;
const FULL_TURN = 2 * Math.PI;
const HALF = 0.5;
const TWINKLE = { floor:0.35,minRate:14,maxRate:26 };
const PRNG = { increment:0x6d2b79f5,shiftA:15,shiftB:7,shiftC:14,oddMix:61,range:4294967296 };

const PARTICLE_KINDS = {
sparkle:{
count:18,spread:0.4,speedMin:2.2,speedMax:4.2,heading:0,arc:1,drag:4,gravity:-2.4,lifeMin:520,lifeMax:900,
sizeMin:0.12,sizeMax:0.2,sizeEnd:0.45,shape:'plus',twinkle:true,colors:['bright','primary','text'],
},
dust:{
count:10,spread:0.45,speedMin:0.5,speedMax:1.4,heading:0,arc:1,drag:3,gravity:1.6,lifeMin:550,lifeMax:950,
sizeMin:0.09,sizeMax:0.18,sizeEnd:0.6,shape:'square',twinkle:false,colors:['dim','text','bright'],
},
burst:{
count:40,spread:0.1,speedMin:2,speedMax:5,heading:0,arc:1,drag:2.2,gravity:0,lifeMin:600,lifeMax:1000,
sizeMin:0.1,sizeMax:0.18,sizeEnd:0.3,shape:'square',twinkle:false,colors:['primary','bright','text'],
},
confetti:{
count:72,spread:0.2,speedMin:4,speedMax:11,heading:-0.25,arc:0.6,drag:1.8,gravity:7,lifeMin:800,lifeMax:1040,
sizeMin:0.1,sizeMax:0.22,sizeEnd:0.6,shape:'square',twinkle:true,colors:['primary','bright','cyan','amber','text'],
},
ring:{
count:1,spread:0,speedMin:0,speedMax:0,heading:0,arc:1,drag:0,gravity:0,lifeMin:420,lifeMax:520,
sizeMin:0.5,sizeMax:0.6,sizeEnd:9,shape:'ring',twinkle:false,colors:['bright'],
},
pop:{
count:1,spread:0,speedMin:0,speedMax:0,heading:0,arc:1,drag:0,gravity:0,lifeMin:320,lifeMax:380,
sizeMin:0.35,sizeMax:0.4,sizeEnd:3.2,shape:'ring',twinkle:false,colors:['bright'],
},
};

function seededRandom(seed) {
let state = seed >>> 0;
return function next() {
state = (state + PRNG.increment) | 0;
let mixed = Math.imul(state ^ (state >>> PRNG.shiftA),state | 1);
mixed ^= mixed + Math.imul(mixed ^ (mixed >>> PRNG.shiftB),mixed | PRNG.oddMix);
return ((mixed ^ (mixed >>> PRNG.shiftC)) >>> 0) / PRNG.range;
};
}
function recipeFor(kind) {
if (!Object.hasOwn(PARTICLE_KINDS,kind)) throw new Error('particles: unknown kind "' + kind + '"');
return PARTICLE_KINDS[kind];
}
function between(random,min,max) {
return min + (max - min) * random();
}
function launch(recipe,origin,random) {
const col0 = origin.col + (random() * 2 - 1) * recipe.spread;
const row0 = origin.row + (random() * 2 - 1) * recipe.spread;
const angle = (recipe.heading + (random() - HALF) * recipe.arc) * FULL_TURN;
const speed = between(random,recipe.speedMin,recipe.speedMax);
return { col0,row0,vcol:Math.cos(angle) * speed,vrow:Math.sin(angle) * speed };
}
function looks(recipe,colors,random) {
return {
color:colors[Math.floor(random() * colors.length)],
lifeMs:Math.round(between(random,recipe.lifeMin,recipe.lifeMax)),
size0:between(random,recipe.sizeMin,recipe.sizeMax),
twinkleRate:recipe.twinkle ? between(random,TWINKLE.minRate,TWINKLE.maxRate) :0,
};
}
function newParticle(emission,recipe,random) {
const start = launch(recipe,emission.origin,random);
const look = looks(recipe,emission.colors || recipe.colors,random);
return {
kind:emission.kind,shape:recipe.shape,bornMs:emission.atMs,drag:recipe.drag,gravity:recipe.gravity,sizeEnd:recipe.sizeEnd,
...start,...look,col:start.col0,row:start.row0,alpha:1,size:look.size0,
};
}
function spawnParticles(pool,emission) {
const recipe = recipeFor(emission.kind);
const random = seededRandom(emission.seed);
const count = Math.min(PARTICLE_CAP,emission.count === undefined ? recipe.count :emission.count);
const born = Array.from({ length:count },() => newParticle(emission,recipe,random));
return [...pool,...born].slice(-PARTICLE_CAP);
}
function particleAlive(particle,nowMs) {
return nowMs - particle.bornMs < particle.lifeMs;
}
function glideOf(particle,seconds) {
return particle.drag > 0 ? (1 - Math.exp(-particle.drag * seconds)) / particle.drag :seconds;
}
function alphaOf(particle,progress,seconds) {
const fade = 1 - progress * progress;
if (!particle.twinkleRate) return fade;
return fade * (TWINKLE.floor + (1 - TWINKLE.floor) * Math.abs(Math.cos(seconds * particle.twinkleRate)));
}
function movedTo(particle,nowMs) {
const ageMs = nowMs - particle.bornMs;
if (ageMs < 0) return { ...particle,col:particle.col0,row:particle.row0,alpha:0,size:particle.size0 };
const seconds = ageMs / MS_PER_SECOND;
const glide = glideOf(particle,seconds);
const progress = ageMs / particle.lifeMs;
return {
...particle,
col:particle.col0 + particle.vcol * glide,
row:particle.row0 + particle.vrow * glide + particle.gravity * seconds * seconds / 2,
alpha:alphaOf(particle,progress,seconds),
size:particle.size0 * lerp(1,particle.sizeEnd,progress),
};
}
function updateParticles(pool,nowMs) {
return pool.filter((particle) => particleAlive(particle,nowMs)).map((particle) => movedTo(particle,nowMs));
}

export { PARTICLE_CAP, PARTICLE_KINDS, seededRandom, spawnParticles, particleAlive, updateParticles };

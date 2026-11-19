import { clamp01,easeOutCubic,lerp } from './ease.js';


const TRACER_FLIGHT_MS = 108;
const FULL = 1;
const HALF = 0.5;
const MS_PER_SECOND = 1000;
const NOISE = { scale:12.9898,mix:43758.5453 };
const HURT = { ms:110,flashMs:100,pushTiles:0.07,flash:0.9 };
const STRIKE = { lungeMs:110,lungeTiles:0.35,recoilMs:130,recoilTiles:0.15,peak:0.3 };
const WINDUP = { rampMs:700,scale:0.08,jitterTiles:0.025,stepMs:45,rate:0.012 };
const REDUCED_FLASH_MS = 120;
const FLASH_FALL = 0.65;
const SHRINK_TO = 0.55;
const DROP_TILES = 0.1;
const FADE_POWER = 1.5;
const TIERS = {
small:{ holdMs:70,fadeMs:200,squash:0.12,jitterTiles:0.035,count:14,rings:1,shake:null },
medium:{ holdMs:80,fadeMs:260,squash:0.12,jitterTiles:0.04,count:18,rings:1,shake:null },
big:{ holdMs:130,fadeMs:380,squash:0.14,jitterTiles:0.05,count:26,rings:2,shake:'killBig' },
};
const KILL_STYLES = {
crate:{ tier:'small',colors:['amber','dim'],debris:true },
mite:{ tier:'small',colors:['amber','bright'],debris:false },
armored:{ tier:'small',colors:['cyan','bright'],debris:false },
drone:{ tier:'medium',colors:['cyan','bright','text'],debris:false },
sentinel:{ tier:'big',colors:['magenta','red','bright'],debris:false },
};
const PLAIN_STYLE = { tier:'small',colors:['amber','bright'],debris:false };
const CRATE = { crackMs:120,debrisMs:560,pieces:6,cols:3,rows:2,flashMs:45,jitterTiles:0.045,gravity:6,fling:1.5,away:1,spin:7,inner:0.8,pad:0.1 };
const SPRAY = { share:0.65,arc:0.6,embers:3,ringGapMs:90,dust:8 };
const FLASH = { peak:0.45,impactMs:50,ms:300,steady:0.3 };
const DEAD_STILL = { shown:false,flash:0,sx:1,sy:1,alpha:0,drop:0,jx:0,jy:0,debris:-1 };

function noise(step) {
const value = Math.sin(step * NOISE.scale) * NOISE.mix;
return value - Math.floor(value) - HALF;
}
function jitterOf(now,tiles) {
const step = Math.floor(now / WINDUP.stepMs);
return { jx:noise(step) * 2 * tiles,jy:noise(step + 1) * 2 * tiles };
}
function killStyle(kind) {
return Object.hasOwn(KILL_STYLES,kind) ? KILL_STYLES[kind] :PLAIN_STYLE;
}
function tierOf(kind) {
return TIERS[killStyle(kind).tier];
}
function awayUnit(foe,hero) {
const dx = foe.col - hero.col;
const dy = foe.row - hero.row;
const length = Math.hypot(dx,dy);
return length === 0 ? { x:1,y:0 } :{ x:dx / length,y:dy / length };
}
function headingOf(unit) {
return Math.atan2(unit.y,unit.x) / (Math.PI * 2);
}
function hurtPose(age,reduced) {
if (age < 0 || age >= HURT.ms) return { flash:0,push:0 };
if (reduced) return { flash:age < HURT.flashMs ? HURT.flash :0,push:0 };
const left = FULL - age / HURT.ms;
return { flash:age < HURT.flashMs ? HURT.flash * left : 0,push:HURT.pushTiles * left * left };
}
function there(age,span) {
if (age < 0 || age >= span) return 0;
const share = age / span;
return share < STRIKE.peak ? easeOutCubic(share / STRIKE.peak) :FULL - (share - STRIKE.peak) / (FULL - STRIKE.peak);
}
function strikeShift(kind,when) {
if (when.reduced) return 0;
if (kind === 'mite') return -STRIKE.lungeTiles * there(when.age,STRIKE.lungeMs);
return STRIKE.recoilTiles * there(when.age,STRIKE.recoilMs);
}
function windupPose(clock,reduced) {
if (reduced) return { scale:1,jx:0,jy:0 };
const grow = clamp01((clock.now - clock.since) / WINDUP.rampMs);
const pulse = HALF + HALF * Math.sin(clock.now * WINDUP.rate * Math.PI * 2);
return { scale:1 + WINDUP.scale * grow * pulse,...jitterOf(clock.now,WINDUP.jitterTiles * grow) };
}
function crackPose(age,reduced) {
const flash = age < CRATE.flashMs ? HURT.flash :0;
const shown = age < CRATE.crackMs;
const flying = !shown && age < CRATE.crackMs + CRATE.debrisMs;
const shake = reduced ? { jx:0,jy:0 } :jitterOf(age,CRATE.jitterTiles);
return { ...DEAD_STILL,shown,flash,alpha:FULL,...shake,debris:flying ? (age - CRATE.crackMs) / CRATE.debrisMs :-1 };
}
function collapsePose(age,tier) {
const share = clamp01((age - tier.holdMs) / tier.fadeMs);
const shrink = lerp(FULL,SHRINK_TO,easeOutCubic(share));
const squash = tier.squash * (FULL - share);
return {
...DEAD_STILL,shown:share < FULL,flash:lerp(FULL,FLASH_FALL,share) * (FULL - share * share),sx:shrink * (FULL + squash),sy:shrink * (FULL - squash),
alpha:FULL - Math.pow(share,FADE_POWER),drop:DROP_TILES * share * share,
};
}
function holdPose(age,tier) {
return { ...DEAD_STILL,shown:true,flash:FULL,sx:FULL + tier.squash,sy:FULL - tier.squash,alpha:FULL,...jitterOf(age,tier.jitterTiles) };
}
function deathPose(age,foe) {
if (age < 0) return { ...DEAD_STILL,shown:true,sx:FULL,sy:FULL,alpha:FULL };
if (foe.reduced) return { ...DEAD_STILL,shown:age < REDUCED_FLASH_MS,flash:FULL,alpha:FULL };
if (killStyle(foe.kind).debris) return crackPose(age,foe.reduced);
const tier = tierOf(foe.kind);
return age < tier.holdMs ? holdPose(age,tier) :collapsePose(age,tier);
}
function deathSpan(kind) {
if (killStyle(kind).debris) return CRATE.crackMs + CRATE.debrisMs;
const tier = tierOf(kind);
return tier.holdMs + tier.fadeMs;
}
function debrisPiece(index,flight) {
const col = index % CRATE.cols;
const row = Math.floor(index / CRATE.cols);
const home = { x:(col - (CRATE.cols - 1) / 2) / CRATE.cols,y:(row - (CRATE.rows - 1) / 2) / CRATE.rows };
const length = Math.hypot(home.x,home.y) || FULL;
const seconds = flight.progress * CRATE.debrisMs / MS_PER_SECOND;
const side = index % 2 === 0 ? FULL : -FULL;
return {
x:home.x + (home.x / length * CRATE.fling + flight.away.x * CRATE.away) * seconds,
y:home.y + (home.y / length * CRATE.fling + flight.away.y * CRATE.away) * seconds + CRATE.gravity * seconds * seconds / 2,
turn:side * (CRATE.spin + index) * seconds,alpha:FULL - flight.progress * flight.progress,
};
}
function debrisSource(index) {
const wide = CRATE.inner / CRATE.cols;
const high = CRATE.inner / CRATE.rows;
return { x:CRATE.pad + (index % CRATE.cols) * wide,y:CRATE.pad + Math.floor(index / CRATE.cols) * high,w:wide,h:high };
}
function sprayOf(style,tier) {
const count = Math.round(tier.count * SPRAY.share);
return [
{ kind:'kill-burst',count,colors:style.colors,arc:SPRAY.arc,aimed:true,afterMs:0 },
{ kind:'kill-burst',count:tier.count - count,colors:style.colors,afterMs:0 },
{ kind:'ember',count:SPRAY.embers,colors:style.colors,aimed:true,afterMs:0 },
];
}
function ringsOf(tier) {
return Array.from({ length:tier.rings },function (ignored,index) { return { kind:'kill-ring',count:1,afterMs:index * SPRAY.ringGapMs }; });
}
function killEmissions(kind) {
const style = killStyle(kind);
if (!style.debris) return [...sprayOf(style,tierOf(kind)),...ringsOf(tierOf(kind))];
return [
{ kind:'dust',count:SPRAY.dust,colors:['dim','text'],afterMs:CRATE.crackMs },
{ kind:'ember',count:2,colors:style.colors,aimed:true,afterMs:CRATE.crackMs },
];
}
function flashAlpha(age,reduced) {
if (age < 0 || age >= FLASH.ms) return 0;
if (reduced) return FLASH.steady;
if (age < FLASH.impactMs) return FLASH.peak;
const left = FULL - (age - FLASH.impactMs) / (FLASH.ms - FLASH.impactMs);
return FLASH.peak * left * left;
}
function edgeWeights(from) {
const base = HALF;
if (!from) return { left:base,right:base,top:base,bottom:base };
return {
left:base + HALF * Math.max(0,-from.x),right:base + HALF * Math.max(0,from.x),
top:base + HALF * Math.max(0,-from.y),bottom:base + HALF * Math.max(0,from.y),
};
}

export {
TRACER_FLIGHT_MS,FLASH,CRATE,killStyle,tierOf,awayUnit,headingOf,hurtPose,strikeShift,windupPose,deathPose,deathSpan,debrisPiece,debrisSource,killEmissions,flashAlpha,edgeWeights,
};

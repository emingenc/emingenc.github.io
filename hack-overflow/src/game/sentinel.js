import { registerActorKind } from './actors.js';

const SENTINEL_HP = 3;
const SENTINEL_REGEN = 1;
const SENTINEL_ARM = 3;
const SENTINEL_DAMAGE = 1;

function createSentinel(spec) {
const hp = spec.hp ?? SENTINEL_HP;
return { id:spec.id,kind:'sentinel',col:spec.col,row:spec.row,hp,maxHp:hp,regen:spec.regen ?? SENTINEL_REGEN,windup:0,awake:true };
}
function isBeside(sentinel,hero) {
return Boolean(hero) && Math.abs(sentinel.col - hero.col) + Math.abs(sentinel.row - hero.row) === 1;
}
function windNext(windup) {
return windup === 0 ? SENTINEL_ARM - 1 :windup - 1;
}
function tickSentinel(sentinel,hero) {
const hp = Math.min(sentinel.maxHp,sentinel.hp + (sentinel.regen ?? SENTINEL_REGEN));
const beside = isBeside(sentinel,hero);
const windup = beside ? windNext(sentinel.windup) :0;
return { actor:{ ...sentinel,hp,windup },hits:beside && windup === 0 ? SENTINEL_DAMAGE :0 };
}
function intentOf(sentinel) {
return sentinel.windup > 0 ? { verb:'hits',inTicks:sentinel.windup } :null;
}
registerActorKind('sentinel',{
tick:tickSentinel,
intent:intentOf,
rearm:(sentinel) => ({ ...sentinel,hp:sentinel.maxHp,windup:0 }),
});

export { SENTINEL_HP, SENTINEL_REGEN, SENTINEL_ARM, SENTINEL_DAMAGE, createSentinel };

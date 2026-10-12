import { registerActorKind } from '../actors.js';

const ARMORED_KIND = 'armored';
const ARMORED_HP = 1;
const SHOW_PERIOD = 5;
const BOUNCE_TEXT = 'BOLT bounces. TAG it, then RECALL.';
const YOURS_TEXT = "That's yours now.";

function standing(mite,at,phase) {
const cell = mite.ring[at];
return { ...mite,at,phase,col:cell.col,row:cell.row,awake:phase === 0 };
}
function createArmored(spec) {
const mite = { id:spec.id,kind:ARMORED_KIND,col:0,row:0,hp:ARMORED_HP,awake:true,ring:spec.ring,at:0,phase:0,tagged:false };
return standing(mite,0,0);
}
function isArmored(actor) {
return actor.kind === ARMORED_KIND;
}
function stride(mite) {
return standing(mite,(mite.at + 1) % mite.ring.length,(mite.phase + 1) % SHOW_PERIOD);
}
function advanceArmored(actors) {
return actors.map((actor) => (isArmored(actor) && actor.hp > 0 ? stride(actor) :actor));
}
function markTagged(actors,id) {
const target = actors.find((actor) => actor.id === id && isArmored(actor));
if (!target) return actors;
return actors.map((actor) => (actor === target ? { ...actor,tagged:true } :actor));
}
function takeHit(mite,dmg) {
return mite.tagged ? { ...mite,hp:Math.max(0,mite.hp - dmg) } :mite;
}
registerActorKind(ARMORED_KIND,{
tick:(mite) => ({ actor:mite,hits:0 }),
hit:takeHit,
intent:() => null,
rearm:(mite) => mite,
});

export { ARMORED_HP, SHOW_PERIOD, BOUNCE_TEXT, YOURS_TEXT, createArmored, isArmored, advanceArmored, markTagged };

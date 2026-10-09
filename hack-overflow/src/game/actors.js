
const DRONE_ARM = 3;
const REVIVE_ARM = 4;
const DRONE_HP = 1;
const BOLT_RANGE = 6;
const CHARGED_DMG = 2;

function createDrone(spot) {
return { id:spot.id,kind:'drone',col:spot.col,row:spot.row,hp:DRONE_HP,arm:DRONE_ARM,awake:true };
}
function isLive(actor) {
return actor.hp > 0;
}
function isFoe(actor) {
return isLive(actor) && actor.awake;
}
function tickOne(actor) {
if (!isFoe(actor)) return actor;
return actor.arm > 1 ? { ...actor,arm:actor.arm - 1 } :{ ...actor,arm:DRONE_ARM };
}
function tickActors(actors) {
const hits = actors.filter((actor) => isFoe(actor) && actor.arm <= 1).length;
return { actors:actors.map(tickOne),hits };
}
function hitActor(actors,id,dmg) {
const target = actors.find((actor) => actor.id === id);
if (!target || !isLive(target)) return { actors,killed:false };
const hp = Math.max(0,target.hp - dmg);
return { actors:actors.map((actor) => (actor === target ? { ...actor,hp } :actor)),killed:hp === 0 };
}
function rearmActors(actors,arm) {
return actors.map((actor) => (isLive(actor) ? { ...actor,arm } :actor));
}
function reach(actor,pos) {
return Math.max(Math.abs(actor.col - pos.col),Math.abs(actor.row - pos.row));
}
function nearestAwakeFoe(actors,pos,range = BOLT_RANGE) {
const inRange = actors.filter((actor) => isFoe(actor) && reach(actor,pos) <= range);
return inRange.reduce((best,actor) => (best && reach(best,pos) <= reach(actor,pos) ? best :actor),null);
}
function actorAt(actors,cell) {
return actors.find((actor) => isLive(actor) && actor.col === cell.col && actor.row === cell.row) || null;
}
function actorIntent(actor) {
return { label:'fires in ' + actor.arm,n:actor.arm };
}

export { DRONE_ARM, REVIVE_ARM, DRONE_HP, BOLT_RANGE, CHARGED_DMG, createDrone, tickActors, rearmActors, hitActor, nearestAwakeFoe, actorAt, actorIntent };


const DRONE_KIND = 'drone';
const DRONE_ARM = 3;
const REVIVE_ARM = 4;
const DRONE_HP = 1;
const BOLT_RANGE = 6;
const CHARGED_DMG = 2;

function isLive(actor) {
return actor.hp > 0;
}
function isFoe(actor) {
return isLive(actor) && actor.awake;
}
function wound(actor,dmg) {
return { ...actor,hp:Math.max(0,actor.hp - dmg) };
}
const IGNORED = { tick:(actor) => ({ actor,hits:0 }),hit:(actor) => actor,intent:() => null,rearm:(actor) => actor };
const PLAIN = { ...IGNORED,hit:wound };
function tickDrone(actor) {
return { actor:{ ...actor,arm:actor.arm > 1 ? actor.arm - 1 :DRONE_ARM },hits:actor.arm > 1 ? 0 :1 };
}
const DRONE = { tick:tickDrone,intent:(actor) => ({ verb:'fires',inTicks:actor.arm }),rearm:(actor,arm) => ({ ...actor,arm }) };
const KINDS = new Map([[DRONE_KIND,DRONE],['mite',{}]]);

function registerActorKind(kind,handlers) {
KINDS.set(kind,handlers);
}
function handlersOf(actor) {
const handlers = KINDS.get(actor.kind ?? DRONE_KIND);
return handlers ? { ...PLAIN,...handlers } :IGNORED;
}
function createDrone(spot) {
return { id:spot.id,kind:DRONE_KIND,col:spot.col,row:spot.row,hp:DRONE_HP,arm:DRONE_ARM,awake:true };
}
function tickOne(actor,hero) {
if (!isFoe(actor)) return { actor,hits:0 };
return handlersOf(actor).tick(actor,hero);
}
function tickActors(actors,hero) {
const ticked = actors.map((actor) => tickOne(actor,hero));
const strikers = actors.filter((actor,index) => ticked[index].hits > 0).map((actor) => ({ col:actor.col,row:actor.row,kind:actor.kind ?? DRONE_KIND }));
return { actors:ticked.map((one) => one.actor),hits:ticked.reduce((sum,one) => sum + one.hits,0),strikers };
}
function hitActor(actors,id,dmg) {
const target = actors.find((actor) => actor.id === id);
if (!target || !isLive(target)) return { actors,killed:false };
const hurt = handlersOf(target).hit(target,dmg);
if (hurt === target) return { actors,killed:false };
return { actors:actors.map((actor) => (actor === target ? hurt :actor)),killed:hurt.hp === 0 };
}
function rearmActors(actors,arm) {
return actors.map((actor) => (isLive(actor) ? handlersOf(actor).rearm(actor,arm) :actor));
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
return isLive(actor) && !actor.harmless ? handlersOf(actor).intent(actor) :null;
}
function intentLabel(intent) {
return intent.verb + ' in ' + intent.inTicks;
}

function knockbackCell(isFloor,hero,attacker) {
const across = hero.col - attacker.col;
const down = hero.row - attacker.row;
const sideways = Math.abs(across) >= Math.abs(down);
const target = { col:hero.col + (sideways ? Math.sign(across) :0),row:hero.row + (sideways ? 0 :Math.sign(down)) };
const moved = target.col !== hero.col || target.row !== hero.row;
return moved && isFloor(target) ? target :{ col:hero.col,row:hero.row };
}

export { knockbackCell, DRONE_ARM, REVIVE_ARM, DRONE_HP, BOLT_RANGE, CHARGED_DMG, createDrone, registerActorKind, tickActors, rearmActors, hitActor, nearestAwakeFoe, actorAt, actorIntent, intentLabel };

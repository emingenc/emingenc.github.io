import { GAME_EVENT } from '../game/game-events.js';
import { REVIVE_ARM, createDrone, knockbackCell, tickActors, rearmActors, hitActor, nearestAwakeFoe } from '../game/actors.js';
import { createHp, hurtHp, maxHeartsOf, passDoorway, reviveHp } from '../game/hp.js';
import { WALK_FEEL } from '../game/tween.js';
import { cellAt, thingAt } from '../game/world.js';
import { withPosition } from '../game/save.js';
import { analytics } from '../analytics.js';
import { uiEl, uiPrefersReducedMotion } from './dom.js';
import { uiEmit, uiGridEmit } from './bus.js';
import { uiCommitSave } from './game-state.js';
import { uiRenderKeepingFocus } from './app.js';
import { uiShowToast } from './grid-toast.js';

const GRID_RIG_ID = 'grid';
const DOORWAY_KINDS = new Set(['door','gate']);
const FULL_HEART = '♥';
const EMPTY_HEART = '♡';
const HURT_LINES = { drone:'Drone hit.',mite:'OUCH! A mite stung you.' };
const HURT_LINE = 'OUCH! You were hit.';
const REVIVE_TOAST = 'Rebooted at the last doorway.';
const MITE_ID_PREFIX = 'mite';
const MITE_SHOT_TOASTS = {
kill:{ text:'MITE DOWN',kind:'reward' },
dent:{ text:'ZAP! Armour cracked',kind:'info' },
far:{ text:'Too far. Zap it from up close.',kind:'info',replace:true },
cool:{ text:'Recharging.',kind:'info',replace:true },
};
const DRONE_SHOT_TOASTS = { kill:{ text:'DRONE DOWN',kind:'reward' },dent:{ text:'Drone hit.',kind:'info' } };
const SHOT_TOASTS = new Map();
const FIZZLES = new Set(['far','cool']);

function uiRegisterShotToasts(kind,toasts) {
SHOT_TOASTS.set(kind,toasts);
}
function uiActors(game) {
return game.fight ? game.fight.actors :[];
}
function uiIsLive(foe) {
return foe.hp > 0;
}
function uiIsLiveDrone(actor) {
return actor.kind === 'drone' && uiIsLive(actor);
}
function uiDroneAlive(app) {
return uiActors(app.game).some(uiIsLiveDrone);
}
function ensureFight(game) {
if (!game.fight) game.fight = { hp:createHp(game.doorway || game.world.spawn || game.avatar.pos,maxHeartsOf(game.ext)),actors:[] };
return game.fight;
}
function uiLiveFoes(game) {
const mites = game.sentry ? game.sentry.foes() :[];
return [...uiActors(game).filter(uiIsLive),...mites.filter(uiIsLive)];
}
function uiFoeAlive(app) {
return uiLiveFoes(app.game).length > 0;
}
function uiSpawnDrone(app,cell) {
const game = app.game;
ensureFight(game);
const id = 'drone-' + game.fight.actors.length;
game.fight.actors = [...game.fight.actors,createDrone({ id,col:cell.col,row:cell.row })];
uiRenderKeepingFocus(app);
}
function uiNoteDoorway(app,pos) {
const thing = thingAt(app.game.world,pos);
if (!thing || !DOORWAY_KINDS.has(thing.kind)) return;
const cell = { col:pos.col,row:pos.row };
app.game.doorway = cell;
if (app.game.fight) app.game.fight.hp = passDoorway(app.game.fight.hp,cell);
}
function uiReviveFight(fight,hp) {
fight.hp = hp;
fight.actors = rearmActors(fight.actors,REVIVE_ARM);
fight.revives = (fight.revives || 0) + 1;
}
function uiRevive(app) {
const game = app.game;
if (game.sentry) game.sentry.reset(app);
const doorway = game.reviveAt || game.doorway || game.fight.hp.doorway;
const revived = reviveHp({ ...game.fight.hp,doorway });
uiReviveFight(game.fight,revived.hp);
game.avatar = { pos:revived.pos,facing:game.avatar.facing };
Object.assign(game.walk,{ held:[],queued:null,plan:null,tween:null,stalled:null });
if (game.stage) game.stage.follow = null;
uiCommitSave(app,withPosition(game.save,game.avatar));
uiShowToast(app,{ text:REVIVE_TOAST,kind:'warn' });
}
function uiHurtText(hearts,kind) {
return (Object.hasOwn(HURT_LINES,kind) ? HURT_LINES[kind] :HURT_LINE) + ' Hearts ' + hearts.hearts + ' of ' + hearts.max + '.';
}
function uiHurt(app,hits,kind) {
const fight = app.game.fight;
const result = hurtHp(fight.hp,hits);
fight.hp = result.hp;
uiEmit(GAME_EVENT.RIG_BAD,{ rigId:GRID_RIG_ID,reason:'hit' });
if (result.down) { analytics.track('hearts_zero'); uiRevive(app); return false; }
uiShowToast(app,{ text:uiHurtText(result.hp,kind),kind:'warn' });
return true;
}
function uiTickDrones(game) {
if (!uiActors(game).some(uiIsLive)) return { hits:0,strikers:[] };
const ticked = tickActors(game.fight.actors,game.avatar.pos);
game.fight.actors = ticked.actors;
return ticked;
}
function uiIsFreeFloor(game,cell) {
const entry = cellAt(game.world,cell);
const held = uiLiveFoes(game).some((foe) => foe.col === cell.col && foe.row === cell.row);
return Boolean(entry) && entry.kind === 'floor' && thingAt(game.world,cell) === null && !held;
}
function uiPushTween(from,to) {
const now = performance.now();
return { from,to,start:now,until:now + WALK_FEEL.stepMs,glideMs:uiPrefersReducedMotion() ? 0 :WALK_FEEL.stepMs,curve:'ease',stride:0 };
}
function uiKnockBack(app,attacker) {
const game = app.game;
const from = game.avatar.pos;
const to = knockbackCell((cell) => uiIsFreeFloor(game,cell),from,attacker);
if (to.col === from.col && to.row === from.row) return;
game.avatar = { pos:to,facing:game.avatar.facing };
Object.assign(game.walk,{ tween:uiPushTween(from,to),plan:null });
uiCommitSave(app,withPosition(game.save,game.avatar));
}
function uiMiteStrikers(game,miteHits) {
return miteHits > 0 ? game.fight.strikers || [] :[];
}
function uiStruck(app,blow) {
const first = blow.strikers[0];
if (uiHurt(app,blow.hits,first ? first.kind :'mite') && first) uiKnockBack(app,first);
}
function uiActorsTick(app) {
if (app.game.travelOpen || app.game.fight?.calm) return false;
const drones = uiTickDrones(app.game);
const miteHits = app.game.sentry ? app.game.sentry.tick(app) :0;
const hurt = drones.hits + miteHits > 0;
if (hurt) uiStruck(app,{ hits:drones.hits + miteHits,strikers:[...drones.strikers,...uiMiteStrikers(app.game,miteHits)] });
uiGridEmit(app,'tick',{ hurt });
return hurt;
}
function uiIsMiteId(app,actorId) {
return Boolean(app.game.sentry) && actorId.startsWith(MITE_ID_PREFIX);
}
function uiDamageFoe(app,actorId,dmg) {
if (uiIsMiteId(app,actorId)) return { outcome:app.game.sentry.hit(app,actorId,dmg),toasts:MITE_SHOT_TOASTS };
const target = app.game.fight.actors.find((actor) => actor.id === actorId);
const hit = hitActor(app.game.fight.actors,actorId,dmg);
app.game.fight.actors = hit.actors;
return { outcome:hit.killed ? 'kill' :'dent',toasts:SHOT_TOASTS.get(target?.kind) || DRONE_SHOT_TOASTS };
}
function uiHitFoe(app,actorId,dmg) {
const maxBefore = ensureFight(app.game).hp.max;
const result = uiDamageFoe(app,actorId,dmg);
const landed = !FIZZLES.has(result.outcome);
if (landed) uiEmit(GAME_EVENT.RIG_GOOD,{ rigId:GRID_RIG_ID,chain:1 });
if (app.game.fight.hp.max > maxBefore) return landed;
uiShowToast(app,result.toasts[result.outcome]);
return landed;
}
function uiGridPing(app,actorId,dmg) {
uiAfterShot(app,uiHitFoe(app,actorId,dmg));
}
function uiAfterShot(app,landed) {
if (landed) uiActorsTick(app);
uiRenderKeepingFocus(app);
}
function uiGridShot(app,actorId,dmg) {
const hit = (damage) => uiHitFoe(app,actorId,damage);
uiAfterShot(app,app.game.fireGate ? app.game.fireGate(app,dmg,hit) :hit(dmg));
}
function uiSentryWait(app) {
const game = app.game;
if (!game.sentry || !nearestAwakeFoe(game.sentry.foes().filter(uiIsLive),game.avatar.pos)) return false;
game.sentry.wait(app);
uiActorsTick(app);
uiRenderKeepingFocus(app);
return true;
}
function uiGridHearts(app) {
const fight = app.game.fight;
if (!fight || (fight.actors.length === 0 && !fight.engaged)) return null;
const { hearts,max } = fight.hp;
if (!app.game.sentry && !uiDroneAlive(app) && hearts === max) return null;
return uiEl('span',{
className:'grid-hearts',
text:FULL_HEART.repeat(hearts) + EMPTY_HEART.repeat(max - hearts),
attrs:{ role:'img','aria-label':'Hearts ' + hearts + ' of ' + max },
});
}

export { uiRegisterShotToasts,uiIsFreeFloor,ensureFight,uiLiveFoes,uiFoeAlive,uiDroneAlive,uiSpawnDrone,uiNoteDoorway,uiActorsTick,uiHitFoe,uiGridPing,uiGridShot,uiSentryWait,uiGridHearts,uiHurt };

import { GAME_EVENT } from '../game/game-events.js';
import { REVIVE_ARM, createDrone, tickActors, rearmActors, hitActor, nearestAwakeFoe } from '../game/actors.js';
import { createHp, hurtHp, maxHeartsFor, passDoorway, reviveHp } from '../game/hp.js';
import { thingAt } from '../game/world.js';
import { withPosition } from '../game/save.js';
import { uiEl } from './dom.js';
import { uiEmit } from './bus.js';
import { uiCommitSave } from './game-state.js';
import { uiRenderKeepingFocus } from './app.js';
import { uiShowToast } from './grid-toast.js';

const GRID_RIG_ID = 'grid';
const DOORWAY_KINDS = new Set(['door','gate']);
const FULL_HEART = '♥';
const EMPTY_HEART = '♡';
const REVIVE_TOAST = 'Rebooted at the last doorway.';
const MITE_ID_PREFIX = 'mite';
const MITE_SHOT_TOASTS = {
kill:{ text:'MITE DOWN',kind:'reward' },
dent:{ text:'ZAP! Armour cracked',kind:'info' },
far:{ text:'Too far. Zap it from up close.',kind:'info',replace:true },
cool:{ text:'Recharging.',kind:'info',replace:true },
};
const DRONE_SHOT_TOASTS = { kill:{ text:'DRONE DOWN',kind:'reward' },dent:{ text:'Drone hit.',kind:'info' } };
const FIZZLES = new Set(['far','cool']);

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
if (!game.fight) game.fight = { hp:createHp(game.doorway || game.world.spawn || game.avatar.pos,maxHeartsFor(game.ext ? game.ext.zaps : 0)),actors:[] };
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
const doorway = game.doorway || game.fight.hp.doorway;
const revived = reviveHp({ ...game.fight.hp,doorway });
uiReviveFight(game.fight,revived.hp);
game.avatar = { pos:revived.pos,facing:game.avatar.facing };
Object.assign(game.walk,{ held:[],queued:null,plan:null,tween:null,stalled:null });
if (game.stage) game.stage.follow = null;
uiCommitSave(app,withPosition(game.save,game.avatar));
uiShowToast(app,{ text:REVIVE_TOAST,kind:'warn' });
}
function uiHurtText(hearts,drone) {
const count = 'Hearts ' + hearts.hearts + ' of ' + hearts.max;
return drone ? 'Drone hit. ' + count + '.' :'OUCH! A mite stung you. ' + count + '.';
}
function uiHurt(app,hits,drone) {
const fight = app.game.fight;
const result = hurtHp(fight.hp,hits);
fight.hp = result.hp;
uiEmit(GAME_EVENT.RIG_BAD,{ rigId:GRID_RIG_ID,reason:'hit' });
if (result.down) { uiRevive(app); return; }
uiShowToast(app,{ text:uiHurtText(result.hp,drone),kind:'warn' });
}
function uiTickDrones(game) {
if (!uiDroneAlive({ game })) return 0;
const ticked = tickActors(game.fight.actors);
game.fight.actors = ticked.actors;
return ticked.hits;
}
function uiActorsTick(app) {
if (app.game.travelOpen) return false;
const droneHits = uiTickDrones(app.game);
const miteHits = app.game.sentry ? app.game.sentry.tick(app) :0;
if (droneHits + miteHits > 0) uiHurt(app,droneHits + miteHits,droneHits > 0);
return droneHits + miteHits > 0;
}
function uiIsMiteId(app,actorId) {
return Boolean(app.game.sentry) && actorId.startsWith(MITE_ID_PREFIX);
}
function uiDamageFoe(app,actorId,dmg) {
if (uiIsMiteId(app,actorId)) return { outcome:app.game.sentry.hit(app,actorId,dmg),toasts:MITE_SHOT_TOASTS };
const hit = hitActor(app.game.fight.actors,actorId,dmg);
app.game.fight.actors = hit.actors;
return { outcome:hit.killed ? 'kill' :'dent',toasts:DRONE_SHOT_TOASTS };
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
if (uiHitFoe(app,actorId,dmg)) uiActorsTick(app);
uiRenderKeepingFocus(app);
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

export { ensureFight,uiLiveFoes,uiFoeAlive,uiDroneAlive,uiSpawnDrone,uiNoteDoorway,uiActorsTick,uiHitFoe,uiGridPing,uiSentryWait,uiGridHearts };

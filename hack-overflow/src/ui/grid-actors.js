import { GAME_EVENT } from '../game/game-events.js';
import { REVIVE_ARM, createDrone, tickActors, rearmActors, hitActor } from '../game/actors.js';
import { createHp, hurtHp, passDoorway, reviveHp } from '../game/hp.js';
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

function uiActors(game) {
return game.fight ? game.fight.actors :[];
}
function uiIsLiveDrone(actor) {
return actor.kind === 'drone' && actor.hp > 0;
}
function uiDroneAlive(app) {
return uiActors(app.game).some(uiIsLiveDrone);
}
function uiSpawnDrone(app,cell) {
const game = app.game;
if (!game.fight) game.fight = { hp:createHp(game.doorway || game.world.spawn || game.avatar.pos),actors:[] };
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
const doorway = game.doorway || game.fight.hp.doorway;
const revived = reviveHp({ ...game.fight.hp,doorway });
uiReviveFight(game.fight,revived.hp);
game.avatar = { pos:revived.pos,facing:game.avatar.facing };
Object.assign(game.walk,{ held:[],queued:null,plan:null,tween:null,stalled:null });
if (game.stage) game.stage.follow = null;
uiCommitSave(app,withPosition(game.save,game.avatar));
uiShowToast(app,{ text:REVIVE_TOAST,kind:'warn' });
}
function uiHurt(app,hits) {
const fight = app.game.fight;
const result = hurtHp(fight.hp,hits);
fight.hp = result.hp;
uiEmit(GAME_EVENT.RIG_BAD,{ rigId:GRID_RIG_ID,reason:'hit' });
if (result.down) { uiRevive(app); return; }
uiShowToast(app,{ text:'Drone hit. Hearts ' + result.hp.hearts + ' of ' + result.hp.max + '.',kind:'warn' });
}
function uiActorsTick(app) {
if (!uiDroneAlive(app) || app.game.travelOpen) return false;
const fight = app.game.fight;
const ticked = tickActors(fight.actors);
fight.actors = ticked.actors;
if (ticked.hits > 0) uiHurt(app,ticked.hits);
return ticked.hits > 0;
}
function uiGridPing(app,actorId,dmg) {
const fight = app.game.fight;
const hit = hitActor(fight.actors,actorId,dmg);
fight.actors = hit.actors;
uiEmit(GAME_EVENT.RIG_GOOD,{ rigId:GRID_RIG_ID,chain:1 });
uiShowToast(app,hit.killed ? { text:'DRONE DOWN',kind:'reward' } :{ text:'Drone hit.',kind:'info' });
uiActorsTick(app);
uiRenderKeepingFocus(app);
}
function uiGridHearts(app) {
const fight = app.game.fight;
if (!fight || fight.actors.length === 0) return null;
const { hearts,max } = fight.hp;
return uiEl('span',{
className:'grid-hearts',
text:FULL_HEART.repeat(hearts) + EMPTY_HEART.repeat(max - hearts),
attrs:{ role:'img','aria-label':'Hearts ' + hearts + ' of ' + max },
});
}

export { uiDroneAlive,uiSpawnDrone,uiNoteDoorway,uiActorsTick,uiGridPing,uiGridHearts };

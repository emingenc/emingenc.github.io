import { hasBeat,withBeat } from '../game/ext/ops.js';
import { BOUNCE_TEXT,YOURS_TEXT,advanceArmored,createArmored,isArmored,markTagged } from '../game/power/armored.js';
import { isSealed } from '../game/power/lockers.js';
import { uiCommitExt } from './ext-storage.js';
import { ensureFight,uiRegisterShotToasts } from './grid-actors.js';
import { uiDrawArmored } from './grid-armored-draw.js';
import { uiRegisterActorPainter } from './grid-draw-actors.js';
import { uiGuardDown,uiMarkStood } from './grid-locker.js';
import { uiAddChips,uiHooksOnce,uiPowerOf,uiPowerRefresh,uiPowerSay } from './grid-power.js';

const BEAT = 'yours';
const STAND_DOWN = { id:'armored-stand-down',label:'STAND DOWN',aria:'Stand down the armored mite',tone:'warn' };
const STAND_TEXT = 'Stood down. The mite goes quiet.';
const SHOT_TOASTS = {
kill:{ text:'ARMORED MITE DOWN',kind:'reward' },
dent:{ text:BOUNCE_TEXT,kind:'info',replace:true },
};

uiRegisterActorPainter('armored',uiDrawArmored);
uiRegisterShotToasts('armored',SHOT_TOASTS);

function uiArmoredOn(app) {
const power = app.game.power;
return app.screen === 'grid' && Boolean(power) && power.gen === app.game.gen && Boolean(power.armored);
}
function uiStanding(game) {
return (game.fight ? game.fight.actors :[]).filter((actor) => isArmored(actor) && actor.hp > 0);
}
function uiSyncTags(game) {
const tags = uiPowerOf(game).tags;
const mites = uiStanding(game);
const gained = mites.filter((mite) => tags[mite.id] && !mite.tagged);
const lost = mites.filter((mite) => !tags[mite.id] && mite.tagged);
if (gained.length === 0 && lost.length === 0) return;
game.fight.actors = gained.reduce((actors,mite) => markTagged(actors,mite.id),game.fight.actors)
.map((actor) => (lost.some((mite) => mite.id === actor.id) ? { ...actor,tagged:false } :actor));
}
function uiBeaten(app,id) {
const first = !hasBeat(app.game.ext,BEAT);
if (first) uiCommitExt(app,withBeat(app.game.ext,BEAT));
uiGuardDown(app,id).catch(console.error);
if (first) uiPowerSay(app,{ text:YOURS_TEXT,replace:false });
}
function uiOnTick(info) {
const app = info.app;
if (!uiArmoredOn(app) || !app.game.fight) return;
const game = app.game;
uiSyncTags(game);
game.fight.actors = advanceArmored(game.fight.actors);
game.fight.actors.filter((actor) => isArmored(actor) && actor.hp <= 0 && isSealed(game.ext,actor.id)).forEach((mite) => uiBeaten(app,mite.id));
}
const uiHook = uiHooksOnce({ tick:uiOnTick });
function uiStandDown(app) {
const game = app.game;
const standing = uiStanding(game);
if (standing.length === 0) return;
standing.forEach((mite) => uiMarkStood(game,mite.id));
game.fight.actors = game.fight.actors.filter((actor) => !standing.includes(actor));
uiPowerSay(app,{ text:STAND_TEXT });
uiPowerRefresh(app);
}
function uiArmoredChips(app) {
uiSyncTags(app.game);
return uiStanding(app.game).length > 0 ? [{ ...STAND_DOWN,run:uiStandDown }] :[];
}
function uiStart(app) {
const power = uiPowerOf(app.game);
if (power.armored) return;
power.armored = {};
uiAddChips(app.game,uiArmoredChips);
uiHook();
}
function uiSpawnArmored(app,locker) {
const fight = ensureFight(app.game);
if (fight.actors.some((actor) => actor.id === locker.id)) return;
uiStart(app);
fight.actors = [...fight.actors,createArmored({ id:locker.id,ring:locker.ring.map((cell) => ({ col:cell.col,row:cell.row })) })];
uiPowerRefresh(app);
}

export { uiSpawnArmored };

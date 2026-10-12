import { DRY_TEXT,ammoLabel,ammoMax,countsAmmo,refill,shouldBreakContactRefill,spendShot } from '../game/ammo.js';
import { rankOf } from '../game/ext/ops.js';
import { rankLevel } from '../game/rank.js';
import { thingAt } from '../game/world.js';
import { uiEl } from './dom.js';
import { uiLiveFoes } from './grid-actors.js';
import { uiHooksOnce,uiPowerRefresh } from './grid-power.js';
import { uiShowToast } from './grid-toast.js';

const DOORWAY_KINDS = new Set(['door','gate']);
const BARE_PING = 1;

function uiRunOf(game) {
if (!game.ammoRun || game.ammoRun.gen !== game.gen) game.ammoRun = { gen:game.gen,max:0,revives:0,dry:false };
return game.ammoRun;
}
function uiReload(game) {
const run = uiRunOf(game);
game.ammo = refill(run.max);
run.dry = false;
}
function uiSyncAmmo(app) {
const game = app.game;
if (!countsAmmo(game.ext)) {
delete game.ammo;
return false;
}
const run = uiRunOf(game);
const max = ammoMax(rankLevel(rankOf(game.ext)));
const revives = game.fight ? game.fight.revives || 0 :0;
const refilled = !Number.isFinite(game.ammo) || max > run.max || revives > run.revives;
Object.assign(run,{ max,revives });
if (refilled) uiReload(game);
return true;
}
function uiFireGate(app,dmg,hit) {
const game = app.game;
if (!uiSyncAmmo(app)) return hit(dmg);
const run = uiRunOf(game);
const shot = spendShot(game.ammo);
if (!hit(shot.dry ? BARE_PING :dmg)) return false;
game.ammo = shot.ammo;
if (!shot.dry) {
run.dry = false;
return true;
}
if (!run.dry) uiShowToast(app,{ text:DRY_TEXT,kind:'info',replace:true });
run.dry = true;
return true;
}
function uiAmmoNode(app) {
if (!uiSyncAmmo(app)) return null;
const label = ammoLabel(app.game.ammo,uiRunOf(app.game).max);
return uiEl('span',{ className:'grid-ammo',text:label.text,attrs:{ role:'img','aria-label':label.aria } });
}
function uiIsHung(app) {
return app.game.fireGate === uiFireGate;
}
function uiOnDoorway(info) {
const app = info.app;
const thing = uiIsHung(app) ? thingAt(app.game.world,info.pos) :null;
if (thing && DOORWAY_KINDS.has(thing.kind) && uiSyncAmmo(app)) uiReload(app.game);
}
function uiOnContact(info) {
const app = info.app;
if (!uiIsHung(app) || !uiSyncAmmo(app)) return;
if (shouldBreakContactRefill(uiLiveFoes(app.game),app.game.avatar.pos)) uiReload(app.game);
}
function uiOnStep(info) {
uiOnDoorway(info);
uiOnContact(info);
}
const uiHook = uiHooksOnce({ step:uiOnStep,'enter-cell':uiOnDoorway,tick:uiOnContact });
function uiAmmoEnter(app) {
if (uiSyncAmmo(app)) uiReload(app.game);
}
function uiInstallAmmo(app) {
app.game.fireGate = uiFireGate;
app.game.ammoNode = uiAmmoNode;
uiHook();
uiAmmoEnter(app);
uiPowerRefresh(app);
}

export { uiAmmoEnter,uiInstallAmmo };

import { hasBolt } from '../game/cast/patch.js';
import { DOWN_BEAT,BUMP_TOAST,HOLD_TOAST } from '../game/cast/refusal.js';
import { hasBeat,withBeat } from '../game/ext/ops.js';
import { uiGridHook } from './bus.js';
import { uiCommitExt } from './ext-storage.js';
import { uiSentinelOf } from './grid-cast-actors.js';
import { uiStartJourney } from './grid-journey.js';
import { uiPatchBump,uiPatchCrates,uiPatchEast,uiPatchFollow } from './grid-cast-patch.js';
import { uiRunRefusal } from './grid-cast-refusal.js';
import { uiCastSync,uiStartCast } from './grid-cast-sync.js';
import { uiShowToast } from './grid-toast.js';

let uiHooked = false;

function uiLive(app) {
return app.screen === 'grid' && app.game && app.game.cast && !app.game.cast.inert;
}
function uiNoteSentinelDown(app) {
const sentinel = uiSentinelOf(app.game);
if (sentinel && sentinel.hp <= 0 && !hasBeat(app.game.ext,DOWN_BEAT)) uiCommitExt(app,withBeat(app.game.ext,DOWN_BEAT));
}
function uiOnEnterCell(info) {
const app = info.app;
if (!uiLive(app)) return;
uiPatchFollow(app,info);
uiCastSync(app);
uiRunRefusal(app).catch(console.error);
}
function uiOnTick(info) {
const app = info.app;
if (!uiLive(app)) return;
uiNoteSentinelDown(app);
uiPatchCrates(app).catch(console.error);
}
function uiOnBump(info) {
const app = info.app;
const prop = info.event && info.event.prop;
if (!uiLive(app) || !prop) return;
if (prop === uiSentinelId(app)) uiShowToast(app,{ text:hasBolt(app.game.ext) ? HOLD_TOAST :BUMP_TOAST,kind:'info' });
else uiPatchBump(app,prop);
}
function uiSentinelId(app) {
const sentinel = uiSentinelOf(app.game);
return sentinel ? sentinel.id :null;
}
function uiHook() {
if (uiHooked) return;
uiHooked = true;
uiGridHook('enter-cell',uiOnEnterCell);
uiGridHook('tick',uiOnTick);
uiGridHook('bump',uiOnBump);
}

function uiInstallCast(app) {
uiStartCast(app);
uiStartJourney(app);
if (app.game.cast.inert) return app;
uiHook();
uiCastSync(app);
uiPatchEast(app).catch(console.error);
return app;
}

export { uiInstallCast };

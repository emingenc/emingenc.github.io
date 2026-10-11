import { hasBeat,withBeat } from '../game/ext/ops.js';
import { AMBUSH,ambushDue,ambushState,ambushText,standAmbush,withoutAmbush } from '../game/power/ambush.js';
import { uiCommitExt } from './ext-storage.js';
import { ensureFight } from './grid-actors.js';
import { uiAddChips,uiHooksOnce,uiPowerOf,uiPowerRefresh,uiPowerSay as uiSay } from './grid-power.js';
import { uiPayRank } from './rank-pay.js';

const STAND_DOWN = { id:'stand-down',label:'STAND DOWN',aria:'Stand down',tone:'warn' };

function uiAmbushOf(app) {
return uiPowerOf(app.game).ambush || null;
}
function uiSpring(app,ambush) {
const fight = ensureFight(app.game);
fight.actors = [...withoutAmbush(fight.actors),...standAmbush()];
Object.assign(ambush,{ live:true,revives:fight.revives || 0 });
uiSay(app,{ text:ambushText().start });
uiPowerRefresh(app);
if (hasBeat(app.game.ext,'ordeal')) import('./finale-offer.js').then((module) => module.uiGhostOffer(app,{ kind:'ambush' })).catch(console.error);
}
function uiOnEnterCell(info) {
const app = info.app;
const ambush = uiAmbushOf(app);
if (!ambush || ambush.live || app.screen !== 'grid' || app.game.opening) return;
if (ambushDue(app.game.ext,app.game.progress.won,info.pos)) uiSpring(app,ambush);
}
function uiTellBeat(app) {
uiCommitExt(app,withBeat(app.game.ext,AMBUSH.beat));
}
function uiBreakOff(app,ambush) {
ambush.live = false;
app.game.fight.actors = withoutAmbush(app.game.fight.actors);
uiTellBeat(app);
}
function uiStandDown(app) {
const ambush = uiAmbushOf(app);
if (!ambush || !ambush.live || !app.game.fight) return;
uiBreakOff(app,ambush);
uiSay(app,{ text:ambushText().standDown });
uiPowerRefresh(app);
}
function uiClear(app,ambush) {
ambush.live = false;
uiTellBeat(app);
uiSay(app,{ text:ambushText().clear,kind:'reward' });
uiPayRank(app,AMBUSH.source,AMBUSH.reward).catch(console.error);
}
function uiOnTick(info) {
const app = info.app;
const ambush = uiAmbushOf(app);
if (!ambush || !ambush.live) return;
const fight = app.game.fight;
const state = fight ? ambushState(fight.actors) :'gone';
if (state === 'gone') ambush.live = false;
else if ((fight.revives || 0) > ambush.revives) uiBreakOff(app,ambush);
else if (state === 'clear') uiClear(app,ambush);
}
const uiHook = uiHooksOnce({ 'enter-cell':uiOnEnterCell,tick:uiOnTick });
function uiInstallAmbush(app) {
uiPowerOf(app.game).ambush = { live:false,revives:0 };
uiHook();
uiAddChips(app.game,(shown) => (uiAmbushOf(shown) && uiAmbushOf(shown).live ? [{ ...STAND_DOWN,run:uiStandDown }] :[]));
}

export { uiInstallAmbush };

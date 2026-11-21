import { hasBeat,withBeat } from '../game/ext/ops.js';
import { AMBUSH,ambushDue,ambushState,standAmbush,withoutAmbush } from '../game/power/ambush.js';
import { endLine,eventLine } from '../game/power/event-text.js';
import { uiCommitExt } from './ext-storage.js';
import { ensureFight } from './grid-actors.js';
import { uiDropLine,uiEventCard,uiStopGo } from './grid-event-card.js';
import { uiAddChips,uiAimOn,uiHooksOnce,uiPowerOf,uiPowerRefresh,uiPowerSay as uiSay } from './grid-power.js';
import { uiPayRank } from './rank-pay.js';

const STAND_DOWN = { id:'stand-down',label:'STAND DOWN',aria:'Stand down',tone:'warn' };

function uiAmbushOf(app) {
return uiPowerOf(app.game).ambush || null;
}
function uiLine(app) {
const ambush = uiAmbushOf(app);
if (!ambush || !ambush.live) return null;
const tags = uiPowerOf(app.game).tags;
const done = AMBUSH.foes.filter((foe) => tags[foe.id]).length;
return { text:eventLine('ambush',{ done,total:AMBUSH.foes.length }),targetId:null };
}
function uiSpring(app,ambush) {
const fight = ensureFight(app.game);
uiStopGo(app);
fight.actors = [...withoutAmbush(fight.actors),...standAmbush()];
Object.assign(ambush,{ live:true,revives:fight.revives || 0,steps:0 });
app.game.objectiveOverride = uiLine;
uiAimOn(app);
uiPowerRefresh(app);
uiEventCard(app,'ambush').then(() => hasBeat(app.game.ext,'ordeal') && import('./finale-offer.js').then((module) => module.uiGhostOffer(app,{ kind:'ambush' }))).catch(console.error);
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
function uiBreakOff(app,ambush,cause) {
ambush.live = false;
uiDropLine(app,uiLine);
app.game.fight.actors = withoutAmbush(app.game.fight.actors);
uiTellBeat(app);
uiSay(app,{ text:endLine('ambush',cause) });
}
function uiStandDown(app) {
const ambush = uiAmbushOf(app);
if (!ambush || !ambush.live || !app.game.fight) return;
uiBreakOff(app,ambush,'standDown');
uiPowerRefresh(app);
}
function uiClear(app,ambush) {
ambush.live = false;
uiDropLine(app,uiLine);
uiTellBeat(app);
uiSay(app,{ text:endLine('ambush','clear',{ steps:ambush.steps,pay:AMBUSH.reward }),kind:'reward' });
uiPayRank(app,AMBUSH.source,AMBUSH.reward).catch(console.error);
}
function uiOnTick(info) {
const app = info.app;
const ambush = uiAmbushOf(app);
if (!ambush || !ambush.live) return;
const fight = app.game.fight;
const state = fight ? ambushState(fight.actors) :'gone';
ambush.steps += 1;
if (state === 'gone') { ambush.live = false; uiDropLine(app,uiLine); }
else if ((fight.revives || 0) > ambush.revives) uiBreakOff(app,ambush,'revive');
else if (state === 'clear') uiClear(app,ambush);
}
const uiHook = uiHooksOnce({ 'enter-cell':uiOnEnterCell,tick:uiOnTick });
function uiInstallAmbush(app) {
uiPowerOf(app.game).ambush = { live:false,revives:0,steps:0 };
uiHook();
uiAddChips(app.game,(shown) => (uiAmbushOf(shown) && uiAmbushOf(shown).live ? [{ ...STAND_DOWN,run:uiStandDown }] :[]));
}

export { uiInstallAmbush };

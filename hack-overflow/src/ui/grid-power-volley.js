import { hasBeat,hasFind,withBeat,withFind } from '../game/ext/ops.js';
import { cellToward } from '../game/move.js';
import { usablePowers } from '../game/power/powers.js';
import { DOOR,VOLLEY,VOLLEYS,createVolleyRun,playVolley,runView,standVolley,volleyDue,volleyText } from '../game/power/volley.js';
import { uiCommitExt } from './ext-storage.js';
import { ensureFight,uiActorsTick } from './grid-actors.js';
import { uiAddChips,uiHooksOnce,uiModeOff,uiPowerOf,uiPowerRefresh,uiPowerSay as uiSay } from './grid-power.js';
import { uiLend,uiSpendTrial } from './grid-power-lend.js';
import { uiBreachClick,uiWireBreach } from './grid-power-plate.js';
import { uiPaintPlate } from './grid-power-plate-draw.js';
import { uiShowToast } from './grid-toast.js';
import { uiPayRank } from './rank-pay.js';

const STAND_DOWN_ID = 'plate-stand-down';
const HINTS = { breach:'hold',push:'plate on',pop:'top off',clear:'tower empty' };
const SAFE_ARM = 2;
const SHOT_ARM = 1;

function uiVolleyOf(app) {
const power = app.game && app.game.power;
return power && power.gen === app.game.gen && power.volley ? power.volley :null;
}
function uiLiveOf(app) {
const state = uiVolleyOf(app);
return state ? state.live :null;
}
function uiUsable(game) {
return usablePowers(game.progress.won,game.ext).includes(VOLLEY.power);
}
function uiOnGrid(app) {
return app.screen === 'grid' && !app.game.opening && Boolean(uiVolleyOf(app));
}
function uiAtDoor(game) {
const here = game.avatar.pos;
const faced = cellToward(here,game.avatar.facing);
const there = here.col === VOLLEY.doorFrom.col && here.row === VOLLEY.doorFrom.row;
return there && faced.col === VOLLEY.door.col && faced.row === VOLLEY.door.row;
}
function uiAtBrace(game) {
const faced = cellToward(game.avatar.pos,game.avatar.facing);
return faced.col === VOLLEY.brace.col && faced.row === VOLLEY.brace.row;
}
function uiTalk(app) {
const state = uiVolleyOf(app);
if (!state || state.talking) return;
const text = volleyText();
state.talking = true;
uiLend(app,{ ally:VOLLEY.ally,power:VOLLEY.power,lines:{ lend:text.lend.lend,again:text.lend.again,owned:text.owned } })
.catch(console.error)
.finally(function () { state.talking = false; });
}
function uiBegin(app,live) {
const state = uiVolleyOf(app);
state.live = live;
uiModeOff(app.game);
if (!state.wired) {
state.wired = true;
uiWireBreach(app,function () { uiPlay(app,'breach'); });
}
}
function uiSpring(app) {
const fight = ensureFight(app.game);
fight.actors = [...fight.actors.filter((actor) => actor.id !== VOLLEY.drone.id),...standVolley()];
uiBegin(app,{ kind:'volley',run:createVolleyRun(VOLLEYS),revives:fight.revives || 0 });
uiSay(app,{ text:volleyText().start });
uiPowerRefresh(app);
if (hasBeat(app.game.ext,'ordeal')) import('./finale-offer.js').then((module) => module.uiGhostOffer(app,{ kind:'volley',once:'hint-volley' })).catch(console.error);
}
function uiBumpDoor(app) {
const game = app.game;
const text = volleyText();
if (uiLiveOf(app)) uiSay(app,{ text:text.busy });
else if (hasFind(game.ext,VOLLEY.find)) uiSay(app,{ text:text.doorOpen });
else if (!uiUsable(game)) uiSay(app,{ text:text.doorLocked });
else {
uiBegin(app,{ kind:'door',run:createVolleyRun([DOOR]),revives:0 });
uiSay(app,{ text:text.doorBump });
}
uiPowerRefresh(app);
}
function uiDroneOf(game) {
return (game.fight ? game.fight.actors :[]).find((actor) => actor.id === VOLLEY.drone.id) || null;
}
function uiWithoutDrone(game) {
if (game.fight) game.fight.actors = game.fight.actors.filter((actor) => actor.id !== VOLLEY.drone.id);
}
function uiTickWith(app,arm) {
const fight = app.game.fight;
fight.actors = fight.actors.map((actor) => (actor.id === VOLLEY.drone.id ? { ...actor,arm } :actor));
uiActorsTick(app);
}
function uiFinish(app,live) {
const state = uiVolleyOf(app);
if (!state || state.live !== live) return false;
state.live = null;
if (live.kind === 'volley') {
uiWithoutDrone(app.game);
uiCommitExt(app,withBeat(app.game.ext,VOLLEY.beat));
}
uiSpendTrial(app,VOLLEY.power);
return true;
}
function uiStandDown(app) {
const live = uiLiveOf(app);
if (!live || !uiFinish(app,live)) return;
const text = volleyText();
uiSay(app,{ text:live.kind === 'volley' ? text.standDown :text.doorStandDown });
uiPowerRefresh(app);
}
function uiWin(app,live,result) {
const text = volleyText();
uiFinish(app,live);
if (live.kind === 'door') {
uiCommitExt(app,withFind(app.game.ext,VOLLEY.find));
uiSay(app,{ text:text.doorWin,kind:'reward' });
return;
}
if (result.kind === 'breach') uiSay(app,{ text:text.breach(result.glyph,result.top) });
else uiSay(app,{ text:text.cleared,kind:'reward' });
uiPayRank(app,VOLLEY.source,VOLLEY.reward).then(function (paid) {
if (result.kind === 'breach' && paid.paid && !paid.up) uiShowToast(app,{ text:text.cleared,kind:'reward' });
}).catch(console.error);
}
function uiRight(app,live,result) {
if (live.kind === 'volley') {
uiTickWith(app,SAFE_ARM);
if (uiLiveOf(app) !== live) return;
}
if (result.done) uiWin(app,live,result);
else if (result.blocked) uiSay(app,{ text:volleyText().blocked(runView(live.run).volley,runView(live.run).volleys) });
}
function uiWrong(app,live,result) {
const text = volleyText();
if (live.kind === 'door') {
uiSay(app,{ text:text.slip(result.right) });
return;
}
uiTickWith(app,SHOT_ARM);
if (uiLiveOf(app) === live) uiSay(app,{ text:text.wrong(result.right) });
}
function uiPlay(app,verb) {
const live = uiLiveOf(app);
if (!live || app.story || app.game.travelOpen) return;
const result = playVolley(live.run,verb);
live.run = result.run;
if (result.kind === 'wrong') uiWrong(app,live,result);
else if (result.kind !== 'idle') uiRight(app,live,result);
uiPowerRefresh(app);
}
function uiDockChip(verb,view) {
const word = view.end && verb !== 'breach' ? 'CLEAR' :verb.toUpperCase();
const hint = verb === 'breach' ? HINTS.breach :view.end ? HINTS.clear :HINTS[verb];
const aria = verb === 'breach' ? 'Breach: hold to deflect the volley' :view.end ? 'Clear: the tower is empty' :verb === 'push' ? 'Push a plate' :'Pop the top plate';
return { id:verb,label:word,intent:hint,aria,tone:verb === 'breach' ? 'breach' :'plate' };
}
function uiDockChips(app) {
const live = uiLiveOf(app);
if (!live) return [];
const view = runView(live.run);
const plates = ['push','pop'].map((verb) => ({ ...uiDockChip(verb,view),run:() => uiPlay(app,verb) }));
const breach = { ...uiDockChip('breach',view),run:() => uiBreachClick(() => uiPlay(app,'breach')) };
return [breach,...plates,{ id:STAND_DOWN_ID,label:'STAND DOWN',aria:'Stand down',tone:'warn',run:uiStandDown }];
}
function uiOnEnterCell(info) {
const app = info.app;
if (!uiOnGrid(app)) return;
const live = uiLiveOf(app);
if (!live && volleyDue(app.game.ext,app.game.progress.won,info.pos)) uiSpring(app);
else if (live && live.kind === 'door') uiLeaveDoor(app);
}
function uiLeaveDoor(app) {
uiVolleyOf(app).live = null;
uiPowerRefresh(app);
}
function uiOnBump(info) {
const app = info.app;
if (!uiOnGrid(app)) return;
if (info.event && info.event.prop) return;
if (uiAtBrace(app.game)) uiTalk(app);
else if (uiAtDoor(app.game)) uiBumpDoor(app);
}
function uiOnTick(info) {
const app = info.app;
const live = uiLiveOf(app);
if (!live || live.kind !== 'volley') return;
const drone = uiDroneOf(app.game);
const revived = (app.game.fight.revives || 0) > live.revives;
if (revived || !drone || drone.hp <= 0) {
uiFinish(app,live);
uiPowerRefresh(app);
}
}
const uiHook = uiHooksOnce({ 'enter-cell':uiOnEnterCell,bump:uiOnBump,tick:uiOnTick });
function uiWrapPaint(game) {
const inner = game.drawCast;
const paint = function (ctx,app,frame) {
if (inner) inner(ctx,app,frame);
const live = uiLiveOf(app);
uiPaintPlate(ctx,frame,{ open:hasFind(app.game.ext,VOLLEY.find),view:live ? runView(live.run) :null });
};
game.drawCast = paint;
}
function uiVolleyRun(app) {
const live = uiLiveOf(app);
return live ? { kind:live.kind,...runView(live.run) } :null;
}
function uiInstallVolley(app) {
const game = app.game;
uiPowerOf(game).volley = { live:null,talking:false,wired:false };
uiAddChips(game,uiDockChips);
uiWrapPaint(game);
uiHook();
}

export { uiInstallVolley,uiVolleyRun };

import { GAME_EVENT } from '../game/game-events.js';
import { createOpening, openingDroneCell, stepOpening } from '../game/opening-steps.js';
import { createExt, markOpeningDone } from '../game/save-ext.js';
import { uiRenderKeepingFocus } from './app.js';
import { uiEmit } from './bus.js';
import { uiAnnounce, uiPointerIsCoarse } from './dom.js';
import { uiCommitExt } from './ext-storage.js';
import { uiActorsTick, uiDroneAlive, uiSpawnDrone } from './grid-actors.js';
import { uiDrawActors } from './grid-draw-actors.js';
import { uiShowToast } from './grid-toast.js';
import { uiStoryOnGrid } from './story-dialogue.js';

const OPENING_PULSE_MS = 100;
const OPENING_RIG_ID = 'grid';
const ALARM_TOAST = 'ALARM. Something is coming through the wall.';
const DONE_TOAST = 'lc217 flickered: ROOT is rewriting it.';
const COACH = {
first:{ touch:'A drone crashed in! Tap it, or press A, to ping it.',keys:'A drone crashed in! Press F to ping it.' },
again:{ touch:'Tap the drone to ping it, or press A.',keys:'Press F to ping the drone.' },
};

function uiDefaultClock() {
return performance.now();
}
function uiOpeningPaused(app) {
return app.screen !== 'grid' || Boolean(app.menuOpen) || Boolean(app.story);
}
function uiClearToast(game) {
if (!game.toast) return;
window.clearTimeout(game.toastTimer);
game.toast = null;
}
function uiOpeningToast(app,toast) {
uiClearToast(app.game);
uiShowToast(app,toast);
}
function uiOpeningAlarm(app) {
uiEmit(GAME_EVENT.RIG_BAD,{ rigId:OPENING_RIG_ID,reason:'alarm' });
uiOpeningToast(app,{ text:ALARM_TOAST,kind:'warn' });
uiRenderKeepingFocus(app);
}
function uiOpeningCrash(app) {
const cell = openingDroneCell(app.game.world,app.game.avatar.pos);
if (!cell) { uiOpeningFinish(app); return; }
uiClearToast(app.game);
uiSpawnDrone(app,cell);
}
function uiOpeningIdleTick(app) {
if (uiActorsTick(app)) uiRenderKeepingFocus(app);
}
function uiRestoreHearts(game) {
if (game.fight) game.fight.hp = { ...game.fight.hp,hearts:game.fight.hp.max };
}
function uiOpeningFinish(app) {
const game = app.game;
window.clearTimeout(game.opening.timer);
game.opening = null;
uiRestoreHearts(game);
uiCommitExt(app,markOpeningDone(game.ext || createExt()));
uiOpeningToast(app,{ text:DONE_TOAST,kind:'info' });
uiStoryOnGrid(app);
uiRenderKeepingFocus(app);
}
function uiOpeningCoachText(app) {
const fight = app.game.fight;
const round = fight && fight.revives > 0 ? 'again' :'first';
return COACH[round][uiPointerIsCoarse() ? 'touch' :'keys'];
}
function uiOpeningCoach(app) {
const game = app.game;
const text = uiDroneAlive(app) ? uiOpeningCoachText(app) :null;
if (text && text !== game.coach) uiAnnounce(text);
game.coach = text;
}
const UI_CUE_HANDLERS = {
alarm:uiOpeningAlarm,
crash:uiOpeningCrash,
'idle-tick':uiOpeningIdleTick,
finish:uiOpeningFinish,
};
function uiOpeningFrame(app,now) {
const opening = app.game.opening;
if (!opening) return;
const elapsed = now - opening.last;
opening.last = now;
if (uiOpeningPaused(app)) {
opening.state = { ...opening.state,since:opening.state.since + elapsed };
return;
}
const step = stepOpening(opening.state,{ now,droneAlive:uiDroneAlive(app) });
opening.state = step.state;
if (step.cue && UI_CUE_HANDLERS[step.cue]) UI_CUE_HANDLERS[step.cue](app);
uiOpeningCoach(app);
}
function uiOpeningPulse(app) {
const opening = app.game.opening;
if (!opening) return;
opening.timer = null;
uiOpeningFrame(app,opening.clock());
if (app.game.opening) uiSchedulePulse(app);
}
function uiSchedulePulse(app) {
app.game.opening.timer = window.setTimeout(function () { uiOpeningPulse(app); },OPENING_PULSE_MS);
}
function uiStartOpening(app,clock = uiDefaultClock) {
if (app.game.opening) return;
const now = clock();
app.game.drawActors = uiDrawActors;
app.game.opening = { state:createOpening(now),last:now,clock,timer:null };
uiSchedulePulse(app);
uiRenderKeepingFocus(app);
}

export { uiStartOpening,uiOpeningFrame };

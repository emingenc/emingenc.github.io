import { uiEl } from './dom.js';
import { uiGridHud } from './grid-hud.js';
import { uiGridObjective, uiObjectiveText } from './grid-objective.js';
import { uiGridStage, uiSyncGridLoop } from './grid-canvas.js';
import { uiGridToast } from './grid-toast.js';
import { uiGridTravel, uiToggleTravel, uiIsTravelAction, uiTravelTo } from './grid-travel.js';
import { uiGridTouchLayer, uiGridPointerDown, uiGridPointerUp, uiGridPointerCancel } from './grid-touch.js';
import { uiGridDpad, uiDpadDirOf } from './grid-dpad.js';
import { uiGridFire } from './grid-fire.js';
import { uiGridKeyAction, uiGridKeyUp } from './grid-keys.js';
import { uiWalkPress, uiWalkRelease, uiWalkReleaseAll, uiWalkInteract } from './grid-walk.js';
import { uiOpenReadyLevelUp, uiLevelUpAfterRender } from './grid-events.js';
import { uiStoryOnGrid } from './story-dialogue.js';
import { openingDue } from '../game/opening.js';
import { isOpen } from '../game/world.js';
import { uiHasGame } from './game-storage.js';
import { uiRenderKeepingFocus } from './app.js';

function uiMainHasProgress(app) {
return uiHasGame() || app.game.save.story.length > 0;
}
function uiOpeningWanted(app) {
return Boolean(app.game.opening) || openingDue(app.game.ext || { opening:false },uiMainHasProgress(app));
}
function uiHasPage() {
return typeof window !== 'undefined' && typeof document !== 'undefined';
}
function uiOpeningLoaded(app,opening) {
if (uiHasPage()) opening.uiStartOpening(app);
}
function uiOpeningFailed(app) {
if (!uiHasPage()) return;
uiStoryOnGrid(app);
uiRenderKeepingFocus(app);
}
function uiLoadOpening(app) {
if (app.game.opening || app.game.openingLoad) return;
app.game.openingLoad = import('./grid-opening.js')
.then(function (opening) { uiOpeningLoaded(app,opening); },function () { uiOpeningFailed(app); })
.finally(function () { app.game.openingLoad = null; });
}
function uiSentryWanted(game) {
const barrier = game.world.barriers.sentry;
return Boolean(barrier) && !game.sentry && !game.sentryLoad && !isOpen(game.world,game.progress,barrier.id);
}
function uiLoadSentry(app) {
if (!uiSentryWanted(app.game)) return;
app.game.sentryLoad = import('./grid-sentry.js')
.then(function (sentry) { sentry.uiInstallSentry(app); })
.catch(function () {})
.finally(function () { app.game.sentryLoad = null; });
}
function uiEnterGrid(app) {
app.screen = 'grid';
app.lastFocusKey = 'grid-stage';
uiOpenReadyLevelUp(app);
uiLoadSentry(app);
if (uiOpeningWanted(app)) uiLoadOpening(app);
else uiStoryOnGrid(app);
}
function uiRenderGrid(app) {
const children = [
uiGridHud(app),uiGridObjective(app),uiGridStage(app),uiGridToast(app),uiGridTouchLayer(app),uiGridDpad(app),uiGridFire(app),uiGridTravel(app),
];
return uiEl('section',{ className:'screen grid-screen',attrs:{ 'data-screen':'grid' },children:children.filter(Boolean) });
}
function uiDpadStep(app,dir) {
uiWalkPress(app,dir);
uiWalkRelease(app,dir);
}
function uiApplyGridAction(app,actionId) {
const dir = uiDpadDirOf(actionId);
if (app.game.travelOpen && (dir || actionId === 'grid-interact')) return true;
if (actionId === 'grid-interact') {
uiWalkInteract(app);
} else if (actionId === 'travel-toggle') {
uiToggleTravel(app);
} else if (dir) {
uiDpadStep(app,dir);
} else if (uiIsTravelAction(actionId)) {
uiTravelTo(app,actionId);
} else {
return false;
}
return true;
}
function uiSyncGrid(app,active) {
if (!active) uiWalkReleaseAll(app);
uiSyncGridLoop(app,active);
if (active) uiLevelUpAfterRender(app);
}
function uiGridScreen() {
return {
id:'grid',
render:uiRenderGrid,
focusKey:function () { return 'grid-stage'; },
announce:function (app) { return 'The Grid. ' + uiObjectiveText(app) + '.'; },
keyAction:uiGridKeyAction,
keyUp:uiGridKeyUp,
pointerDown:uiGridPointerDown,
pointerUp:uiGridPointerUp,
pointerCancel:uiGridPointerCancel,
applyAction:uiApplyGridAction,
sync:uiSyncGrid,
release:uiWalkReleaseAll,
};
}

export { uiGridScreen, uiEnterGrid };

import { uiToggleSound } from './audio.js';
import { uiResetGame } from './game-storage.js';
import { uiResetGameState } from './game-state.js';
import { uiWalkReleaseAll } from './grid-walk.js';
import { uiShowToast } from './grid-toast.js';
import { uiEnterGrid } from './screen-grid.js';
import { uiLeaveBreach, uiDisconnect } from './breach-flow.js';
import { uiOpenMap, uiCloseMap } from './screen-map.js';
import { uiBreachInert } from './render-submit-panel.js';

function uiStartGame(app) {
uiEnterGrid(app);
if (!app.game.notice) return;
uiShowToast(app,{ text:app.game.notice,kind:'info' });
app.game.notice = null;
}
function uiResetAsked(app) {
return app.menuOpen && Boolean(app.confirmReset);
}
function uiHandleToggleSound(app) {
app.soundOn = uiToggleSound();
if (uiResetAsked(app)) return;
if (app.menuOpen || !app.game.travelOpen) app.lastFocusKey = 'toggle-sound';
}
function uiAskResetProgress(app) {
uiWalkReleaseAll(app);
app.confirmReset = app.menuOpen ? 'menu' :'screen';
app.menuOpen = true;
app.lastFocusKey = 'reset-cancel';
}
function uiCancelReset(app) {
if (!uiResetAsked(app)) return;
app.menuOpen = app.confirmReset === 'menu';
app.confirmReset = null;
app.lastFocusKey = 'reset-progress';
}
function uiConfirmReset(app) {
if (!uiResetAsked(app)) return;
if (app.game.breach) uiLeaveBreach(app);
uiResetGameState(app,uiResetGame(app.game.world));
Object.assign(app,{ run:null,pendingAnnounce:null,menuOpen:false,confirmReset:null,screen:'title',lastFocusKey:'title-start' });
}
function uiOpenMenu(app) {
uiWalkReleaseAll(app);
app.menuOpen = true;
app.confirmReset = null;
app.lastFocusKey = 'menu-close';
}
function uiMenuOpenerKey(app) {
if (app.confirmReset === 'screen') return 'reset-progress';
if (app.screen !== 'grid') return 'open-menu';
return app.game.travelOpen ? 'travel-close' :'grid-stage';
}
function uiCloseMenu(app) {
app.lastFocusKey = uiMenuOpenerKey(app);
app.menuOpen = false;
app.confirmReset = null;
}
function uiMenuDisconnect(app) {
if (app.screen !== 'breach' || uiBreachInert(app)) return;
app.menuOpen = false;
uiDisconnect(app);
}
function uiHandleMapOpen(app) {
uiOpenMap(app);
}
function uiHandleMapClose(app) {
uiCloseMap(app);
}
const UI_NAV_HANDLERS = {
'title-start':uiStartGame,
'toggle-sound':uiHandleToggleSound,
'reset-progress':uiAskResetProgress,
'reset-confirm':uiConfirmReset,
'reset-cancel':uiCancelReset,
'open-menu':uiOpenMenu,
'menu-close':uiCloseMenu,
'menu-disconnect':uiMenuDisconnect,
'map-open':uiHandleMapOpen,
'map-close':uiHandleMapClose,
};
function uiIsNavActionId(actionId) {
return Object.hasOwn(UI_NAV_HANDLERS,actionId);
}
function uiApplyNavAction(app,actionId) {
if (uiIsNavActionId(actionId)) UI_NAV_HANDLERS[actionId](app);
}

export { uiIsNavActionId, uiApplyNavAction };

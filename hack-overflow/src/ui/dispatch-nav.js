import { rigOf } from '../game/rig-catalog.js';
import { uiToggleSound } from './audio.js';
import { uiResetGame } from './game-storage.js';
import { uiResetGameState } from './game-state.js';
import { uiWalkReleaseAll } from './grid-walk.js';
import { uiShowToast } from './grid-toast.js';
import { uiEnterGrid } from './screen-grid.js';
import { uiLeaveBreach, uiDisconnect } from './breach-flow.js';
import { uiOpenMap, uiCloseMap } from './map-loader.js';
import { UI_MENU_RIG_PREFIX, uiRigReplayable } from './menu.js';
import { uiOpenRigHost } from './rig-loader.js';
import { uiBreachInert } from './render-submit-panel.js';
import { uiStoryNext, uiStorySkip } from './story-dialogue.js';
import { uiHistoryPush } from './history.js';

const UI_MAP_FAIL_TEXT = 'MAP could not load. Try again.';
const UI_CASE_FAIL_TEXT = 'The case could not load. Try again.';
const UI_RANK_FAIL_TEXT = 'RANK could not load. Try again.';
const UI_FACE_FAIL_TEXT = 'The menu page could not load. Try again.';

function uiStartGame(app) {
uiHistoryPush(app);
uiEnterGrid(app);
if (!app.game.notice) return;
uiShowToast(app,{ text:app.game.notice,kind:'info' });
app.game.notice = null;
}
function uiResetAsked(app) {
return app.menuOpen && Boolean(app.confirmReset);
}
function uiSwitchSound(app) {
app.soundOn = uiToggleSound();
import('./jack-in-card.js').then(function (card) { card.uiMirrorSound(app); }).catch(function () {});
}
function uiHandleToggleSound(app) {
uiSwitchSound(app);
if (uiResetAsked(app) || (app.menuOpen && app.menuFace) || app.story) return;
if (app.menuOpen || !app.game.travelOpen) app.lastFocusKey = 'toggle-sound';
}
function uiHandleSoundKey(app) {
uiSwitchSound(app);
if (app.screen === 'grid' && !app.story && !app.menuOpen) uiShowToast(app,{ text:'SOUND ' + (app.soundOn ? 'ON' :'OFF') + '. X flips it.',kind:'info' });
}
function uiCancelReset(app) {
if (!uiResetAsked(app)) return;
app.menuOpen = app.confirmReset === 'menu';
app.confirmReset = null;
app.menuFace = null;
app.lastFocusKey = 'reset-progress';
}
function uiConfirmReset(app) {
if (!uiResetAsked(app)) return;
if (app.game.breach) uiLeaveBreach(app);
uiResetGameState(app,uiResetGame(app.game.world));
import('./audio-wire.js').then(function (wire) { wire.uiSyncHeroAudio(app); }).catch(function () {});
import('./grid-result-card.js').then(function (card) { card.uiCloseResultCard(app,null); }).catch(function () {});
Object.assign(app,{ lab:null,story:null,forge:null,rig:null,run:null,pendingAnnounce:null,menuOpen:false,confirmReset:null,menuFace:null,screen:'title',lastFocusKey:'title-start' });
}
function uiOpenMenu(app) {
uiWalkReleaseAll(app);
app.menuOpen = true;
app.confirmReset = null;
app.menuFace = null;
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
app.menuFace = null;
}
async function uiMenuFaceAct(app,verb) {
try {
await (await import('./menu-faces.js')).uiMenuFaceAct(app,verb);
} catch (error) {
uiShowToast(app,{ text:UI_FACE_FAIL_TEXT,kind:'info' });
}
}
function uiMenuDisconnect(app) {
if (app.screen !== 'breach' || uiBreachInert(app)) return;
app.menuOpen = false;
uiDisconnect(app);
}
async function uiHandleMapOpen(app) {
try {
await uiOpenMap(app);
} catch (error) {
uiShowToast(app,{ text:UI_MAP_FAIL_TEXT,kind:'info' });
}
}
function uiHandleMapClose(app) {
uiCloseMap(app);
}
async function uiRankSheet(app,verb) {
try {
await (await import('./rank-stats.js'))[verb](app);
} catch (error) {
uiShowToast(app,{ text:UI_RANK_FAIL_TEXT,kind:'info' });
}
}
async function uiCaseGo(app) {
try {
(await import('./grid-chain.js')).uiChainGoLead(app);
} catch (error) {
uiShowToast(app,{ text:UI_CASE_FAIL_TEXT,kind:'info' });
}
}
async function uiOpenFromMenu(app,spec) {
if (app.screen !== 'grid') return;
uiWalkReleaseAll(app);
app.menuOpen = false;
app.confirmReset = null;
try {
await spec.open(app);
} catch (error) {
uiShowToast(app,{ text:spec.failText,kind:'info' });
}
}
async function uiHandleRigReplay(app,actionId) {
const rig = rigOf(actionId.slice(UI_MENU_RIG_PREFIX.length));
if (!rig || !uiRigReplayable(app,rig)) return;
await uiOpenFromMenu(app,{ open:(target) => uiOpenRigHost(target,rig),failText:rig.title + ' could not load. Try again.' });
}
const UI_NAV_HANDLERS = {
'title-start':uiStartGame,
'toggle-sound':uiHandleToggleSound,
'reset-progress':(app) => uiMenuFaceAct(app,'reset'),
'reset-confirm':uiConfirmReset,
'reset-cancel':uiCancelReset,
'toggle-sound-key':uiHandleSoundKey,
'open-menu':uiOpenMenu,
'menu-controls':(app) => uiMenuFaceAct(app,'controls'),
'controls-back':(app) => uiMenuFaceAct(app,'back'),
'controls-toggle':(app) => uiMenuFaceAct(app,'toggle'),
'menu-close':uiCloseMenu,
'menu-disconnect':uiMenuDisconnect,
'map-open':uiHandleMapOpen,
'map-close':uiHandleMapClose,
'rank-open':(app) => uiRankSheet(app,'uiOpenRankStats'),
'rank-close':(app) => uiRankSheet(app,'uiCloseRankStats'),
'case-go':uiCaseGo,
'story-next':uiStoryNext,
'story-skip':uiStorySkip,
};
function uiIsNavActionId(actionId) {
return Object.hasOwn(UI_NAV_HANDLERS,actionId) || actionId.startsWith(UI_MENU_RIG_PREFIX);
}
async function uiApplyNavAction(app,actionId) {
if (Object.hasOwn(UI_NAV_HANDLERS,actionId)) await UI_NAV_HANDLERS[actionId](app);
else if (actionId.startsWith(UI_MENU_RIG_PREFIX)) await uiHandleRigReplay(app,actionId);
}

export { uiCloseMenu, uiIsNavActionId, uiApplyNavAction };

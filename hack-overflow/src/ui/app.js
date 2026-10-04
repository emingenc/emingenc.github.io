import { uiQs, uiMount, uiAnnounce, uiFindByFocusKey, uiRestoreFocus, UI_ROOT_ID, UI_BADGE_ID } from './dom.js';
import { uiLoadSoundOn, uiLoadOnboarded } from './storage.js';
import { UI_ONBOARD_STAGE_CHIP } from './onboarding.js';
import { uiMenuIfOpen } from './menu.js';
import { uiStoryIfOpen } from './story-render.js';
import { uiScreenFor, uiSyncScreens } from './screens.js';
import { uiCreateGame } from './game-state.js';
import { checkMaxTestData } from './judge-client.js';
import { uiVerdictHeld } from './render-submit-panel.js';

const ui = { content:null,audit:null };
function setUiContext(content,audit) {
ui.content = content;
ui.audit = audit;
}
function uiCreateApp() {
return {
screen:'title',run:null,rig:null,soundOn:uiLoadSoundOn(),trayFocusIndex:0,lastPanelKind:null,lastFocusKey:null,
onboardStage:uiLoadOnboarded() ? null :UI_ONBOARD_STAGE_CHIP,onboardMessage:null,menuOpen:false,rainState:null,
pendingAnnounce:null,lastAnnouncedScreen:null,pendingScrollToVerdict:false,
judging:false,
costModelOpen:false,
game:uiCreateGame(ui.content),
};
}
const UI_NARROW_VIEWPORT_MAX = 768;
function uiIsNarrowViewport() {
return window.innerWidth < UI_NARROW_VIEWPORT_MAX;
}
function uiScrollVerdictIntoView(root) {
const panel = root.querySelector('.test-panel');
if (panel && typeof panel.scrollIntoView === 'function') panel.scrollIntoView({ block:'start' });
}
function uiKeepFocusInView() {
const focused = document.activeElement;
if (focused && focused !== document.body && typeof focused.scrollIntoView === 'function') focused.scrollIntoView({ block:'nearest' });
}
function uiApplyPendingScroll(app,root,screenChanged) {
if (screenChanged) {
window.scrollTo(0,0);
uiKeepFocusInView();
} else if (app.pendingScrollToVerdict && uiIsNarrowViewport()) {
uiScrollVerdictIntoView(root);
}
app.pendingScrollToVerdict = false;
}
function uiScrollTopOf(node) {
return node ? node.scrollTop :0;
}
function uiKeepScreenScroll(root,scrollTop) {
if (scrollTop && root.firstChild) root.firstChild.scrollTop = scrollTop;
}
function uiFocusScope(root) {
return root.querySelector('[aria-modal="true"]') || root;
}
function uiAnnounceRender(app,screenText) {
if (screenText) uiAnnounce(screenText);
if (!app.pendingAnnounce || uiVerdictHeld(app)) return;
uiAnnounce(app.pendingAnnounce);
app.pendingAnnounce = null;
}
function uiRenderApp(app) {
const screen = uiScreenFor(app);
const changed = screen.id !== app.lastAnnouncedScreen;
app.lastAnnouncedScreen = screen.id;
if (changed && !app.story) app.lastFocusKey = screen.focusKey(app);
const scrollTop = changed ? 0 :uiScrollTopOf(uiQs(UI_ROOT_ID).firstChild);
const root = uiMount(UI_ROOT_ID,[screen.render(app),uiMenuIfOpen(app),uiStoryIfOpen(app)].filter(Boolean));
uiKeepScreenScroll(root,scrollTop);
uiSyncScreens(app,root);
uiAnnounceRender(app,changed ? screen.announce(app) :null);
uiRestoreFocus(uiFocusScope(root),app.lastFocusKey,uiFindByFocusKey(root,screen.focusKey(app)));
uiApplyPendingScroll(app,root,changed);
}
function uiRenderKeepingFocus(app) {
const active = document.activeElement;
app.lastFocusKey = active && active.getAttribute ? active.getAttribute('data-focus-key') :null;
uiRenderApp(app);
}
const uiJudgeCheckedKeys = {};
function uiShowJudgeDataBadgeFailure() {
const badge = uiQs(UI_BADGE_ID);
if (!badge) return;
badge.textContent = 'judge data check failed';
badge.className = 'selftest-badge selftest-fail';
}
function uiSyncJudgeDataBadge(key) {
if (uiJudgeCheckedKeys[key]) return;
uiJudgeCheckedKeys[key] = true;
checkMaxTestData(key).then(function (check) {
if (!check.inputHashOk || !check.expectedHashOk) uiShowJudgeDataBadgeFailure();
}).catch(function () {
const check = ui.audit.checks.maxTest(key);
if (!check.inputHashOk || !check.expectedHashOk) uiShowJudgeDataBadgeFailure();
});
}

export { ui, setUiContext, uiCreateApp, uiRenderApp, uiRenderKeepingFocus, uiSyncJudgeDataBadge };

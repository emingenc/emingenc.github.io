import { uiEl } from './dom.js';
import { uiWalkReleaseAll } from './grid-walk.js';
import { uiEnterGrid } from './screen-grid.js';

const UI_MAP_SCREEN_ID = 'map';
const UI_MAP_CLOSE_KEY = 'map-close';
const UI_MAP_LOADING_TEXT = 'Map loading.';
const UI_MAP_SECTION_CLASS = 'screen screen-card map-screen';

let uiMapDelegate = null;
let uiMapLoading = null;

function uiMapRender(app) {
if (uiMapDelegate) return uiMapDelegate.render(app);
return uiEl('section',{ className:UI_MAP_SECTION_CLASS,attrs:{ 'data-screen':UI_MAP_SCREEN_ID } });
}
function uiMapFocusKey(app) {
return uiMapDelegate ? uiMapDelegate.focusKey(app) :UI_MAP_CLOSE_KEY;
}
function uiMapAnnounce(app) {
return uiMapDelegate ? uiMapDelegate.announce(app) :UI_MAP_LOADING_TEXT;
}
function uiMapKeyAction(event,app) {
return uiMapDelegate ? uiMapDelegate.keyAction(event,app) :null;
}
function uiMapSync(app,active,root) {
if (uiMapDelegate) uiMapDelegate.sync(app,active,root);
}
function uiMapStubScreen() {
return {
id:UI_MAP_SCREEN_ID,render:uiMapRender,focusKey:uiMapFocusKey,announce:uiMapAnnounce,
keyAction:uiMapKeyAction,sync:uiMapSync,
};
}
function uiImportMap() {
return import('./screen-map.js');
}
async function uiLoadMapModule(importer) {
if (!uiMapLoading) uiMapLoading = importer();
try {
return await uiMapLoading;
} catch (error) {
uiMapLoading = null;
throw error;
}
}
function uiMapCanOpen(app) {
return app.screen === 'grid' && !app.game.breach && !app.menuOpen;
}
async function uiOpenMap(app,importer = uiImportMap) {
if (!uiMapCanOpen(app)) return;
const mod = await uiLoadMapModule(importer);
if (!uiMapCanOpen(app)) return;
uiMapDelegate = mod.uiMapScreen();
uiWalkReleaseAll(app);
app.game.travelOpen = false;
app.screen = UI_MAP_SCREEN_ID;
app.lastFocusKey = UI_MAP_CLOSE_KEY;
}
function uiCloseMap(app) {
if (app.screen === UI_MAP_SCREEN_ID) uiEnterGrid(app);
}

export { uiMapStubScreen,uiOpenMap,uiCloseMap };

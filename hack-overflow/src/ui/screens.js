import { uiRenderTitle } from './render-title.js';
import { uiStartRain, uiStopRain } from './rain.js';
import { uiGridScreen } from './screen-grid.js';
import { uiBreachScreen } from './screen-breach.js';
import { uiDebriefScreen } from './screen-debrief.js';
import { uiLevelUpScreen } from './screen-levelup.js';
import { uiTracedScreen } from './screen-traced.js';
import { uiEndingScreen } from './screen-ending.js';
import { uiMapScreen } from './screen-map.js';
import { uiLabStubScreen } from './lab-loader.js';
import { uiForgeStubScreen } from './forge-loader.js';
import { uiStreamStubScreen } from './stream-loader.js';


function uiSyncTitleRain(app,active,root) {
const canvas = active ? root.querySelector('.rain-canvas') :null;
const current = app.rainState ? app.rainState.ctx.canvas :null;
if (current === canvas) return;
uiStopRain(app.rainState);
app.rainState = canvas ? uiStartRain(canvas) :null;
}
function uiTitleScreen() {
return {
id:'title',render:uiRenderTitle,focusKey:() => 'title-start',announce:() => 'Title screen.',sync:uiSyncTitleRain,
};
}
let uiScreenTable = null;
function uiScreens() {
if (uiScreenTable) return uiScreenTable;
const screens = [uiTitleScreen(),uiGridScreen(),uiBreachScreen(),uiDebriefScreen(),uiLevelUpScreen(),uiTracedScreen(),uiEndingScreen(),uiMapScreen(),uiLabStubScreen(),uiStreamStubScreen(),uiForgeStubScreen()];
uiScreenTable = Object.fromEntries(screens.map(function (screen) { return [screen.id,screen]; }));
return uiScreenTable;
}
function uiScreenFor(app) {
const screens = uiScreens();
return Object.hasOwn(screens,app.screen) ? screens[app.screen] :screens.title;
}
function uiSyncScreens(app,root) {
Object.values(uiScreens()).forEach(function (screen) {
if (screen.sync) screen.sync(app,screen.id === app.screen,root);
});
}

export { uiScreenFor, uiSyncScreens };

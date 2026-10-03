import { sectorLocksLeft } from '../game/progress.js';
import { isOpen } from '../game/world.js';
import { uiEl } from './dom.js';
import { uiWalkReleaseAll } from './grid-walk.js';
import { uiEnterGrid } from './screen-grid.js';
import { uiDrawMapInto } from './map-draw.js';

let uiMapResizer = null;

function uiOpenMap(app) {
if (app.screen !== 'grid') return;
uiWalkReleaseAll(app);
app.game.travelOpen = false;
app.screen = 'map';
app.lastFocusKey = 'map-close';
}
function uiCloseMap(app) {
if (app.screen === 'map') uiEnterGrid(app);
}
function uiMapSectorEntry(game,sector) {
const gate = game.world.gates[sector.key];
return {
name:sector.name,
total:sector.keys.length,
done:sector.keys.length - sectorLocksLeft(game.world,game.progress,sector.key),
gateLevel:gate && !isOpen(game.world,game.progress,gate.id) ? gate.level :null,
coreClaimed:game.progress.cores.has(sector.key),
encrypted:false,
};
}
function uiMapEncryptedEntry(entry) {
return { name:entry.name,total:0,done:0,gateLevel:null,coreClaimed:false,encrypted:true };
}
function uiMapProgressEntries(game) {
const live = Object.values(game.world.sectors).map((sector) => uiMapSectorEntry(game,sector));
const sealed = game.world.encrypted.map(uiMapEncryptedEntry);
return [...live,...sealed];
}
function uiMapVisibleProgress(entry) {
return entry.total === 0 ? 'no locks placed' :entry.done + '/' + entry.total + ' locks';
}
function uiMapVisibleText(entry) {
if (entry.encrypted) return entry.name + ': ENCRYPTED';
const gate = entry.gateLevel === null ? '' :' · GATE LV ' + entry.gateLevel;
const core = entry.coreClaimed ? ' · CORE claimed' :'';
return entry.name + ': ' + uiMapVisibleProgress(entry) + gate + core;
}
function uiMapSpokenProgress(entry) {
return entry.total === 0 ? 'no locks placed' :entry.done + ' of ' + entry.total + ' locks';
}
function uiMapSpokenText(entry) {
const gate = entry.gateLevel === null ? '' :', needs level ' + entry.gateLevel;
const core = entry.coreClaimed ? ', core claimed' :'';
return entry.name + ': ' + uiMapSpokenProgress(entry) + gate + core;
}
function uiMapProgressItem(entry) {
const className = entry.encrypted ? 'map-progress-item is-encrypted' :'map-progress-item';
return uiEl('li',{ className,text:uiMapVisibleText(entry) });
}
function uiMapProgressList(game) {
const items = uiMapProgressEntries(game).map(uiMapProgressItem);
return uiEl('ul',{ className:'map-progress',attrs:{ 'aria-label':'Sector progress' },children:items });
}
function uiRenderMap(app) {
return uiEl('section',{
className:'screen screen-card map-screen',
attrs:{ 'data-screen':'map' },
children:[
uiEl('h1',{ className:'map-title',text:'MAP' }),
uiEl('div',{ className:'map-canvas-wrap',children:[uiEl('canvas',{ className:'map-canvas',attrs:{ 'aria-hidden':'true' } })] }),
uiMapProgressList(app.game),
uiEl('button',{
className:'btn btn-primary map-close',
text:'CLOSE',
attrs:{ type:'button','data-action':'map-close','data-focus-key':'map-close' },
}),
],
});
}
function uiMapKeyAction(event) {
if (event.key !== 'Escape' && event.key !== 'o' && event.key !== 'O') return null;
event.preventDefault();
if (event.repeat) return { type:'handled' };
return { type:'action',id:'map-close' };
}
function uiSyncMap(app,active,root) {
if (uiMapResizer) uiMapResizer.disconnect();
uiMapResizer = null;
if (!active) return;
const canvas = root.querySelector('.map-canvas');
if (!canvas) return;
uiMapResizer = new ResizeObserver(function () {
uiDrawMapInto(canvas,{ world:app.game.world,progress:app.game.progress,avatar:app.game.avatar.pos });
});
uiMapResizer.observe(canvas);
}
function uiMapAnnounce(app) {
const entries = uiMapProgressEntries(app.game);
const live = entries.filter((entry) => !entry.encrypted).map(uiMapSpokenText).join('. ');
const encryptedCount = entries.filter((entry) => entry.encrypted).length;
return 'Map. ' + live + '. ' + encryptedCount + ' more sectors ENCRYPTED.';
}
function uiMapScreen() {
return {
id:'map',
render:uiRenderMap,
focusKey:function () { return 'map-close'; },
announce:uiMapAnnounce,
keyAction:uiMapKeyAction,
sync:uiSyncMap,
};
}

export { uiMapScreen, uiOpenMap, uiCloseMap };

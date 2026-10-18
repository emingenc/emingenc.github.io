import { sectorLocksLeft } from '../game/progress.js';
import { travelTargets } from '../game/travel.js';
import { isOpen } from '../game/world.js';
import { encryptedHook } from '../game/story/story.js';
import { uiRenderApp } from './app.js';
import { uiEl } from './dom.js';
import { uiCurrentObjective } from './grid-objective.js';
import { uiTravelTo } from './grid-travel.js';
import { uiDrawLegendInto,uiDrawMapInto } from './map-draw.js';
import { uiMapLayoutOf } from './map-marks.js';
import { uiMapCellAt,uiMapPick } from './map-pick.js';
import { uiEnterGrid } from './screen-grid.js';
import { hasBeat } from '../game/ext/ops.js';

let uiMapResizer = null;

function uiMapSectorEntry(game,sector) {
const gate = game.world.gates[sector.key];
return {
key:sector.key,
name:sector.name,
total:sector.keys.length,
done:sector.keys.length - sectorLocksLeft(game.world,game.progress,sector.key),
gateLevel:gate && !isOpen(game.world,game.progress,gate.id) ? gate.level :null,
coreClaimed:game.progress.cores.has(sector.key),
encrypted:false,
};
}
function uiMapEncryptedEntry(entry) {
return { name:entry.name,family:entry.family,total:0,done:0,gateLevel:null,coreClaimed:false,encrypted:true };
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
if (entry.encrypted) return entry.name + ': ENCRYPTED · ' + encryptedHook(entry.family);
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
function uiMapTravel(app,target) {
uiEnterGrid(app);
uiTravelTo(app,'travel-' + target.id);
uiRenderApp(app);
}
function uiMapTargets(game) {
return travelTargets(game.world,game.progress,game.avatar.pos,game.save);
}
function uiMapSectorItem(app,entry,targets) {
const target = targets.find((row) => row.sector === entry.key);
if (!target) return uiEl('li',{ className:'map-progress-item',text:uiMapVisibleText(entry) });
const go = uiEl('button',{
className:'map-sector-go',
children:[uiEl('span',{ text:uiMapVisibleText(entry) }),uiEl('span',{ className:'map-sector-to',text:'→ ' + target.label })],
attrs:{ type:'button','data-focus-key':'map-go-' + entry.key,'aria-label':'Go to ' + target.label + ', in ' + uiMapSpokenText(entry) },
});
go.addEventListener('click',function () { uiMapTravel(app,target); });
return uiEl('li',{ className:'map-progress-item',children:[go] });
}
function uiMapEncryptedItem(entries) {
const lines = entries.map((entry) => uiEl('li',{ text:uiMapVisibleText(entry) }));
const summary = uiEl('summary',{ className:'map-encrypted-summary',text:'+' + entries.length + ' sectors ENCRYPTED' });
const list = uiEl('ul',{ className:'map-encrypted-list',children:lines });
return uiEl('li',{ className:'map-progress-item is-encrypted',children:[uiEl('details',{ children:[summary,list] })] });
}
function uiMapProgressList(app) {
const entries = uiMapProgressEntries(app.game);
const targets = uiMapTargets(app.game);
const live = entries.filter((entry) => !entry.encrypted).map((entry) => uiMapSectorItem(app,entry,targets));
const sealed = entries.filter((entry) => entry.encrypted);
const items = sealed.length ? [...live,uiMapEncryptedItem(sealed)] :live;
return uiEl('ul',{ className:'map-progress',attrs:{ 'aria-label':'Sector progress' },children:items });
}
function uiRenderMap(app) {
const close = uiEl('button',{
className:'btn btn-primary map-close',
text:'CLOSE',
attrs:{ type:'button','data-action':'map-close','data-focus-key':'map-close' },
});
return uiEl('section',{
className:'screen screen-card map-screen',
attrs:{ 'data-screen':'map' },
children:[
uiEl('div',{ className:'map-head',children:[uiEl('h1',{ className:'map-title',text:'MAP' }),close] }),
uiEl('div',{ className:'map-canvas-wrap',children:[uiEl('canvas',{ className:'map-canvas',attrs:{ 'aria-hidden':'true' } })] }),
uiEl('canvas',{ className:'map-legend',attrs:{ 'aria-hidden':'true' } }),
uiEl('p',{ className:'map-hint',text:'TAP A LOCK, MACHINE OR SECTOR TO GO THERE' }),
uiMapProgressList(app),
],
});
}
function uiMapKeyAction(event) {
if (event.key !== 'Escape' && event.key !== 'o' && event.key !== 'O') return null;
event.preventDefault();
if (event.repeat) return { type:'handled' };
return { type:'action',id:'map-close' };
}
function uiMapObjectiveCell(app) {
const thing = app.game.world.things[uiCurrentObjective(app).targetId];
return thing ? { col:thing.col,row:thing.row } :null;
}
function uiPaintMap(app,canvas,legend) {
const game = app.game;
const state = { world:game.world,progress:game.progress,save:game.save,avatar:game.avatar.pos,objective:uiMapObjectiveCell(app),legend:false };
if (hasBeat(game.ext,'halted')) {
import('./screen-halt.js').then((halt) => halt.uiDrawHaltedMap(canvas,state,legend));
return;
}
if (legend) uiDrawLegendInto(legend,state);
uiDrawMapInto(canvas,state);
}
function uiMapTap(app,canvas,event) {
const layout = uiMapLayoutOf(canvas);
const box = canvas.getBoundingClientRect();
const cell = uiMapCellAt(app.game.world,layout,{ x:event.clientX - box.left,y:event.clientY - box.top });
const target = cell ? uiMapPick(app.game.world,uiMapTargets(app.game),{ cell,tile:layout.tile }) :null;
if (target) uiMapTravel(app,target);
}
const CELL_MIDDLE = 0.5;
const HALF = 2;
const REACH_PX = 40;
function uiCentreOnHero(app,canvas) {
const layout = uiMapLayoutOf(canvas);
const wrap = canvas.parentNode;
if (!layout || wrap.scrollWidth <= wrap.clientWidth || wrap.dataset.centred) return;
wrap.dataset.centred = 'yes';
const centreOf = (cell) => layout.left + (cell.col + CELL_MIDDLE) * layout.tile;
const hero = centreOf(app.game.avatar.pos);
const goal = uiMapObjectiveCell(app);
const apart = goal ? Math.abs(centreOf(goal) - hero) :Infinity;
const middle = apart <= wrap.clientWidth - 2 * REACH_PX ? (hero + centreOf(goal)) / HALF :hero;
wrap.scrollLeft = middle - wrap.clientWidth / HALF;
}
function uiSyncMap(app,active,root) {
if (uiMapResizer) uiMapResizer.disconnect();
uiMapResizer = null;
if (!active) return;
const canvas = root.querySelector('.map-canvas');
if (!canvas) return;
canvas.addEventListener('click',function (event) { uiMapTap(app,canvas,event); });
canvas.style.setProperty('--map-ratio',app.game.world.cols + ' / ' + app.game.world.rows);
uiMapResizer = new ResizeObserver(function () {
uiPaintMap(app,canvas,root.querySelector('.map-legend'));
uiCentreOnHero(app,canvas);
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

export { uiMapScreen };

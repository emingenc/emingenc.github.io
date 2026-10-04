import { findPath } from '../game/path.js';
import { sectorName } from '../game/messages.js';
import { travelTargets } from '../game/travel.js';
import { MAX_STARS_PER_LOCK } from '../logic/index.js';
import { uiEl } from './dom.js';
import { uiStarGlyphs } from './format.js';
import { uiWalkPath, uiWalkReleaseAll } from './grid-walk.js';
import { uiShowToast } from './grid-toast.js';
import { uiRoveKeyDown } from './menu.js';

const UI_TRAVEL_PREFIX = 'travel-';
const UI_TRAVEL_PANEL_ID = 'grid-travel-panel';
const UI_TRAVEL_CLOSE_KEY = 'travel-close';
let uiTravelListScroll = 0;
function uiTravelState(target) {
if (target.kind === 'rig') return 'MACHINE';
if (target.kind === 'terminal') return target.state === 'breached' ? 'BREACHED ' + uiStarGlyphs(target.stars) :'LOCKED';
return target.kind === 'core' ? 'READY' :'OPEN';
}
function uiTravelStateWords(target) {
if (target.kind !== 'terminal' || target.state !== 'breached') return uiTravelState(target);
return 'BREACHED, ' + target.stars + ' of ' + MAX_STARS_PER_LOCK + ' stars';
}
function uiRouteTo(game,id) {
const thing = game.world.things[id];
return findPath(game.world,game.progress,{ from:game.avatar.pos,to:{ col:thing.col,row:thing.row } });
}
function uiTravelSectorText(world,target) {
return (target.kind === 'terminal' || target.kind === 'rig') && target.sector ? sectorName(world,target.sector) :'';
}
function uiTravelStepsText(target) {
return target.steps + (target.steps === 1 ? ' step' :' steps');
}
function uiTravelMetaText(world,target) {
const sector = uiTravelSectorText(world,target);
return (sector ? sector + ' · ' :'') + uiTravelStepsText(target);
}
function uiTravelAriaLabel(world,target) {
const parts = ['Go to ' + target.label,uiTravelSectorText(world,target),uiTravelStateWords(target),uiTravelStepsText(target)];
return parts.filter(Boolean).join(', ');
}
function uiTravelInfo(world,target) {
return uiEl('span',{ className:'travel-go-info',children:[
uiEl('span',{ className:'travel-go-meta',text:uiTravelMetaText(world,target) }),
uiEl('span',{ className:'travel-go-state',text:uiTravelState(target) }),
] });
}
function uiTravelBody(world,target) {
return uiEl('span',{ className:'travel-go-body',children:[uiEl('span',{ className:'travel-go-name',text:target.label }),uiTravelInfo(world,target)] });
}
function uiTravelButton(world,target,key) {
return uiEl('button',{
className:'btn btn-ghost travel-go',
attrs:{ type:'button','data-action':key,'data-focus-key':key,'aria-label':uiTravelAriaLabel(world,target) },
children:[uiEl('span',{ className:'travel-go-tag',text:'GO' }),uiTravelBody(world,target)],
});
}
function uiTravelRow(world,target) {
const key = UI_TRAVEL_PREFIX + target.id;
return { node:uiTravelButton(world,target,key),key };
}
function uiTravelClose() {
return uiEl('button',{
className:'btn btn-ghost grid-travel-close',text:'CLOSE',
attrs:{ type:'button','data-action':'travel-toggle','data-focus-key':UI_TRAVEL_CLOSE_KEY,'aria-label':'Close travel' },
});
}
function uiTravelPanel(app,targets) {
const close = { node:uiTravelClose(),key:UI_TRAVEL_CLOSE_KEY };
const rows = targets.map((target) => uiTravelRow(app.game.world,target));
const heading = uiEl('h2',{ className:'grid-travel-heading',text:'TRAVEL (' + targets.length + ')' });
const list = uiEl('ul',{ className:'grid-travel-list',children:rows.map((row) => uiEl('li',{ children:[row.node] })) });
list.addEventListener('scroll',function () { uiTravelListScroll = list.scrollTop; });
const panel = uiEl('div',{
className:'grid-travel-panel',
attrs:{ id:UI_TRAVEL_PANEL_ID,role:'dialog','aria-label':'Travel' },
children:[uiEl('div',{ className:'grid-travel-head',children:[heading,close.node] }),list],
});
panel.addEventListener('keydown',uiRoveKeyDown(app,[close,...rows]));
return panel;
}
function uiTravelToggle(app,count) {
return uiEl('button',{
className:'btn btn-ghost grid-travel-toggle',text:'TRAVEL (' + count + ')',
attrs:{
type:'button','data-action':'travel-toggle','data-focus-key':'travel-toggle','aria-keyshortcuts':'T',
'aria-expanded':app.game.travelOpen ? 'true' :'false','aria-controls':UI_TRAVEL_PANEL_ID,
},
});
}
function uiRestoreTravelScroll(panel) {
const list = panel.querySelector('.grid-travel-list');
queueMicrotask(function () { list.scrollTop = uiTravelListScroll; });
}
function uiGridTravel(app) {
const targets = travelTargets(app.game.world,app.game.progress,app.game.avatar.pos,app.game.save);
const panel = uiTravelPanel(app,targets);
if (app.game.travelOpen) uiRestoreTravelScroll(panel);
else panel.setAttribute('hidden','');
return uiEl('nav',{ className:'grid-travel',attrs:{ 'aria-label':'Travel' },children:[uiTravelToggle(app,targets.length),panel] });
}
function uiToggleTravel(app) {
const game = app.game;
game.travelOpen = !game.travelOpen;
if (game.travelOpen) {
uiTravelListScroll = 0;
uiWalkReleaseAll(app);
game.walk.plan = null;
}
app.lastFocusKey = game.travelOpen ? UI_TRAVEL_CLOSE_KEY :'grid-stage';
}
function uiIsTravelAction(actionId) {
return actionId.indexOf(UI_TRAVEL_PREFIX) === 0 && actionId !== 'travel-toggle';
}
function uiTravelTo(app,actionId) {
const game = app.game;
const id = actionId.slice(UI_TRAVEL_PREFIX.length);
const dirs = Object.hasOwn(game.world.things,id) ? uiRouteTo(game,id) :null;
if (dirs) uiWalkPath(app,{ dirs });
else uiShowToast(app,{ text:'No route there yet',kind:'warn' });
game.travelOpen = false;
app.lastFocusKey = 'grid-stage';
}

export { uiGridTravel, uiToggleTravel, uiIsTravelAction, uiTravelTo };

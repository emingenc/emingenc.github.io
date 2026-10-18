import { findPath } from '../game/path.js';
import { travelTargets } from '../game/travel.js';
import { uiEl } from './dom.js';
import { uiWalkPath, uiWalkReleaseAll } from './grid-walk.js';
import { uiShowToast } from './grid-toast.js';
import { uiLinkStyle } from './lazy-style.js';
import { uiRoveKeyDown } from './menu.js';
import { uiRenderKeepingFocus } from './app.js';

const UI_TRAVEL_PREFIX = 'travel-';
const UI_TRAVEL_PANEL_ID = 'grid-travel-panel';
const UI_TRAVEL_CLOSE_KEY = 'travel-close';
const UI_TRAVEL_LIST_STYLE = 'styles/lazy/grid-travel-list.css';
const UI_ROUTE_CHIPS = ['go','resume','around'];
let uiTravelListScroll = 0;
function uiRouteTo(app,id) {
const game = app.game;
const thing = game.world.things[id];
const avoid = game.tapAvoid ? game.tapAvoid(app) :undefined;
return findPath(game.world,game.progress,{ from:game.avatar.pos,to:{ col:thing.col,row:thing.row },avoid });
}
function uiTravelFlatList(targets) {
const rows = targets.map(function (target) {
const key = UI_TRAVEL_PREFIX + target.id;
const text = 'GO ' + target.label + ' · ' + target.steps + ' steps';
return { key,node:uiEl('button',{ className:'btn btn-ghost travel-go',text,attrs:{ type:'button','data-action':key,'data-focus-key':key } }) };
});
return { node:uiEl('ul',{ className:'grid-travel-list',children:rows.map((row) => uiEl('li',{ children:[row.node] })) }),stops:rows };
}
function uiTravelClose() {
return uiEl('button',{
className:'btn btn-ghost grid-travel-close',text:'CLOSE',
attrs:{ type:'button','data-action':'travel-toggle','data-focus-key':UI_TRAVEL_CLOSE_KEY,'aria-label':'Close travel' },
});
}
function uiTravelPanel(app,targets) {
const close = { node:uiTravelClose(),key:UI_TRAVEL_CLOSE_KEY };
const view = app.game.travelView;
const body = view ? view.list(app,targets) :uiTravelFlatList(targets);
const heading = uiEl('h2',{ className:'grid-travel-heading',text:'TRAVEL (' + targets.length + ')' });
body.node.addEventListener('scroll',function () { uiTravelListScroll = body.node.scrollTop; });
const panel = uiEl('div',{
className:'grid-travel-panel',
attrs:{ id:UI_TRAVEL_PANEL_ID,role:'dialog','aria-label':'Travel' },
children:[uiEl('div',{ className:'grid-travel-head',children:[heading,close.node] }),body.node],
});
panel.addEventListener('keydown',uiRoveKeyDown(app,[close,...body.stops]));
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
function uiLoadTravelView(app) {
const game = app.game;
if (game.travelView || game.travelViewLoad) return;
game.travelViewLoad = Promise.all([import('./grid-travel-list.js'),uiLinkStyle(UI_TRAVEL_LIST_STYLE)]).then(function ([view]) {
game.travelView = view;
if (game.travelOpen && app.screen === 'grid' && typeof document !== 'undefined') uiRenderKeepingFocus(app);
},function () { game.travelViewLoad = null; });
}
function uiGridTravel(app) {
uiLoadTravelView(app);
const targets = travelTargets(app.game.world,app.game.progress,app.game.avatar.pos,app.game.save);
const panel = uiTravelPanel(app,targets);
if (app.game.travelOpen) uiRestoreTravelScroll(panel);
else panel.setAttribute('hidden','');
const chips = app.game.route?.bar(app,targets) || [];
return uiEl('nav',{ className:'grid-travel',attrs:{ 'aria-label':'Travel' },children:[uiTravelToggle(app,targets.length),...chips,panel] });
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
if (game.travelView?.act(app,id)) return;
const thing = game.world.things[id];
const dirs = Object.hasOwn(game.world.things,id) ? uiRouteTo(app,id) :null;
if (UI_ROUTE_CHIPS.includes(id)) game.route?.[id](app);
else if (dirs) uiWalkPath(app,{ dirs,target:{ cell:{ col:thing.col,row:thing.row },id } });
else uiShowToast(app,{ text:'No route there yet',kind:'warn' });
game.travelOpen = false;
app.lastFocusKey = 'grid-stage';
}

export { uiGridTravel, uiToggleTravel, uiIsTravelAction, uiTravelTo };

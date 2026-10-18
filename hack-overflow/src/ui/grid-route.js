import { cellToward } from '../game/move.js';
import { cellKey,findPath } from '../game/path.js';
import { detour,foeHint,foeName,guardPath,hazardCells,isStatic } from '../game/route-guard.js';
import { travelTargets } from '../game/travel.js';
import { uiRenderKeepingFocus } from './app.js';
import { uiEl } from './dom.js';
import { uiShowToast } from './grid-toast.js';
import { uiWalkPath } from './grid-walk.js';
import { uiLinkStyle } from './lazy-style.js';

const STYLE_HREF = 'styles/lazy/grid-route.css';
const MAX_TRIES = 2;
const WENT_ROUND = 'Went round it';
const BLOCKED = 'Blocked. No way round.';
const NO_AROUND = 'No way round it.';
const NO_ROUTE = 'No route there yet';
const CHIP_PREFIX = 'travel-';

function uiFresh(target) {
return { target:target ? { label:'',...target } :null,held:null,avoid:new Set(),tries:0,accept:new Set() };
}
function uiSame(one,other) {
return cellKey(one) === cellKey(other);
}
function uiFoesOf(game) {
return (game.fight?.actors || []).filter((foe) => foe.kind !== 'crate');
}
function uiMitesOf(game) {
return game.opening ? [] :game.fight?.mites || [];
}
function uiReach(game,foes,mites) {
return hazardCells(foes,game.avatar.pos,{ mites,calm:Boolean(game.fight?.calm) });
}
function uiHazards(game,route) {
const hazards = uiReach(game,uiFoesOf(game),uiMitesOf(game));
route.accept.forEach((key) => hazards.delete(key));
return hazards;
}
function uiDistance(foe,cell) {
return Math.max(Math.abs(foe.col - cell.col),Math.abs(foe.row - cell.row));
}
function uiCulprit(game,cell) {
const key = cellKey(cell);
const near = uiFoesOf(game).filter((foe) => uiReach(game,[foe],[]).has(key)).sort((one,two) => uiDistance(one,cell) - uiDistance(two,cell));
return near.length > 0 ? near[0].kind :'mite';
}
function uiAvoid(app,extra) {
const solids = app.game.tapAvoid ? app.game.tapAvoid(app) :[];
return new Set([...solids,...extra]);
}
function uiPlan(app,cell,avoid) {
const game = app.game;
return findPath(game.world,game.progress,{ from:game.avatar.pos,to:cell,avoid:uiAvoid(app,avoid) });
}
function uiAround(app,way) {
const game = app.game;
return detour({ world:game.world,progress:game.progress,from:game.avatar.pos,to:way.cell,hazards:uiAvoid(app,way.hazards),base:way.base });
}
function uiBegin(app,plan) {
if (!plan.keep) Object.assign(app.game.route,uiFresh(plan.target));
}
function uiBump(game,dir) {
return { pos:{ ...game.avatar.pos },facing:dir,event:{ type:'danger',hold:true } };
}
function uiHold(app,cell,hazards) {
const { game } = app;
const route = game.route;
const dirs = [...game.walk.plan.dirs];
const around = route.target ? uiAround(app,{ cell:route.target.cell,hazards,base:dirs }) :null;
return { from:{ ...game.avatar.pos },cell,kind:uiCulprit(game,cell),dirs,around,said:false };
}
function uiGuard(app,dir) {
const { game } = app;
const plan = game.walk.plan;
if (!plan || plan.dirs[0] !== dir) return null;
const hazards = uiHazards(game,game.route);
const check = guardPath({ from:game.avatar.pos,dirs:[dir],hazards });
if (!check.held) return null;
game.route.held = uiHold(app,check.hazardCell,hazards);
return uiBump(game,dir);
}
function uiSayHold(app,held) {
const around = held.around ? ' · go around +' + held.around.extra :'';
uiShowToast(app,{ text:foeName(held.kind) + ' ahead. ' + foeHint(held.kind) + around,kind:'warn' });
held.said = true;
uiRenderKeepingFocus(app);
}
function uiBlocked(app) {
const { game } = app;
game.route.held = { from:{ ...game.avatar.pos },cell:null,kind:null,dirs:[],around:null,said:true,blocked:true };
uiShowToast(app,{ text:BLOCKED,kind:'warn' });
uiRenderKeepingFocus(app);
}
function uiReroute(app,stalledDir) {
const { game } = app;
const route = game.route;
if (!route.target) return;
route.avoid.add(cellKey(cellToward(game.avatar.pos,stalledDir)));
const dirs = route.tries < MAX_TRIES ? uiPlan(app,route.target.cell,route.avoid) :null;
route.tries += 1;
if (!dirs) { uiBlocked(app); return; }
uiWalkPath(app,{ dirs,target:route.target,keep:true });
uiShowToast(app,{ text:WENT_ROUND,kind:'info' });
}
function uiArrive(app) {
Object.assign(app.game.route,uiFresh(null));
uiRenderKeepingFocus(app);
}
function uiStalled(app,dir,last) {
const held = app.game.route.held;
if (held && !held.said) uiSayHold(app,held);
else if (last) uiArrive(app);
else uiReroute(app,dir);
}
function uiWalking(walk) {
return Boolean(walk.plan) && walk.plan.dirs.length > 0;
}
function uiKey(game) {
const route = game.route;
if (uiWalking(game.walk)) return '';
if (route.held && uiSame(route.held.from,game.avatar.pos)) return route.held.around ? 'held-around' :'held';
return route.target ? 'go' :'';
}
function uiSync(app) {
const route = app.game.route;
const key = uiKey(app.game);
if (key === route.drawn) route.tried = null;
else if (key !== route.tried) {
route.tried = key;
uiRenderKeepingFocus(app);
}
}
function uiSentryStop(step) {
return step?.event?.type === 'danger' && !step.event.hold;
}
function uiAfter(app,before,after,step) {
uiSync(app);
if (before === after || !before.plan || before.plan.dirs.length === 0) return;
const last = before.plan.dirs.length === 1;
if (after.plan === null && after.stalled) { if (!uiSentryStop(step)) uiStalled(app,after.stalled,last); }
else if (last && !after.plan?.dirs.length) uiArrive(app);
}
function uiChip(kind,text,aria) {
const key = CHIP_PREFIX + kind;
return uiEl('button',{
className:'btn btn-ghost grid-route-chip grid-route-' + kind,
attrs:{ type:'button','data-action':key,'data-focus-key':key,'aria-label':aria },
children:[uiEl('span',{ className:'grid-route-label',text })],
});
}
function uiHeldChips(held) {
const resume = uiChip('resume','RESUME ROUTE','Resume the route');
if (!held.around) return [resume];
const extra = held.around.extra;
return [resume,uiChip('around','GO AROUND +' + extra,'Go around, ' + extra + (extra === 1 ? ' more step' :' more steps'))];
}
function uiGoChip(route,targets) {
const row = targets.find((target) => target.id === route.target.id);
const label = route.target.label || row?.label || 'THERE';
return uiChip('go','GO ' + label,'Go to ' + label);
}
function uiBar(app,targets) {
const { game } = app;
const route = game.route;
route.drawn = uiKey(game);
if (route.drawn === '') return [];
if (route.drawn === 'go') return [uiGoChip(route,targets)];
return uiHeldChips(route.held);
}
function uiNext(app) {
const { game } = app;
const row = travelTargets(game.world,game.progress,game.avatar.pos,game.save)[0];
const thing = row ? game.world.things[row.id] :null;
return thing ? { id:row.id,cell:{ col:thing.col,row:thing.row },label:row.label } :null;
}
function uiGo(app) {
const target = app.game.route.target || uiNext(app);
const dirs = target ? uiPlan(app,target.cell,[]) :null;
if (dirs) uiWalkPath(app,{ dirs,target });
else uiShowToast(app,{ text:NO_ROUTE,kind:'warn' });
}
function uiAccept(game,route,cell) {
route.accept.add(cellKey(cell));
uiFoesOf(game).filter((foe) => isStatic(foe.kind)).map((foe) => uiReach(game,[foe],[])).filter((reach) => reach.has(cellKey(cell)))
.forEach((reach) => reach.forEach((key) => route.accept.add(key)));
}
function uiResume(app) {
const { game } = app;
const route = game.route;
const held = route.held;
route.held = null;
if (!held || held.blocked || !uiSame(held.from,game.avatar.pos)) { uiGo(app); return; }
if (isStatic(held.kind)) uiAccept(game,route,held.cell);
uiWalkPath(app,{ dirs:held.dirs,target:route.target,keep:true });
}
function uiGoAround(app) {
const { game } = app;
const route = game.route;
const held = route.held;
const found = held && route.target ? uiAround(app,{ cell:route.target.cell,hazards:uiHazards(game,route),base:held.dirs }) :null;
if (!found) { uiShowToast(app,{ text:NO_AROUND,kind:'warn' }); return; }
route.held = null;
uiWalkPath(app,{ dirs:found.dirs,target:route.target,keep:true });
}
function uiInstallRoute(app) {
if (app.game.route) return;
uiLinkStyle(STYLE_HREF);
app.game.route = { ...uiFresh(null),drawn:'',tried:null,begin:uiBegin,guard:uiGuard,after:uiAfter,bar:uiBar,go:uiGo,resume:uiResume,around:uiGoAround };
}

export { uiInstallRoute };

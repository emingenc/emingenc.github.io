import { sectorName } from '../game/messages.js';
import { travelGroups } from '../game/travel-groups.js';
import { MAX_STARS_PER_LOCK } from '../logic/index.js';
import { uiEl } from './dom.js';
import { uiStarGlyphs } from './format.js';
import { uiCurrentObjective } from './grid-objective.js';
import { GIVER_PREFIX,uiTravelGivers } from './grid-travel-givers.js';
import { uiQuestTravel } from './quest-travel.js';

const PREFIX = 'travel-';
const FOLD_PREFIX = 'fold-';
const NEXT_HEADING = 'NEXT';
const LEADS_HEADING = 'LEADS';
const LEADS_KEY = 'leads';

function uiTravelState(target) {
if (target.kind === 'giver') return target.tag;
if (target.kind === 'rig') return 'MACHINE';
if (target.kind === 'terminal') return target.state === 'breached' ? 'BREACHED ' + uiStarGlyphs(target.stars) :'LOCKED';
return target.kind === 'core' ? 'READY' :'OPEN';
}
function uiTravelStateWords(target) {
if (target.kind !== 'terminal' || target.state !== 'breached') return uiTravelState(target);
return 'BREACHED, ' + target.stars + ' of ' + MAX_STARS_PER_LOCK + ' stars';
}
function uiTravelSectorText(world,target) {
return ['terminal','rig','giver'].includes(target.kind) && target.sector ? sectorName(world,target.sector) :'';
}
function uiTravelStepsText(target) {
return target.steps + (target.steps === 1 ? ' step' :' steps');
}
function uiTravelAriaLabel(world,target) {
const parts = ['Go to ' + target.label,uiTravelSectorText(world,target),uiTravelStateWords(target),uiTravelStepsText(target)];
return parts.filter(Boolean).join(', ');
}
function uiTravelMeta(world,target,named) {
const sector = named ? uiTravelSectorText(world,target) :'';
return (sector ? sector + ' · ' :'') + uiTravelStepsText(target);
}
function uiTravelBody(world,target,named) {
const info = uiEl('span',{ className:'travel-go-info',children:[
uiEl('span',{ className:'travel-go-meta',text:uiTravelMeta(world,target,named) }),
uiEl('span',{ className:'travel-go-state',text:uiTravelState(target) }),
] });
return uiEl('span',{ className:'travel-go-body',children:[uiEl('span',{ className:'travel-go-name',text:target.label }),info] });
}
function uiTravelButton(world,target,named) {
const key = PREFIX + target.id;
return { key,node:uiEl('button',{
className:'btn btn-ghost travel-go',
attrs:{ type:'button','data-action':key,'data-focus-key':key,'aria-label':uiTravelAriaLabel(world,target) },
children:[uiEl('span',{ className:'travel-go-tag',text:'GO' }),uiTravelBody(world,target,named)],
}) };
}
function uiFoldStop(group,open,word = 'DONE') {
const key = PREFIX + FOLD_PREFIX + group.key;
const label = group.done.length + ' ' + word;
return { key,node:uiEl('button',{
className:'btn btn-ghost travel-fold',text:(open ? '▾ ' :'▸ ') + label,
attrs:{ type:'button','data-action':key,'data-focus-key':key,'aria-expanded':open ? 'true' :'false','aria-label':(open ? 'Hide ' :'Show ') + label + ' in ' + group.name },
}) };
}
function uiHeading(text,note) {
return uiEl('h3',{ className:'travel-group-name',children:[uiEl('span',{ text }),note ? uiEl('span',{ className:'travel-group-note',text:note }) :null] });
}
function uiRowItem(stop) {
return uiEl('li',{ children:[stop.node] });
}
function uiGroupSection(world,group,open) {
const todo = group.todo.map((target) => uiTravelButton(world,target,false));
const fold = group.done.length ? [uiFoldStop(group,open)] :[];
const done = open ? group.done.map((target) => uiTravelButton(world,target,false)) :[];
const stops = [...todo,...fold,...done];
const note = group.todo.length ? group.todo.length + ' TO DO' :'ALL DONE';
const list = uiEl('ul',{ className:'travel-group-rows',children:stops.map(uiRowItem) });
return { stops,node:uiEl('li',{ className:'travel-group',children:[uiHeading(group.name,note),list] }) };
}
function uiTopSection(heading,className,stops) {
const list = uiEl('ul',{ className:'travel-group-rows',children:stops.map(uiRowItem) });
return { stops,node:uiEl('li',{ className:'travel-group ' + className,children:[uiHeading(heading),list] }) };
}
function uiLeadsSection(world,leads,open) {
const [first,...rest] = leads;
const fold = rest.length ? [uiFoldStop({ key:LEADS_KEY,name:LEADS_HEADING,done:rest },open,'MORE')] :[];
const more = open ? rest.map((row) => uiTravelButton(world,row,true)) :[];
return uiTopSection(LEADS_HEADING,'travel-leads',[uiTravelButton(world,first,true),...fold,...more]);
}
function uiPinId(app) {
return uiCurrentObjective(app).targetId;
}
function uiOpened(game) {
if (!game.travelOpened) game.travelOpened = new Set();
return game.travelOpened;
}
function uiSections(app,targets) {
const world = app.game.world;
const opened = uiOpened(app.game);
const { pinned,groups } = travelGroups(world,targets,uiPinId(app));
const leads = uiTravelGivers(app);
const top = [];
if (pinned) top.push(uiTopSection(NEXT_HEADING,'travel-next',[uiTravelButton(world,pinned,true)]));
if (leads.length) top.push(uiLeadsSection(world,leads,opened.has(LEADS_KEY)));
return [...top,...groups.map((group) => uiGroupSection(world,group,opened.has(group.key)))];
}
function list(app,targets) {
const sections = uiSections(app,targets);
return { node:uiEl('ul',{ className:'grid-travel-list',children:sections.map((section) => section.node) }),stops:sections.flatMap((section) => section.stops) };
}
function act(app,id) {
const game = app.game;
if (id.startsWith(FOLD_PREFIX)) {
const key = id.slice(FOLD_PREFIX.length);
const opened = uiOpened(game);
if (!opened.delete(key)) opened.add(key);
app.lastFocusKey = PREFIX + id;
return true;
}
if (!id.startsWith(GIVER_PREFIX)) return false;
const giver = uiTravelGivers(app).find((row) => row.id === id);
if (giver) uiQuestTravel(app,giver.cell);
else game.travelOpen = false;
app.lastFocusKey = 'grid-stage';
return true;
}

export { list,act };

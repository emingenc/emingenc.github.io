import { rigPlate } from '../game/messages.js';
import { DIRS, cellToward } from '../game/move.js';
import { thingAt } from '../game/world.js';
import { uiEl, uiPointerIsCoarse } from './dom.js';


const UI_HINT_TOUCH = 'Tap the map to walk. Follow the pulsing arrow.';
const UI_HINT_KEYS = 'Arrow keys walk. Follow the pulsing arrow.';

function uiCreateHint() {
return uiEl('p',{
className:'grid-hint',
text:uiPointerIsCoarse() ? UI_HINT_TOUCH :UI_HINT_KEYS,
attrs:{ 'aria-hidden':'true' },
});
}
function uiHintWanted(game) {
const spawn = game.world.spawn;
const pos = game.avatar.pos;
return game.progress.breached.size === 0 && pos.col === spawn.col && pos.row === spawn.row;
}
function uiSyncHint(game) {
const node = game.stage.hint;
const hidden = !uiHintWanted(game);
if (node.hidden !== hidden) node.hidden = hidden;
}

const UI_NEAR_KINDS = new Set(['terminal','core','kernel','rig']);
const UI_PLATE_PARTS = ['title','line','act'];

function uiCreateNearPlate() {
const parts = Object.fromEntries(UI_PLATE_PARTS.map(function (part) { return [part,uiEl('span',{ className:'grid-near-' + part })]; }));
const node = uiEl('div',{ className:'grid-near',attrs:{ 'aria-hidden':'true',hidden:'' },children:UI_PLATE_PARTS.map(function (part) { return parts[part]; }) });
return { node,...parts };
}
function uiNearThing(game) {
const dirs = [game.avatar.facing,...Object.keys(DIRS)].filter(function (dir) { return Object.hasOwn(DIRS,dir); });
for (const dir of dirs) {
const thing = thingAt(game.world,cellToward(game.avatar.pos,dir));
if (thing && UI_NEAR_KINDS.has(thing.kind)) return thing;
}
return null;
}
function uiAtRest(game) {
const plan = game.walk && game.walk.plan;
const moving = Boolean(game.view && game.view.avatar && game.view.avatar.moving);
return !moving && !(plan && plan.dirs.length > 0) && !game.toast;
}
function uiPlateSide(game,thing) {
const view = game.view;
return thing.row + 1 / 2 - view.camera.row > view.rows / 2 ? 'top' :'bottom';
}
function uiNearPlateFor(game,coarse) {
if (!uiAtRest(game)) return null;
const thing = uiNearThing(game);
const plate = thing && thing.kind === 'rig' ? rigPlate(game.world,thing.id,game.save) :null;
if (!plate) return null;
const act = (coarse ? 'TAP ◆ TO ' :'ENTER TO ') + plate.verb;
return { rigId:plate.rigId,title:plate.title,line:plate.line,act,place:uiPlateSide(game,thing) };
}
function uiSetText(node,text) {
if (node.textContent !== text) node.textContent = text;
}
function uiSetData(node,name,value) {
if (node.dataset[name] !== value) node.dataset[name] = value;
}
function uiSyncNearPlate(game,coarse = uiPointerIsCoarse()) {
const near = game.stage.near;
const plate = uiNearPlateFor(game,coarse);
if (near.node.hidden !== !plate) near.node.hidden = !plate;
if (!plate) return;
UI_PLATE_PARTS.forEach(function (part) { uiSetText(near[part],plate[part]); });
uiSetData(near.node,'rig',plate.rigId);
uiSetData(near.node,'place',plate.place);
}

export { uiCreateHint, uiHintWanted, uiSyncHint, uiCreateNearPlate, uiNearPlateFor, uiSyncNearPlate };

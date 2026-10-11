import { actorIntent,intentLabel,nearestAwakeFoe } from '../game/actors.js';
import { GAME_EVENT } from '../game/game-events.js';
import { withTag } from '../game/ext/power-ops.js';
import { addTag,aimLabels,aimTarget,tagName,tagNames,targetOf } from '../game/power/aim.js';
import { recallAll,recallOne } from '../game/power/recall.js';
import { uiEmit,uiGridEmit } from './bus.js';
import { uiCommitExt } from './ext-storage.js';
import { uiActorsTick,uiGridPing,uiLiveFoes } from './grid-actors.js';
import { uiCastCarry } from './grid-cast-act.js';
import { CHIP_RANK_LAST,CHIP_RANK_RECALL,CHIP_RANK_TAG,uiModeOff,uiPowerOf,uiPowerRefresh,uiPrune,uiTagIds,uiTagSpots } from './grid-power.js';
import { uiShowToast } from './grid-toast.js';

const FULL_TOAST = 'Six tags is the limit. RECALL one first.';
const NOTHING_TOAST = 'Nothing in range.';
const NO_TARGET_LABEL = { text:'AIM',aria:'Aim: no target' };

function uiSay(app,text) {
uiShowToast(app,{ text,kind:'info',replace:true });
}
function uiFoes(game) {
return (game.fight ? game.fight.actors :[]).filter((actor) => actor.hp > 0);
}
function uiPicked(game,tagged,spots) {
const pick = uiPowerOf(game).pick;
const foe = uiFoes(game).find((actor) => actor.id === pick);
if (foe) return { verb:tagged.includes(pick) ? 'BOLT' :'TAG',target:targetOf('foe',foe) };
const spot = spots.find((one) => one.id === pick && !tagged.includes(pick));
return spot ? { verb:'TAG',target:targetOf('tile',spot) } :null;
}
function uiPlan(app) {
const game = app.game;
const hero = game.avatar.pos;
const tagged = uiTagIds(game);
const spots = uiTagSpots(app);
const picked = uiPowerOf(game).pick ? uiPicked(game,tagged,spots) :null;
if (picked) return picked;
const target = aimTarget(uiFoes(game),{ hero,tagged,spots });
if (target) return { verb:'TAG',target };
const bolt = nearestAwakeFoe(uiLiveFoes(game),hero);
return bolt ? { verb:'BOLT',target:targetOf('foe',bolt) } :null;
}
function uiNameOf(game,id) {
return tagName(id,uiTagIds(game),uiFoes(game));
}
function uiAimLabel(app) {
const plan = uiPlan(app);
return plan ? aimLabels(plan.verb,uiNameOf(app.game,plan.target.id)) :NO_TARGET_LABEL;
}
function uiTag(app,target) {
const game = app.game;
const power = uiPowerOf(game);
const added = addTag(uiTagIds(game),target.id);
const name = uiNameOf(game,target.id);
if (added.kind === 'full') uiSay(app,FULL_TOAST);
else if (added.kind === 'already') uiSay(app,name + ' is already tagged.');
else {
power.tags[target.id] = { kind:target.kind,col:target.col,row:target.row };
Object.assign(power,{ selected:target.id,pick:null });
if (target.kind === 'tile') uiCommitExt(app,withTag(game.ext,target.id,target));
uiSay(app,'TAGGED ' + name + '.');
}
uiPowerRefresh(app);
}
function uiFire(app,dmg) {
const plan = uiPlan(app);
if (!plan) {
uiSay(app,NOTHING_TOAST);
uiPowerRefresh(app);
} else if (plan.verb === 'TAG') uiTag(app,plan.target);
else uiGridPing(app,plan.target.id,dmg);
return true;
}
function uiTapTarget(app,cell) {
const spots = uiTagSpots(app).map((spot) => targetOf('tile',spot));
const near = [...uiFoes(app.game).map((foe) => targetOf('foe',foe)),...spots]
.map((target) => ({ target,away:Math.max(Math.abs(target.col - cell.col),Math.abs(target.row - cell.row)) }))
.filter((one) => one.away <= 1);
return near.reduce((best,one) => (best && best.away <= one.away ? best :one),null);
}
function uiTap(app,cell) {
const found = uiTapTarget(app,cell);
if (!found) return false;
const power = uiPowerOf(app.game);
const id = found.target.id;
if (power.tags[id]) power.selected = id;
power.pick = id;
uiPowerRefresh(app);
return true;
}
function uiRecallTile(app,id,tag) {
const game = app.game;
const name = uiNameOf(game,id);
const here = game.avatar.pos;
uiSay(app,'RECALL ' + name + ': O(1) get. You are there.');
if (here.col !== tag.col || here.row !== tag.row) {
uiCastCarry(app,{ cell:{ col:tag.col,row:tag.row },facing:game.avatar.facing });
uiGridEmit(app,'enter-cell',{ pos:{ col:tag.col,row:tag.row },from:here });
}
uiPowerRefresh(app);
}
function uiRecallOne(app,id) {
const game = app.game;
const tag = uiPowerOf(game).tags[id];
if (!tag) return;
if (tag.kind === 'tile') {
uiRecallTile(app,id,tag);
return;
}
const name = uiNameOf(game,id);
const result = recallOne(game.fight.actors,id);
game.fight.actors = result.actors;
if (result.hit) uiEmit(GAME_EVENT.RIG_GOOD,{ rigId:'grid',chain:1 });
uiSay(app,result.hit ? 'RECALL ' + name + ': O(1) get by tag. 1 hit.' :name + ' is gone.');
uiPrune(game);
if (result.hit) uiActorsTick(app);
uiPowerRefresh(app);
}
function uiRecallAll(app) {
const game = app.game;
const tags = uiPowerOf(game).tags;
const ids = Object.keys(tags);
const foeIds = ids.filter((id) => tags[id].kind === 'foe');
const result = recallAll(game.fight ? game.fight.actors :[],foeIds,ids.filter((id) => tags[id].kind === 'tile'));
if (game.fight) game.fight.actors = result.actors;
if (result.hits > 0) uiEmit(GAME_EVENT.RIG_GOOD,{ rigId:'grid',chain:result.hits });
uiSay(app,'RECALL ALL: iterate every stored tag, O(k). ' + result.visited + ' tags visited, ' + result.hits + ' hit.');
uiPrune(game);
if (foeIds.length > 0) uiActorsTick(app);
uiPowerRefresh(app);
}
function uiAimOff(app) {
uiModeOff(app.game);
uiPowerRefresh(app);
}
function uiTagChip(app,id,names) {
const game = app.game;
const actor = uiFoes(game).find((foe) => foe.id === id);
const intent = actor && actorIntent(actor) ? intentLabel(actorIntent(actor)) :'';
return {
id:'tag-' + id,label:names[id],intent,aria:'Tag ' + names[id] + (intent ? ', ' + intent :''),selected:uiPowerOf(game).selected === id,rank:CHIP_RANK_TAG,
run:() => { uiPowerOf(game).selected = id; uiPowerRefresh(app); },
};
}
function uiActionChips(app,names) {
const game = app.game;
const power = uiPowerOf(game);
const ids = Object.keys(names);
const chips = [];
if (ids.length >= 2) chips.push({ id:'recall-all',label:'RECALL ALL',aria:'Recall all tags',run:() => uiRecallAll(app) });
if (power.selected) chips.push({ id:'recall',label:'RECALL ' + names[power.selected],aria:'Recall ' + names[power.selected],rank:CHIP_RANK_RECALL,run:() => uiRecallOne(app,power.selected) });
if (power.aim) chips.push({ id:'aim-off',label:'AIM OFF',aria:'Aim off',rank:CHIP_RANK_LAST,run:uiAimOff });
return chips;
}
function uiChips(app) {
const game = app.game;
const names = tagNames(uiTagIds(game),uiFoes(game));
return [...Object.keys(names).map((id) => uiTagChip(app,id,names)),...uiActionChips(app,names)];
}
function uiModeLookup() {
return { id:'lookup',name:'LOOKUP',aim:true,aimLabel:uiAimLabel,chips:uiChips,fire:uiFire,tap:uiTap };
}

export { uiModeLookup };

import { uiEl } from './dom.js';
import { uiGridHearts,uiLiveFoes } from './grid-actors.js';
import { uiKeysSeen,uiWatchInputMode } from './grid-input-mode.js';
import { goalLine, objectiveFor } from '../game/objective.js';

const UI_VERB_WALK = 'WALK';
const UI_VERB_ACT = { keys:'PRESS ENTER',touch:'TAP ◆' };
const UI_VERB_ZAP = { keys:'ZAP · F',touch:'ZAP · A' };
const UI_ZAP_REACH = 5;
function uiCurrentObjective(app) {
const game = app.game;
return (game.objectiveOverride && game.objectiveOverride(app)) || objectiveFor(game.world,game.progress,game.avatar.pos);
}
function uiStripPeriod(text) {
return text.replace(/\.$/,'');
}
function uiObjectiveText(app) {
return uiStripPeriod(uiCurrentObjective(app).text);
}
function uiGapTo(game,thing) {
const pos = game.avatar.pos;
return Math.abs(pos.col - thing.col) + Math.abs(pos.row - thing.row);
}
function uiNextTo(game,thing) {
return uiGapTo(game,thing) <= 1;
}
function uiFoeNear(game) {
return uiLiveFoes(game).some(function (foe) { return uiGapTo(game,foe) <= UI_ZAP_REACH; });
}
function uiVerbFor(game,objective) {
const hand = uiKeysSeen() ? 'keys' :'touch';
if (uiFoeNear(game)) return UI_VERB_ZAP[hand];
const thing = objective.targetId && game.world.things ? game.world.things[objective.targetId] :null;
if (!thing) return null;
if (!uiNextTo(game,thing)) return UI_VERB_WALK;
return thing.kind === 'gate' ? null :UI_VERB_ACT[hand];
}
function uiObjectiveVerb(app) {
return uiVerbFor(app.game,uiCurrentObjective(app));
}
function uiObjectiveChanged(app) {
return uiObjectiveText(app) !== app.game.objectiveShown || uiObjectiveVerb(app) !== app.game.objectiveVerbShown;
}
function uiGoalShort(text) {
const count = /\d+\/\d+/.exec(text);
return count ? uiEl('span',{ className:'grid-goal-short',text:count[0],attrs:{ 'aria-hidden':'true' } }) :null;
}
function uiAmmoMatters(game) {
const run = game.ammoRun;
return uiLiveFoes(game).length > 0 || Boolean(run) && game.ammo < run.max;
}
function uiAmmoReadout(app) {
const node = app.game.ammoNode ? app.game.ammoNode(app) :null;
return node && uiAmmoMatters(app.game) ? node :null;
}
function uiGoalRow(app) {
const text = goalLine(app.game.world,app.game.progress);
const goal = uiEl('p',{ className:'grid-goal',text });
const ammo = uiAmmoReadout(app);
const hearts = uiGridHearts(app);
return uiEl('div',{ className:'grid-goal-row' + (ammo ? ' grid-goal-row-ammo' :''),children:[goal,uiGoalShort(text),ammo,hearts].filter(Boolean) });
}
function uiVerbNode(game,objective,verb) {
if (!verb) {
uiWatchInputMode(null);
return null;
}
const node = uiEl('span',{ className:'grid-verb',text:verb });
uiWatchInputMode(function () {
const now = uiVerbFor(game,objective);
if (now) node.textContent = now;
game.objectiveVerbShown = now;
});
return node;
}
function uiGridObjective(app) {
const game = app.game;
const objective = uiCurrentObjective(app);
const verb = uiVerbFor(game,objective);
game.objectiveShown = uiStripPeriod(objective.text);
game.objectiveVerbShown = verb;
game.objectiveTarget = objective.targetId;
return uiEl('div',{
className:'grid-objective-block',
children:[uiEl('div',{ className:'grid-objective-row',children:[uiVerbNode(game,objective,verb),uiEl('p',{ className:'grid-objective',text:objective.text })].filter(Boolean) })],
});
}

export { uiObjectiveText, uiObjectiveVerb, uiObjectiveChanged, uiGoalRow, uiGridObjective };

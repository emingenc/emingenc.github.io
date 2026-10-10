import { uiEl } from './dom.js';
import { uiGridHearts } from './grid-actors.js';
import { closedBarrierRig, goalLine, objectiveFor } from '../game/objective.js';
import { rigMet } from '../game/rig-reward.js';

const SIGNPOST_TEXT = 'Find the LOOKUP TURRET (corridor)';
function uiSignpostDue(game) {
return Boolean(game.world.rigs.turret) && game.progress.breached.size > 0 && !rigMet(game.save,'turret') && closedBarrierRig(game.world,game.progress) === null;
}
function uiCurrentObjective(app) {
const game = app.game;
if (uiSignpostDue(game)) return { text:SIGNPOST_TEXT,targetId:game.world.rigs.turret.id };
return objectiveFor(game.world,game.progress,game.avatar.pos);
}
function uiStripPeriod(text) {
return text.replace(/\.$/,'');
}
function uiObjectiveText(app) {
return uiStripPeriod(uiCurrentObjective(app).text);
}
function uiObjectiveChanged(app) {
return uiObjectiveText(app) !== app.game.objectiveShown;
}
function uiGoalRow(app) {
const goal = uiEl('p',{ className:'grid-goal',text:goalLine(app.game.world,app.game.progress) });
return uiEl('div',{ className:'grid-goal-row',children:[goal,uiGridHearts(app)].filter(Boolean) });
}
function uiGridObjective(app) {
const game = app.game;
const objective = uiCurrentObjective(app);
game.objectiveShown = uiStripPeriod(objective.text);
game.objectiveTarget = objective.targetId;
return uiEl('div',{
className:'grid-objective-block',
children:[
uiGoalRow(app),
uiEl('p',{ className:'grid-objective',text:objective.text }),
],
});
}

export { uiObjectiveText, uiObjectiveChanged, uiGridObjective };

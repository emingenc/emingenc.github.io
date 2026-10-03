import { uiEl } from './dom.js';
import { goalLine, objectiveFor } from '../game/objective.js';

function uiCurrentObjective(app) {
const game = app.game;
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
function uiGridObjective(app) {
const game = app.game;
const objective = uiCurrentObjective(app);
game.objectiveShown = uiStripPeriod(objective.text);
game.objectiveTarget = objective.targetId;
return uiEl('div',{
className:'grid-objective-block',
children:[
uiEl('p',{ className:'grid-goal',text:goalLine(game.world,game.progress) }),
uiEl('p',{ className:'grid-objective',text:objective.text }),
],
});
}

export { uiObjectiveText, uiObjectiveChanged, uiGridObjective };

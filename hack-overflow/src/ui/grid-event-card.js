import { eventCard } from '../game/power/event-text.js';


async function uiEventCard(app,kind) {
const card = eventCard(kind);
const sheets = await import('./grid-ordeal-sheet.js');
return sheets.uiOrdealSheet(app,{ id:card.id,lines:card.lines,choices:[{ id:'go',label:card.label }] });
}
function uiStopGo(app) {
const walk = app.game.walk;
if (walk) walk.plan = null;
}

function uiDropLine(app,line) {
if (app.game.objectiveOverride === line) app.game.objectiveOverride = null;
}

export { uiDropLine,uiEventCard,uiStopGo };

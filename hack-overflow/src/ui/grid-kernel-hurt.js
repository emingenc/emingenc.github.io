import { ensureFight,uiActorsTick } from './grid-actors.js';

const BLOW_ID = 'k-root';

function uiBlowFrom(cell) {
return { id:BLOW_ID,kind:'drone',col:cell.col,row:cell.row,hp:1,arm:1,awake:true };
}
function uiKernelHurt(app,from) {
const fight = ensureFight(app.game);
const revives = fight.revives || 0;
fight.actors = [...fight.actors,uiBlowFrom(from)];
const hurt = uiActorsTick(app);
fight.actors = fight.actors.filter((actor) => actor.id !== BLOW_ID);
return { hurt,revived:(fight.revives || 0) > revives };
}

function uiSetRevive(app,cell) {
const game = app.game;
if (!cell) { delete game.reviveAt; return; }
game.doorway = { col:cell.col,row:cell.row };
game.reviveAt = { col:cell.col,row:cell.row };
}

export { uiKernelHurt,uiSetRevive };

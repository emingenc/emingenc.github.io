import { cellToward } from '../game/move.js';
import { findPath } from '../game/path.js';
import { isPassable } from '../game/world.js';
import { uiShowToast } from './grid-toast.js';
import { uiWalkPath,uiWalkReleaseAll } from './grid-walk.js';

const NO_ROUTE = 'No route there yet';
const SIDES = Object.freeze(['up','down','left','right']);

function uiShorter(best,route) {
return !best || route.dirs.length < best.dirs.length ? route :best;
}
function uiWallRoute(app,cell,avoid) {
const game = app.game;
let best = null;
SIDES.forEach(function (side) {
const stand = cellToward(cell,side);
if (!isPassable(game.world,game.progress,stand)) return;
const dirs = findPath(game.world,game.progress,{ from:game.avatar.pos,to:stand,avoid });
const back = SIDES.find((dir) => { const at = cellToward(stand,dir); return at.col === cell.col && at.row === cell.row; });
if (dirs) best = uiShorter(best,{ dirs:[...dirs,back] });
});
return best ? best.dirs :null;
}
function uiQuestRoute(app,cell) {
const game = app.game;
const avoid = game.tapAvoid ? game.tapAvoid(app) :undefined;
if (isPassable(game.world,game.progress,cell)) return findPath(game.world,game.progress,{ from:game.avatar.pos,to:cell,avoid });
return uiWallRoute(app,cell,avoid);
}
function uiQuestTravel(app,cell) {
const dirs = uiQuestRoute(app,cell);
app.game.travelOpen = false;
if (!dirs) {
uiShowToast(app,{ text:NO_ROUTE,kind:'warn' });
return false;
}
uiWalkReleaseAll(app);
uiWalkPath(app,{ dirs });
return true;
}

export { NO_ROUTE,uiQuestRoute,uiQuestTravel };

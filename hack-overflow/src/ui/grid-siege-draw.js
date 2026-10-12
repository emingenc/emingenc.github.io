import { ringCells,siegeOn } from '../game/finale/siege.js';
import { uiSpotOf } from './grid-spot.js';

const FLOOD_FILL = 'rgba(180,30,60,0.45)';

function uiVeilCell(ctx,frame,spot) {
ctx.fillStyle = FLOOD_FILL;
ctx.fillRect(spot.left,spot.top,frame.tile,frame.tile);
}
function uiPaintSiegeRing(ctx,app,frame) {
const game = app.game;
if (!siegeOn(game.ext,game.save)) return;
ringCells(game.world).map((cell) => uiSpotOf(cell,frame)).filter(Boolean).forEach((spot) => uiVeilCell(ctx,frame,spot));
}

export { uiPaintSiegeRing,uiVeilCell };

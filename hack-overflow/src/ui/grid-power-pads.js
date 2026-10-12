import { padSpots } from '../game/power/pads.js';
import { usablePowers } from '../game/power/powers.js';
import { uiAddTagSpot,uiPowerOf,uiTagIds } from './grid-power.js';
import { uiPaintPadMarks } from './grid-power-pads-draw.js';


function uiLookupUsable(game) {
return usablePowers(game.progress.won,game.ext).includes('lookup');
}
function uiCalm(game) {
return !(game.fight && game.fight.actors.some((actor) => actor.hp > 0 && actor.awake));
}
function uiPadSpots(app) {
const game = app.game;
return uiLookupUsable(game) && uiCalm(game) ? padSpots(game.avatar.pos,game.world,game.progress).map(({ id,col,row }) => ({ id,col,row })) :[];
}
function uiPaintPads(ctx,app,frame) {
if (uiLookupUsable(app.game)) uiPaintPadMarks(ctx,frame,uiTagIds(app.game));
}
function uiWrapPaint(game) {
const inner = game.drawCast;
if (inner && inner.isPads) return;
const paint = function (ctx,app,frame) {
if (inner) inner(ctx,app,frame);
uiPaintPads(ctx,app,frame);
};
paint.isPads = true;
game.drawCast = paint;
}
function uiInstallPads(app) {
const game = app.game;
if (uiPowerOf(game).pads) return;
uiPowerOf(game).pads = true;
uiAddTagSpot(game,uiPadSpots);
uiWrapPaint(game);
}

export { uiInstallPads };

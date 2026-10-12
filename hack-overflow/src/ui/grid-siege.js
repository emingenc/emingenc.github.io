import { fanPill,siegeSheet } from '../game/finale/siege.js';
import { joinPills } from '../game/quest/gate-pill.js';
import { uiAddChips } from './grid-power.js';
import { uiSiegeLive,uiSiegeStandDown,uiStartSiege } from './grid-siege-run.js';
import { uiStoryChoice } from './story-dialogue.js';

const STAND_DOWN = { id:'siege-stand-down',label:'STAND DOWN',aria:'Stand down the counter defence',tone:'warn' };

function uiHasPill(game) {
const own = Object.getOwnPropertyDescriptor(game,'hudPill');
return Boolean(own && own.get && own.get.isSiegePill);
}
function uiHangPill(game) {
if (uiHasPill(game)) return;
let kept = game.hudPill;
const read = () => joinPills(game.ext ? fanPill(game.ext,game.save) :null,kept);
read.isSiegePill = true;
Object.defineProperty(game,'hudPill',{ configurable:true,enumerable:true,get:read,set:(next) => { kept = next; } });
}
function uiLoadPainter(state) {
import('./grid-siege-draw.js').then(function (draw) { state.draw = draw.uiPaintSiegeRing; }).catch(console.error);
}
function uiWrapPaint(game,state) {
const inner = game.drawCast;
if (inner && inner.isSiege) return;
const paint = function (ctx,app,frame) {
if (inner) inner(ctx,app,frame);
if (state.draw) state.draw(ctx,app,frame);
};
paint.isSiege = true;
game.drawCast = paint;
}
async function uiBruteSiege(app) {
const game = app.game;
const gen = game.gen;
if (uiSiegeLive(app)) return;
const pick = await uiStoryChoice(app,siegeSheet());
if (game.gen === gen && pick === 'hold') uiStartSiege(app);
}
function uiInstallSiege(app) {
const game = app.game;
const state = { gen:game.gen,run:null,draw:null };
game.siege = state;
uiHangPill(game);
uiWrapPaint(game,state);
uiLoadPainter(state);
uiAddChips(game,(shown) => (uiSiegeLive(shown) ? [{ ...STAND_DOWN,run:uiSiegeStandDown }] :[]));
}

export { uiInstallSiege,uiBruteSiege };

import { BARK,BRUTE_CELL,MEET_ID,TOASTS,brutePlan,inBarkRange,sameCell,talkSheet } from '../game/cast/brute.js';
import { hasMet,withMet } from '../game/ext/ops.js';
import { cellToward } from '../game/move.js';
import { uiGridHook } from './bus.js';
import { uiCommitExt } from './ext-storage.js';
import { uiShowToast } from './grid-toast.js';
import { uiStoryChoice } from './story-dialogue.js';

const PAINT_RANGE = 9;
let uiHooked = false;

function uiNear(hero,range) {
return Math.max(Math.abs(hero.col - BRUTE_CELL.col),Math.abs(hero.row - BRUTE_CELL.row)) <= range;
}
function uiBrutePaint(game,hero) {
if (game.brute.paint || !uiNear(hero,PAINT_RANGE)) return;
game.brute.paint = true;
import('./grid-brute-draw.js').then(function (draw) { game.drawBrute = draw.uiDrawBrute; });
}
function uiBruteBark(app,hero) {
const game = app.game;
if (game.brute.barked || app.story || !inBarkRange(hero) || hasMet(game.ext,MEET_ID)) return;
game.brute.barked = true;
uiShowToast(app,{ text:BARK,kind:'info' });
}
function uiBruteSync(app) {
const game = app.game;
if (!game.brute || game.brute.inert) return;
const hero = game.avatar.pos;
uiBrutePaint(game,hero);
uiBruteBark(app,hero);
}
function uiBruteAnswer(app,pick) {
const brute = app.game.brute;
if (pick === 'race') {
brute.race = true;
uiShowToast(app,{ text:TOASTS.armed,kind:'info' });
} else if (pick === 'off') {
brute.race = false;
uiShowToast(app,{ text:TOASTS.off,kind:'info' });
}
}
async function uiBruteTalk(app) {
const brute = app.game.brute;
if (brute.busy) return;
brute.busy = true;
try {
const plan = brutePlan(app.game.ext,brute.race);
if (!plan.met) uiCommitExt(app,withMet(app.game.ext,MEET_ID));
const pick = await uiStoryChoice(app,talkSheet(plan));
if (app.game.brute === brute) uiBruteAnswer(app,pick);
} finally {
brute.busy = false;
}
}
function uiBruteBump(payload) {
const game = payload.app.game;
if (!game.brute || game.brute.inert) return;
if (sameCell(cellToward(payload.pos,game.avatar.facing),BRUTE_CELL)) uiBruteTalk(payload.app).catch(console.error);
}
function uiHookBrute() {
if (uiHooked) return;
uiHooked = true;
['step','enter-cell'].forEach(function (name) { uiGridHook(name,function (payload) { uiBruteSync(payload.app); }); });
uiGridHook('bump',uiBruteBump);
}

function uiInstallBrute(app) {
const game = app.game;
const kept = game.brute ? { race:game.brute.race,paint:game.brute.paint } :{ race:false,paint:false };
game.brute = { inert:!game.world.barriers.sentry,busy:false,barked:false,...kept };
if (game.brute.inert) return app;
uiHookBrute();
uiBruteSync(app);
return app;
}

export { uiInstallBrute,uiBruteSync };

import { spendShot } from '../game/ammo.js';
import { FAN_TOASTS,fanSheet } from '../game/cast/brute-fan.js';
import { withBeat,withNpc } from '../game/ext/ops.js';
import { BEATS } from '../game/finale/contract.js';
import { uiCommitExt } from './ext-storage.js';
import { uiShowToast } from './grid-toast.js';
import { uiStoryChoice } from './story-dialogue.js';

function uiFanSpend(game) {
if (Number.isFinite(game.ammo)) game.ammo = spendShot(game.ammo).ammo;
}
function uiFanAnswer(app,pick) {
const game = app.game;
if (pick !== 'cool' && pick !== 'walk') return;
if (pick === 'cool') uiFanSpend(game);
uiCommitExt(app,withBeat(withNpc(game.ext,{ bruteHelped:pick === 'cool' }),BEATS.fan));
uiShowToast(app,{ text:FAN_TOASTS[pick],kind:'info' });
}
async function uiBruteFan(app) {
const game = app.game;
const pick = await uiStoryChoice(app,fanSheet(game.ammo));
if (app.game === game) uiFanAnswer(app,pick);
}

export { uiBruteFan };

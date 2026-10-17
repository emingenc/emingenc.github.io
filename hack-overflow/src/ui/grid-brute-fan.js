import { spendShot } from '../game/ammo.js';
import { FAN_TOASTS,fanSheet } from '../game/cast/brute-fan.js';
import { hasBeat,withBeat,withNpc } from '../game/ext/ops.js';
import { BEATS } from '../game/finale/contract.js';
import { uiCommitExt } from './ext-storage.js';
import { uiShowToast } from './grid-toast.js';
import { uiStoryChoice } from './story-dialogue.js';

const asking = new WeakSet();
function uiFanSpend(game) {
if (Number.isFinite(game.ammo)) game.ammo = spendShot(game.ammo).ammo;
}
function uiFanAnswer(app,pick) {
const game = app.game;
if ((pick !== 'cool' && pick !== 'walk') || hasBeat(game.ext,BEATS.fan)) return;
if (pick === 'cool') uiFanSpend(game);
uiCommitExt(app,withBeat(withNpc(game.ext,{ bruteHelped:pick === 'cool' }),BEATS.fan));
uiShowToast(app,{ text:FAN_TOASTS[pick],kind:'info' });
}
async function uiBruteFan(app) {
const gen = app.game.gen;
if (asking.has(gen) || hasBeat(app.game.ext,BEATS.fan)) return;
asking.add(gen);
try {
const pick = await uiStoryChoice(app,fanSheet(app.game.ammo));
if (app.game.gen === gen) uiFanAnswer(app,pick);
} finally {
asking.delete(gen);
}
}

export { uiBruteFan };

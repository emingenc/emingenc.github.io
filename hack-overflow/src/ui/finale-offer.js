import { hasBeat,withBeat } from '../game/ext/ops.js';
import { hurtHp } from '../game/hp.js';
import { answerOffer,offerEffect,offerSheet } from '../game/finale/offers.js';
import { uiCommitExt } from './ext-storage.js';
import { ensureFight } from './grid-actors.js';
import { uiShowToast } from './grid-toast.js';
import { uiStoryChoice } from './story-dialogue.js';
import { uiPayRank } from './rank-pay.js';


function uiLoseHearts(app,count) {
const fight = ensureFight(app.game);
fight.hp = hurtHp(fight.hp,Math.min(count,fight.hp.hearts - 1)).hp;
}
function uiApplyOffer(app,effect) {
if (effect.hearts) uiLoseHearts(app,effect.hearts);
uiShowToast(app,{ text:effect.toast,kind:effect.hearts ? 'warn' :'info' });
if (effect.source) return uiPayRank(app,effect.source,effect.rank);
return null;
}
async function uiGhostOffer(app,spec) {
const game = app.game;
if (app.story || game.offering || (spec.once && hasBeat(game.ext,spec.once))) return null;
game.offering = true;
try {
const effect = (pick) => offerEffect(game.ext,pick);
const pick = await uiStoryChoice(app,offerSheet(game.ext,spec));
if (!pick || app.game !== game) return null;
const result = effect(pick);
const counted = answerOffer(game.ext,pick);
uiCommitExt(app,spec.once ? withBeat(counted,spec.once) :counted);
await uiApplyOffer(app,result);
return { pick,wrong:result.wrong };
} finally {
game.offering = false;
}
}

export { uiGhostOffer };

import { cardLines } from '../game/story/catchup.js';
import { uiCastSay,uiCastUntil } from './grid-cast-act.js';

function uiToastsGone(game) {
return !game.toast && (!game.toastQueue || game.toastQueue.length === 0);
}

async function uiPlayCard(app,ids,opts = {}) {
for (const text of cardLines(ids,app.game.ext)) await uiCastSay(app,{ text,kind:'info' });
if (opts.settle) await uiCastUntil(app,function () { return uiToastsGone(app.game); });
}

export { uiPlayCard };

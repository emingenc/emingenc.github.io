import { hasBeat,withBeat } from '../game/ext/ops.js';
import { BEATS } from '../game/finale/contract.js';
import { REVEAL_LINES,spokenLine } from '../game/finale/root-lines.js';
import { uiCommitExt } from './ext-storage.js';
import { uiCastSay,uiCastUntil } from './grid-cast-act.js';


function uiLineFree(game) {
return !game.toast && (!game.toastQueue || game.toastQueue.length === 0);
}
async function uiRevealPlay(app) {
const game = app.game;
if (game.save.ended || hasBeat(game.ext,BEATS.reveal)) return;
uiCommitExt(app,withBeat(game.ext,BEATS.reveal));
for (const line of REVEAL_LINES) {
if (app.game !== game) return;
await uiCastSay(app,{ text:spokenLine(line),kind:'info' });
}
await uiCastUntil(app,function () { return uiLineFree(app.game); });
}

export { uiRevealPlay };

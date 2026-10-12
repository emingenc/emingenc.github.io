import { lendTrials,lendsOf,spendTrial,trialsOf } from '../game/ext/power-ops.js';
import { ownedPowers } from '../game/power/powers.js';
import { uiCommitExt } from './ext-storage.js';
import { uiCastSay } from './grid-cast-act.js';
import { uiModeOff,uiPowerOf,uiPowerRefresh } from './grid-power.js';

const LENDABLE = ['pincer','plate','net'];

function uiOwns(game,power) {
return ownedPowers(game.progress.won).includes(power);
}
function uiStillLine(left) {
return 'You still have ' + left + (left === 1 ? ' trial.' :' trials.');
}
async function uiTell(app,lines) {
for (const text of lines) await uiCastSay(app,{ text });
}
async function uiLend(app,{ ally,power,lines }) {
const game = app.game;
if (!LENDABLE.includes(power)) return false;
if (uiOwns(game,power)) {
await uiTell(app,lines.owned ? [lines.owned] :[]);
return false;
}
const left = trialsOf(game.ext,power);
if (left > 0) {
await uiTell(app,[uiStillLine(left)]);
return false;
}
const again = lendsOf(game.ext,ally) > 0;
const next = lendTrials(game.ext,power,ally);
if (next === game.ext) return false;
uiCommitExt(app,next);
uiPowerRefresh(app);
await uiTell(app,again ? lines.again :lines.lend);
return true;
}
function uiSpendTrial(app,power) {
const game = app.game;
if (!LENDABLE.includes(power) || uiOwns(game,power)) return false;
const next = spendTrial(game.ext,power);
if (next === game.ext) return false;
uiCommitExt(app,next);
if (trialsOf(next,power) === 0 && uiPowerOf(game).mode === power) uiModeOff(game);
uiPowerRefresh(app);
return true;
}

export { uiLend,uiSpendTrial };

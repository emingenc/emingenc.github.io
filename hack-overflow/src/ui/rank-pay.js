import { growHp,maxHeartsOf } from '../game/hp.js';
import { rankLevel } from '../game/rank.js';
import { uiCommitExt } from './ext-storage.js';

function uiHeartWord(count) {
return count === 1 ? 'heart' :'hearts';
}
function uiRankUpText(before,after) {
const level = rankLevel(after.rank.r);
if (level <= rankLevel(before.rank.r)) return null;
const hearts = maxHeartsOf(after) - maxHeartsOf(before);
return 'RANK ' + level + (hearts > 0 ? ': +' + hearts + ' ' + uiHeartWord(hearts) :'');
}
function uiGrowHearts(game) {
if (game.fight) game.fight.hp = growHp(game.fight.hp,maxHeartsOf(game.ext));
}

async function uiPayRank(app,sourceId,amount) {
const [{ addRank,rankOf },hud] = await Promise.all([import('../game/ext/ops.js'),import('./rank-hud.js')]);
const before = app.game.ext;
const after = addRank(before,sourceId,amount);
if (after === before) return { paid:false,rank:rankOf(before),gain:0,up:null };
uiCommitExt(app,after);
uiGrowHearts(app.game);
const up = uiRankUpText(before,app.game.ext);
hud.uiSayOnGrid(app,up);
await hud.uiRefreshHud(app);
return { paid:true,rank:rankOf(app.game.ext),gain:rankOf(app.game.ext) - rankOf(before),up };
}

export { uiPayRank,uiRankUpText };

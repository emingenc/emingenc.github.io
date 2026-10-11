import { recordLab } from '../game/save.js';
import { rigRankPays } from '../game/rig-reward.js';
import { uiRenderKeepingFocus } from './app.js';
import { uiCommitSave } from './game-state.js';


function uiArenaRecordWin(app,win) {
const { rig,levelId,stars } = win;
const recorded = recordLab(app.game.save,{ labId:rig.labId,levelId },stars);
uiCommitSave(app,recorded.save);
return { improved:recorded.improved,bestBefore:recorded.bestBefore };
}
function uiArenaShowPaid(app,paid) {
const arena = app.rig && app.rig.arena;
if (!arena || !arena.result || !arena.result.won) return;
arena.result.rank = paid;
if (app.screen === 'rig') uiRenderKeepingFocus(app);
}
async function uiArenaPay(app,win,reward) {
const [{ rankOf },pay,quest] = await Promise.all([import('../game/ext/ops.js'),import('./rank-pay.js'),import('./quest-run.js')]);
const before = app.game.ext;
const plan = rigRankPays(win.rig,reward.bestBefore,win.stars);
if (plan.quest) await quest.uiQuestEvent(app,plan.quest,{ type:'room-win' });
for (const line of plan.pays) await pay.uiPayRank(app,line.source,line.amount);
return { gain:rankOf(app.game.ext) - rankOf(before),up:pay.uiRankUpText(before,app.game.ext) };
}
function uiArenaPayRank(app,win,reward) {
const paying = uiArenaPay(app,win,reward)
.then(function (paid) { uiArenaShowPaid(app,paid); return paid; })
.catch(function () { return { gain:0,up:null }; });
if (app.rig) app.rig.rankPay = paying;
return paying;
}

export { uiArenaRecordWin,uiArenaPayRank };

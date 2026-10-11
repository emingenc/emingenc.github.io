import { QUESTS,STAGE,progressQuest,pillText,rewardOf,startQuest } from '../game/quest/quests.js';
import { uiCommitExt } from './ext-storage.js';
import { uiPayRank } from './rank-pay.js';
import { uiRefreshHud,uiSayOnGrid } from './rank-hud.js';

const ROOM_WIN = 'room-win';

function uiStageOf(ext,id) {
return ext.quests && Object.hasOwn(ext.quests,id) ? ext.quests[id] :STAGE.unseen;
}
function uiRunOf(game,id) {
const stage = uiStageOf(game.ext,id);
const kept = game.questRuns && game.questRuns[id];
return kept && kept.stage === stage ? kept :{ id,stage,n:0,bad:0 };
}
function uiKeepRun(game,state) {
game.questRuns = { ...game.questRuns,[state.id]:state };
}
function uiNextRun(state,event) {
if (event.type !== ROOM_WIN) return progressQuest(state,event);
return state.stage === STAGE.done ? state :{ ...state,stage:STAGE.done,n:QUESTS[state.id].need };
}
function uiQuestPillText(app) {
const id = app.game.ext.pin;
if (!id || !Object.hasOwn(QUESTS,id)) return null;
const state = uiRunOf(app.game,id);
return state.stage === STAGE.active ? pillText(QUESTS[id],state) :null;
}
async function uiPinQuest(app,questId) {
if (!Object.hasOwn(QUESTS,questId)) return;
const { withPin,withQuest } = await import('../game/ext/ops.js');
const stage = uiStageOf(app.game.ext,questId);
if (stage === STAGE.done) return;
if (stage !== STAGE.active) uiKeepRun(app.game,startQuest(questId));
uiCommitExt(app,withPin(stage === STAGE.active ? app.game.ext :withQuest(app.game.ext,questId,STAGE.active),questId));
await uiRefreshHud(app);
}
function uiFinishInExt(app,def,ops) {
let ext = ops.withQuest(app.game.ext,def.id,STAGE.done);
if (ext.pin === def.id) ext = ops.withPin(ext,null);
uiCommitExt(app,def.reward.find ? ops.withFind(ext,def.reward.find) :ext);
}
function uiDoneText(def,reward) {
return def.name + (reward.rank > 0 ? ': +' + reward.rank + ' R' :' done');
}
async function uiSayAndPay(app,def) {
const reward = rewardOf(def);
uiSayOnGrid(app,uiDoneText(def,reward));
await uiPayRank(app,reward.source,reward.rank);
await uiRefreshHud(app);
}
async function uiQuestEvent(app,questId,event) {
if (!Object.hasOwn(QUESTS,questId)) return { done:false };
const ops = await import('../game/ext/ops.js');
const state = uiRunOf(app.game,questId);
const next = uiNextRun(state,event);
if (next === state) return { done:false };
uiKeepRun(app.game,next);
if (next.stage !== STAGE.done) {
await uiRefreshHud(app);
return { done:false };
}
uiFinishInExt(app,QUESTS[questId],ops);
await uiSayAndPay(app,QUESTS[questId]);
return { done:true };
}

export { uiPinQuest,uiQuestEvent,uiQuestPillText };

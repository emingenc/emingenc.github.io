import { countersignAnswer,countersignPlan,countersignSheet,QUEST_ID } from '../game/cast/countersign.js';
import { uiBeginQuest,uiQuestAsk,uiQuestSay } from './grid-quest-kit.js';
import { uiQuestEvent } from './quest-run.js';

async function uiAnswer(app,pick) {
const answer = countersignAnswer(pick);
if (answer.kind === 'none') return;
await uiBeginQuest(app,QUEST_ID);
await uiQuestEvent(app,QUEST_ID,{ kind:answer.kind });
for (const line of answer.lines) await uiQuestSay(app,line);
}
async function uiBruteCountersign(app) {
const gen = app.game.gen;
if (countersignPlan(app.game.ext).kind !== 'ask') return;
const pick = await uiQuestAsk(app,countersignSheet());
if (app.game.gen === gen) await uiAnswer(app,pick);
}

export { uiBruteCountersign };

import { BYTES,bytesDoneLines,bytesLook,bytesMarks,bytesPlan,bytesSheet,freshBytes } from '../game/walk/lost-bytes.js';
import { uiHooksOnce,uiPowerOf } from './grid-power.js';
import { uiBeginQuest,uiQuestAsk,uiQuestLive,uiQuestMarks,uiQuestSay } from './grid-quest-kit.js';
import { uiQuestEvent } from './quest-run.js';

function uiRunOf(app) {
return uiPowerOf(app.game).bytes;
}
function uiKeep(app,run) {
uiPowerOf(app.game).bytes = run;
}
async function uiSayAll(app,lines) {
for (const line of lines) await uiQuestSay(app,line);
}
async function uiTake(app,taken) {
if (taken.slip > 0) await uiQuestEvent(app,BYTES.quest,{ kind:'slip',by:taken.slip });
const result = await uiQuestEvent(app,BYTES.quest,{ kind:'progress' });
if (!result.done) {
await uiQuestSay(app,BYTES.byteLine(taken.count));
return;
}
const steps = uiRunOf(app).steps;
uiKeep(app,freshBytes());
await uiSayAll(app,bytesDoneLines(steps));
}
async function uiOffer(app) {
if (await uiQuestAsk(app,bytesSheet()) !== 'look') return;
if (!await uiBeginQuest(app,BYTES.quest)) return;
const looked = bytesLook(uiRunOf(app));
uiKeep(app,looked.run);
await uiTake(app,looked);
}
async function uiOnEnterCell(info) {
const app = info.app;
if (!uiQuestLive(app) || app.game.opening || !uiRunOf(app)) return;
const plan = bytesPlan(app.game.ext,uiRunOf(app),info.pos);
if (plan.run) uiKeep(app,plan.run);
if (plan.kind === 'offer') await uiOffer(app);
else if (plan.kind === 'pick') await uiTake(app,plan);
}
const uiHook = uiHooksOnce({ 'enter-cell':(info) => uiOnEnterCell(info).catch(console.error) });
function uiInstallBytes(app) {
uiKeep(app,freshBytes());
uiQuestMarks(app,(shown) => bytesMarks(shown.game.ext,uiRunOf(shown) || freshBytes(),shown.game.avatar.pos));
uiHook();
}

export { uiInstallBytes };

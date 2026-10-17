import { questState } from '../game/ext/ops.js';
import { STAGE } from '../game/quest/quests.js';
import { DOUBLE_BILLED_ID,DOUBLE_BILLED_TEXTS } from '../game/walk/double-billed.js';
import { uiArenaToast } from './arena-shell.js';
import { uiQuestEvent } from './quest-run.js';

const PAID_AFTER_MS = 2600;

function uiOpen(app,arena) {
return Boolean(app.rig) && app.rig.arena === arena;
}
function uiPaidLater(app,arena) {
window.setTimeout(function () {
if (uiOpen(app,arena)) uiArenaToast(app,DOUBLE_BILLED_TEXTS.paid,'good');
},PAID_AFTER_MS);
}
async function uiBilledQuest(app,arena) {
const stage = questState(app.game.ext,DOUBLE_BILLED_ID);
if (stage === STAGE.done) return;
const result = await uiQuestEvent(app,DOUBLE_BILLED_ID,stage === STAGE.active ? { kind:'progress' } :{ type:'room-win' });
if (!result.done || !uiOpen(app,arena)) return;
uiArenaToast(app,DOUBLE_BILLED_TEXTS.done,'good');
uiPaidLater(app,arena);
}

export { uiBilledQuest };

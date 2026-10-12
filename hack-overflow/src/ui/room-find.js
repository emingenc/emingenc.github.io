import { uiRenderKeepingFocus } from './app.js';
import { uiArenaToast } from './arena-shell.js';
import { uiCommitExt } from './ext-storage.js';
import { uiPinQuest } from './quest-run.js';
import { uiRefreshHud } from './rank-hud.js';


async function uiTakeQuest(app, questId) {
  const { pin } = app.game.ext;
  if (!pin || pin === questId) return uiPinQuest(app, questId);
  const { questState, withQuest } = await import('../game/ext/ops.js');
  const { STAGE } = await import('../game/quest/quests.js');
  if (questState(app.game.ext, questId) >= STAGE.active) return undefined;
  uiCommitExt(app, withQuest(app.game.ext, questId, STAGE.active));
  return uiRefreshHud(app);
}

function uiRoomHolds(app, arena) {
  return Boolean(app.rig) && app.rig.arena === arena;
}
function uiRoomSaysFind(app, arena, line) {
  if (!uiRoomHolds(app, arena)) return false;
  uiArenaToast(app, line, 'good');
  arena.find = line;
  if (!arena.result) return true;
  arena.result = { ...arena.result, find: line };
  uiRenderKeepingFocus(app);
  return true;
}

export { uiRoomSaysFind, uiTakeQuest };

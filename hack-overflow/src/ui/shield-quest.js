import { questState } from '../game/ext/ops.js';
import { STAGE } from '../game/quest/quests.js';
import { NEXT_TALLER_ID, THIRD_WAVE } from '../game/quest/third-wave.js';
import { uiQuestEvent } from './quest-run.js';
import { uiRoomSaysFind, uiTakeQuest } from './room-find.js';


const FIND_LINE = THIRD_WAVE[NEXT_TALLER_ID].done;

function uiStage(app) {
  return questState(app.game.ext, NEXT_TALLER_ID);
}
function uiSayFind(app, arena) {
  if (arena.found) return;
  arena.found = uiRoomSaysFind(app, arena, FIND_LINE);
}
async function uiFeed(app, arena, event) {
  if (uiStage(app) === STAGE.done) return;
  const result = await uiQuestEvent(app, NEXT_TALLER_ID, event);
  if (result.done) uiSayFind(app, arena);
}
async function uiTowersQuest(app, arena, move) {
  if (uiStage(app) === STAGE.done) return;
  if (!arena.pinned) {
    arena.pinned = true;
    if (uiStage(app) !== STAGE.active) await uiTakeQuest(app, NEXT_TALLER_ID);
  }
  if (move.last && move.last.blocked) await uiFeed(app, arena, { kind: 'progress' });
  if (move.last && move.last.kind === 'wrong') await uiFeed(app, arena, { kind: 'slip' });
  if (move.won) await uiFeed(app, arena, { type: 'room-win' });
}

export { uiTowersQuest };

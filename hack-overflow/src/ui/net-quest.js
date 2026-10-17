import { CLEAR_STRETCH_W3_ID, THIRD_WAVE } from '../game/quest/third-wave.js';
import { uiQuestEvent } from './quest-run.js';
import { uiRoomSaysFind, uiTakeQuest } from './room-find.js';

const WORDS = THIRD_WAVE[CLEAR_STRETCH_W3_ID];
const SLIP = { kind: 'slip' };
const ROOM_WIN = { type: 'room-win' };

async function uiStretchMove(app, arena, move) {
  if (move.first) await uiTakeQuest(app, CLEAR_STRETCH_W3_ID);
  if (move.slip) await uiQuestEvent(app, CLEAR_STRETCH_W3_ID, SLIP);
}
async function uiStretchWin(app, arena) {
  const result = await uiQuestEvent(app, CLEAR_STRETCH_W3_ID, ROOM_WIN);
  if (result.done) uiRoomSaysFind(app, arena, WORDS.done);
}

export { uiStretchMove, uiStretchWin };

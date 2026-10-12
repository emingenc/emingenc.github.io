import { THIRD_WAVE, MOST_WATER_ID } from '../game/quest/third-wave.js';
import { uiQuestEvent } from './quest-run.js';
import { uiRoomSaysFind, uiTakeQuest } from './room-find.js';

const WORDS = THIRD_WAVE[MOST_WATER_ID];
const SLIP = { kind: 'slip' };
const ROOM_WIN = { type: 'room-win' };

async function uiWaterMove(app, arena, first) {
  if (first) await uiTakeQuest(app, MOST_WATER_ID);
  await uiQuestEvent(app, MOST_WATER_ID, SLIP);
}
async function uiWaterWin(app, arena) {
  const result = await uiQuestEvent(app, MOST_WATER_ID, ROOM_WIN);
  if (result.done) uiRoomSaysFind(app, arena, WORDS.done);
}

export { uiWaterMove, uiWaterWin };

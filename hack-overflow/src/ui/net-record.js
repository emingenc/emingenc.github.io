import { BEST_MODES, bestIn, withBest } from '../game/ext-best.js';
import { netStars } from '../game/rooms/net.js';
import { uiCommitExt } from './ext-storage.js';


const ROOM = 'net';

function uiNetKeepsBest(mode) {
  return BEST_MODES[ROOM].includes(mode);
}
function uiNetRecordBest(app, arena) {
  if (arena.state.status !== 'won' || !uiNetKeepsBest(arena.mode)) return false;
  const run = { score: arena.state.score, combo: 0, stars: netStars(arena.state), drones: 0 };
  uiCommitExt(app, withBest(app.game.ext, { room: ROOM, mode: arena.mode }, run));
  return true;
}
function uiNetHasBest(app, mode) {
  return bestIn(app.game.ext, ROOM, mode).stars > 0;
}

export { uiNetRecordBest, uiNetHasBest };

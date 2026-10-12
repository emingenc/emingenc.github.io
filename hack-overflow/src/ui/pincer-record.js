import { bestGain, bestIn, withBest } from '../game/ext-best.js';
import { pincerStars } from '../game/rooms/pincer.js';
import { uiCommitExt } from './ext-storage.js';


const ROOM = 'pincer';

function uiPincerRunScore(state) {
  return { score: state.score, combo: 0, stars: pincerStars(state), drones: 0 };
}
function uiPincerRecordBest(app, arena) {
  const where = { room: ROOM, mode: arena.mode };
  const ext = app.game.ext;
  const before = bestIn(ext, ROOM, arena.mode);
  if (arena.state.status !== 'won') return { best: before, scoreImproved: false, starsImproved: false, firstWin: false };
  const run = uiPincerRunScore(arena.state);
  const gain = bestGain(ext, where, run);
  uiCommitExt(app, withBest(ext, where, run));
  return { best: bestIn(app.game.ext, ROOM, arena.mode), scoreImproved: gain.score, starsImproved: gain.stars, firstWin: before.stars === 0 };
}

export { uiPincerRecordBest };

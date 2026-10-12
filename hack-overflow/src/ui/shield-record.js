import { bestGain, bestIn, withBest } from '../game/ext-best.js';
import { shieldStars } from '../game/rooms/shield.js';
import { uiCommitExt } from './ext-storage.js';


const ROOM = 'shield';

function uiShieldRunScore(state) {
  return { score: state.score, combo: state.maxCombo, stars: shieldStars(state), drones: state.results.length };
}
function uiShieldRecordBest(app, arena) {
  const where = { room: ROOM, mode: arena.mode };
  const before = bestIn(app.game.ext, ROOM, arena.mode);
  if (arena.state.status !== 'won') return { best: before, scoreImproved: false, starsImproved: false, firstInMode: false };
  const run = uiShieldRunScore(arena.state);
  const gain = bestGain(app.game.ext, where, run);
  uiCommitExt(app, withBest(app.game.ext, where, run));
  return { best: bestIn(app.game.ext, ROOM, arena.mode), scoreImproved: gain.score, starsImproved: gain.stars, firstInMode: before.score === 0 };
}

export { uiShieldRecordBest };

import { bestGain, bestIn, withBest } from '../game/ext-best.js';
import { turretStars } from '../game/rooms/turret.js';
import { uiCommitExt } from './ext-storage.js';


const ROOM = 'turret';

function uiTurretRunScore(state) {
  return { score: state.score, combo: state.maxCombo, stars: turretStars(state), drones: state.resolved };
}
function uiTurretCounts(state, mode) {
  return mode === 'overflow' || state.status === 'won';
}
function uiTurretRecordBest(app, arena) {
  const where = { room: ROOM, mode: arena.mode };
  const ext = app.game.ext;
  if (!uiTurretCounts(arena.state, arena.mode)) return { best: bestIn(ext, ROOM, arena.mode), scoreImproved: false, starsImproved: false };
  const run = uiTurretRunScore(arena.state);
  const gain = bestGain(ext, where, run);
  uiCommitExt(app, withBest(ext, where, run));
  return { best: bestIn(app.game.ext, ROOM, arena.mode), scoreImproved: gain.score, starsImproved: gain.stars };
}

export { uiTurretRecordBest };

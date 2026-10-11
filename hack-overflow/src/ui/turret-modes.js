import { W2_STREAMS } from '../game/rooms/data/turret-w2-pool.js';
import { MODES } from '../game/rooms/data/turret-waves.js';
import { createTurret } from '../game/rooms/turret.js';
import { buildPool, pickStream } from '../game/rooms/turret-stream.js';


const LAB_ID = 'turret';
const LAB_LEVEL = 'turret-1';
const NO_STREAM = -1;

function uiTurretCleared(app) {
  const labs = app.game.save.labs;
  return Boolean(labs[LAB_ID] && labs[LAB_ID][LAB_LEVEL] && labs[LAB_ID][LAB_LEVEL].best > 0);
}
function uiTurretFirstMode(app) {
  return uiTurretCleared(app) ? 'w2' : 'w1';
}
function uiTurretOtherModes(app, mode) {
  return uiTurretCleared(app) ? MODES.filter((id) => id !== mode) : [];
}
function uiTurretRunFor(start) {
  const { mode, assist, lastIndex } = start;
  if (mode === 'overflow') return { state: createTurret([], { wave: 'overflow', assist }), index: NO_STREAM };
  const pool = mode === 'w2' ? W2_STREAMS : buildPool();
  const picked = pickStream(pool, lastIndex, Math.random);
  return { state: createTurret(picked.stream, { wave: mode, assist }), index: picked.index };
}

export { uiTurretCleared, uiTurretFirstMode, uiTurretOtherModes, uiTurretRunFor };

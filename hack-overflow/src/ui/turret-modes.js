import { bestIn } from '../game/ext-best.js';
import { W2_STREAMS } from '../game/rooms/data/turret-w2-pool.js';
import { W3_STREAMS } from '../game/rooms/data/turret-w3-pool.js';
import { MODES } from '../game/rooms/data/turret-waves.js';
import { createTurret } from '../game/rooms/turret.js';
import { buildPool, pickStream } from '../game/rooms/turret-stream.js';
import { uiRoomLabCleared, uiRoomPools } from './room-modes.js';


const LAB_ID = 'turret';
const LAB_LEVEL = 'turret-1';
const NO_STREAM = -1;
const POOLS = uiRoomPools(buildPool, W2_STREAMS, W3_STREAMS);

function uiTurretCleared(app) {
  return uiRoomLabCleared(app, LAB_ID, LAB_LEVEL);
}
function uiTurretW2Cleared(app) {
  return bestIn(app.game.ext, LAB_ID, 'w2').stars > 0;
}
function uiTurretUnlocked(app, mode) {
  if (mode === 'w1') return true;
  return mode === 'w3' ? uiTurretW2Cleared(app) : uiTurretCleared(app);
}
function uiTurretFirstMode(app) {
  return uiTurretCleared(app) ? 'w2' : 'w1';
}
function uiTurretOtherModes(app, mode) {
  return MODES.filter((id) => id !== mode && uiTurretUnlocked(app, id) && uiTurretCleared(app));
}
function uiTurretRunFor(start) {
  const { mode, assist, lastIndex } = start;
  if (mode === 'overflow') return { state: createTurret([], { wave: 'overflow', assist }), index: NO_STREAM };
  const picked = pickStream(POOLS[mode](), lastIndex, Math.random);
  return { state: createTurret(picked.stream, { wave: mode, assist }), index: picked.index };
}

export { uiTurretCleared, uiTurretUnlocked, uiTurretFirstMode, uiTurretOtherModes, uiTurretRunFor };

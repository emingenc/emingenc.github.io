import { W2_WAVES } from '../game/rooms/data/shield-w2-pool.js';
import { W3_WAVES } from '../game/rooms/data/shield-w3-pool.js';
import { MODES, WAVES } from '../game/rooms/data/shield-waves.js';
import { bestIn } from '../game/ext-best.js';
import { createShield } from '../game/rooms/shield.js';
import { buildPool, pickWave } from '../game/rooms/shield-stream.js';
import { uiRoomLabCleared } from './room-modes.js';


const ROOM = 'shield';
const LAB_LEVEL = 'shield-1';
const POOLS = { w2: W2_WAVES, w3: W3_WAVES };
const NEEDS = { w2: 'w1', w3: 'w2' };

function uiShieldClearedMode(app, mode) {
  return mode === 'w1' ? uiRoomLabCleared(app, ROOM, LAB_LEVEL) : bestIn(app.game.ext, ROOM, mode).score > 0;
}
function uiShieldUnlocked(app) {
  return MODES.filter((mode) => !NEEDS[mode] || uiShieldClearedMode(app, NEEDS[mode]));
}
function uiShieldFirstMode(app) {
  return uiShieldUnlocked(app).at(-1);
}
function uiShieldOtherModes(app, mode) {
  return uiShieldUnlocked(app).filter((id) => id !== mode);
}
function uiShieldRunFor(start) {
  const { mode, assist, lastIndex } = start;
  const pool = POOLS[mode] || buildPool();
  const picked = pickWave(pool, lastIndex, Math.random);
  return { state: createShield(picked.wave, { assist, spec: WAVES[mode] }), index: picked.index };
}

export { uiShieldClearedMode, uiShieldUnlocked, uiShieldFirstMode, uiShieldOtherModes, uiShieldRunFor };

import { SHIELD_W1 } from './shield-wave1.js';

const W1_SPEC = { ...SHIELD_W1, id: 'w1', types: '([', fog: false, towers: false };
const W2_SPEC = { ...W1_SPEC, id: 'w2', length: 10, plainVolleys: 0, types: '([{', fog: true };
const W3_SPEC = { ...W1_SPEC, id: 'w3', volleys: 4, plainVolleys: 0, types: '', towers: true };
const WAVES = { w1: W1_SPEC, w2: W2_SPEC, w3: W3_SPEC };
const MODES = ['w1', 'w2', 'w3'];
const W2_POOL = { seed: 2602, size: 12, min: 8 };
const W3_POOL = { seed: 3303, size: 12, min: 8 };
const TOWERS = { min: 1, max: 9, none: -1 };

export { W1_SPEC, W2_SPEC, W3_SPEC, WAVES, MODES, W2_POOL, W3_POOL, TOWERS };

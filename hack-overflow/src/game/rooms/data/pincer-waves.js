import { PINCER_W1 } from './pincer-w1.js';

const W1_SPEC = { ...PINCER_W1, id: 'w1', plank: true, sort: false, dam: false };
const W2_SPEC = { ...W1_SPEC, id: 'w2', plank: false, sort: true };
const W3_SPEC = { ...W1_SPEC, id: 'w3', plank: false, charges: 1, dam: true, maxValue: 12 };
const WAVES = { w1: W1_SPEC, w2: W2_SPEC, w3: W3_SPEC };
const MODES = ['w1', 'w2', 'w3'];
const SORT_STEPS = 33;
const CANNON_SLOTS = 2;
const HINT_MOVES = 3;
const W2_POOL = { seed: 6107, size: 16, min: 12 };
const W3_POOL = { seed: 3319, size: 16, min: 12 };

export { WAVES, MODES, HINT_MOVES, SORT_STEPS, CANNON_SLOTS, W2_POOL, W3_POOL };

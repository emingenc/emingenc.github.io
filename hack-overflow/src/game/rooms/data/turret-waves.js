import { TURRET_W1 } from './turret-wave1.js';

const list = (text) => text.split(' ').map(Number);
const W1_SPEC = {
  ...TURRET_W1, id: 'w1', targets: [{ from: 1, t: TURRET_W1.t0 }, { from: TURRET_W1.tSwitch, t: TURRET_W1.t1 }],
  dark: false, goldEvery: 0, billed: false, endless: false, hintAt: 4, fuseStep: 0, fuseFloor: 0, swarm: null,
};
const W2_SPEC = {
  ...W1_SPEC, id: 'w2', n: 12, targets: null, cycle: list('10 12 9'), group: 4, dark: true, goldEvery: 8, billed: true,
};
const OVERFLOW_SPEC = {
  ...W2_SPEC, id: 'overflow', n: 0, endless: true, hintAt: 0, goldEvery: 8, fuseStep: 100, fuseFloor: 3000,
  swarm: { start: 1500, floor: 600, step: 30, lanes: 3 },
};
const OVERFLOW_ASSIST_SPEC = { ...OVERFLOW_SPEC, id: 'overflow', cycle: list('10 12 9 11 8 13'), swarm: null };
const WAVES = { w1: W1_SPEC, w2: W2_SPEC, overflow: OVERFLOW_SPEC, overflowAssist: OVERFLOW_ASSIST_SPEC };
const MODES = ['w1', 'w2', 'overflow'];
const W2_POOL = { seed: 2026, size: 16, min: 12 };
const GOLD_MULT = 2;
const REVEAL_MS = 500;
const OVERFLOW_CHUNK = 8;
const OVERFLOW_AHEAD = 6;
const OVERFLOW_SEED = 8090;
const OVERFLOW_PACE_DRONES = 10;

export {
  WAVES, MODES, W2_POOL, GOLD_MULT, REVEAL_MS, OVERFLOW_CHUNK, OVERFLOW_AHEAD, OVERFLOW_SEED, OVERFLOW_PACE_DRONES
};

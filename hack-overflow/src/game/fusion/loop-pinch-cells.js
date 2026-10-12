import { LOOP_PINCH } from './loop-pinch.js';

const ROW = 17;
const FIRST_COL = 25;
const VALUE_CELLS = Object.freeze(LOOP_PINCH.nums.map((_,at) => Object.freeze({ col:FIRST_COL + at,row:ROW })));

export { VALUE_CELLS };

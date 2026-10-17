import { MONO_DEQUE } from './mono-deque.js';

const ROW = 17;
const FIRST_COL = 22;
const VALUE_CELLS = Object.freeze(MONO_DEQUE.nums.map((_,at) => Object.freeze({ col:FIRST_COL + at,row:ROW })));

export { VALUE_CELLS };

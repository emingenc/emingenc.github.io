import { BENCH_CELLS } from '../cast/patch.js';

const BLOCK_ROW = 18;
const BLOCK_FIRST_COL = 27;
const BLOCK_COUNT = 5;
const BLOCK_CELLS = Object.freeze(Array.from({ length:BLOCK_COUNT },(_,at) => Object.freeze({ col:BLOCK_FIRST_COL + at,row:BLOCK_ROW })));
const TRIM_CELLS = BENCH_CELLS;

export { BLOCK_CELLS,TRIM_CELLS };

import { WINDOW_MAP } from './window-map.js';

const ROW = 17;
const FIRST_COL = 25;
const LETTER_CELLS = Object.freeze([...WINDOW_MAP.text].map((_,at) => Object.freeze({ col:FIRST_COL + at,row:ROW })));

export { LETTER_CELLS };

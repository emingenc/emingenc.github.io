import { BOLT_RANGE } from './actors.js';

const MITE_RANGE = BOLT_RANGE;
const COACH_RANGE = BOLT_RANGE + 1;
const SHOT_RANGE = 3;
const SHOT_COOLDOWN_MS = 450;
const CORRIDOR_MOUTH = { col:33,row:15 };

const LANES = [
{ id:'mite-a',path:[{ col:35,row:14 },{ col:35,row:15 },{ col:35,row:16 }],hp:1,at:0,dir:1,rest:false },
{ id:'mite-b',path:[{ col:38,row:14 },{ col:38,row:15 },{ col:38,row:16 }],hp:2,at:0,dir:1,rest:true },
];

export { MITE_RANGE, COACH_RANGE, SHOT_RANGE, SHOT_COOLDOWN_MS, CORRIDOR_MOUTH, LANES };

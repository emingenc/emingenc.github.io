import { ASSIST_BRUTE_PER_STEP,RACE_MODES,RACE_RANK,RACE_SOURCE,WRONG_MOVE_MS } from './data/turret-race.js';
import { BRUTE_MS_PER_COMPARE } from './data/turret-wave1.js';
import { bruteCompares } from './turret.js';


function racesIn(mode) {
return RACE_MODES.includes(mode);
}
function bruteChecksAt(run) {
const done = run.assist ? run.steps * ASSIST_BRUTE_PER_STEP :Math.floor(run.playMs / BRUTE_MS_PER_COMPARE);
return Math.min(bruteCompares(run.drones),done);
}
function raceVerdict(run) {
const total = bruteCompares(run.drones);
const youMs = run.playMs + run.wrong * WRONG_MOVE_MS;
const bruteMs = total * BRUTE_MS_PER_COMPARE;
const bruteTicks = Math.ceil(total / ASSIST_BRUTE_PER_STEP);
const youTicks = run.steps;
const youWin = run.assist ? youTicks < bruteTicks :youMs < bruteMs;
return { winner:youWin ? 'you' :'brute',assist:run.assist,youMs,bruteMs,youTicks,bruteTicks,checks:bruteChecksAt(run) };
}

export { RACE_MODES,WRONG_MOVE_MS,ASSIST_BRUTE_PER_STEP,RACE_SOURCE,RACE_RANK,racesIn,bruteChecksAt,raceVerdict };

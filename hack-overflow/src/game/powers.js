import { labBest } from './save.js';

const TURRET_LAB = 'turret';
const TURRET_LEVEL = 'turret-1';

function hasLookup(save) {
return labBest({ labs:save.labs ?? {} },TURRET_LAB,TURRET_LEVEL) > 0;
}

export { hasLookup };

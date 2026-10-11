import { trialsOf } from '../ext/power-ops.js';
import { LOOKUP } from './lookup.js';
import { PINCER_POWER } from './pincer-power.js';
import { PLATE_POWER } from './plate-power.js';

const POWER_RIGS = [['lookup','turret'],['pincer','pincer'],['plate','shield']];
const LENDABLE = ['pincer','plate'];
const POWERS = [LOOKUP,PINCER_POWER,PLATE_POWER];

function ownedPowers(won) {
return POWER_RIGS.filter(([,rig]) => won.has(rig)).map(([id]) => id);
}
function usablePowers(won,ext) {
const owned = ownedPowers(won);
return POWER_RIGS.map(([id]) => id).filter((id) => owned.includes(id) || (LENDABLE.includes(id) && trialsOf(ext,id) > 0));
}

export { POWERS,ownedPowers,usablePowers };

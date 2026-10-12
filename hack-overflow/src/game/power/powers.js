import { trialsOf } from '../ext/power-ops.js';
import { LOOKUP } from './lookup.js';
import { NET_POWER } from './net-power.js';
import { PINCER_POWER } from './pincer-power.js';
import { PLATE_POWER } from './plate-power.js';

const POWER_RIGS = [['lookup','turret'],['pincer','pincer'],['plate','shield'],['net','net']];
const LENDABLE = ['pincer','plate','net'];
const POWERS = [LOOKUP,PINCER_POWER,PLATE_POWER,NET_POWER];

function ownedPowers(won) {
return POWER_RIGS.filter(([,rig]) => won.has(rig)).map(([id]) => id);
}
function usablePowers(won,ext) {
const owned = ownedPowers(won);
return POWER_RIGS.map(([id]) => id).filter((id) => owned.includes(id) || (LENDABLE.includes(id) && trialsOf(ext,id) > 0));
}

export { POWERS,ownedPowers,usablePowers };

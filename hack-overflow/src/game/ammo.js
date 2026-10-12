import { BOLT_RANGE,nearestAwakeFoe } from './actors.js';

const AMMO_AT = Object.freeze(Object.values({ 1:6,2:8,3:8,4:10,5:10,6:12,7:12,8:14,9:16 }));
const DRY_TEXT = 'DRY. A bare ping. BOLT recharges at a door.';

function wholeCount(value) {
return Number.isFinite(value) ? Math.max(0,Math.floor(value)) :0;
}
function ammoMax(level) {
const index = Math.min(AMMO_AT.length,Math.max(1,wholeCount(level))) - 1;
return AMMO_AT[index];
}
function spendShot(ammo) {
const left = wholeCount(ammo);
return left > 0 ? { ammo:left - 1,dry:false } :{ ammo:0,dry:true };
}
function refill(max) {
return Number.isFinite(max) && max > 0 ? Math.floor(max) :AMMO_AT[0];
}
function shouldBreakContactRefill(actors,heroCell,range = BOLT_RANGE) {
if (!Array.isArray(actors) || !heroCell) return false;
return nearestAwakeFoe(actors,heroCell,range) === null;
}
function countsAmmo(ext) {
return Boolean(ext?.beats?.includes('bolt'));
}
function ammoLabel(ammo,max) {
const left = Math.min(wholeCount(ammo),wholeCount(max));
return { text:left + '/' + max,aria:'Ammo ' + left + ' of ' + max };
}

export { AMMO_AT,DRY_TEXT,ammoMax,spendShot,refill,shouldBreakContactRefill,countsAmmo,ammoLabel };

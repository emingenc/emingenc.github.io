import { hasBeat } from '../ext/ops.js';
import { BEATS } from '../finale/contract.js';

const WHO = 'BRUTE';
const FAN_ID = 'brute-fan';
const FAN_LINES = Object.freeze(['MY FAN IS DOWN. THE CHECKS ARE GETTING HOT.','COOL IT, OR WALK ON. I KEEP CHECKING.']);
const COOL = Object.freeze({ id:'cool',label:'COOL IT' });
const WALK = Object.freeze({ id:'walk',label:'WALK ON' });
const LATER = Object.freeze({ id:'later',label:'NOT NOW',default:true });
const FAN_TOASTS = Object.freeze({ cool:'BRUTE: ...HM. COLD. THANKS.',walk:'BRUTE: FINE. I SWEAT.' });

function fanDue(ext) {
return hasBeat(ext,BEATS.m4) && !hasBeat(ext,BEATS.fan);
}
function fanSheet(ammo) {
const dry = Number.isFinite(ammo) && ammo < 1;
const choices = dry ? [WALK,LATER] :[COOL,WALK];
return { id:FAN_ID,lines:FAN_LINES.map((text) => ({ who:WHO,text })),choices:choices.map((choice) => ({ ...choice })) };
}
export { FAN_TOASTS,fanDue,fanSheet };

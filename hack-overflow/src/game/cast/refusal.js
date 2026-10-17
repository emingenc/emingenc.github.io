import { hasBeat,withGhost } from '../ext/ops.js';
import { isLine } from '../opening.js';
import { fireHold } from './fire-words.js';

const SENTINEL_ID = 'sentinel-0';
const SENTINEL_CELL = Object.freeze({ col:38,row:15 });
const REACH = 2;
const SHOW_RANGE = 8;
const REFUSAL_BEAT = 'refusal';
const DOWN_BEAT = 'sentinel-dn';
const PICKS = Object.freeze({ go:'go',check:'check' });
const GHOST = 'GHOSTWRITER';
const SHEET = Object.freeze({
id:'refusal',
lines:[{ who:GHOST,text:'Try the corridor. I am sure it is fine.' }],
choices:[{ id:PICKS.go,label:'GO' },{ id:PICKS.check,label:'CHECK FIRST',default:true }],
});
const BUMP_TOAST = 'It heals faster than you hit.';
const holdToast = (coarse) => 'Hold ' + fireHold(coarse) + ' to charge a BOLT shot.';
const SHOT_TOASTS = Object.freeze({
kill:{ text:'SENTINEL DOWN',kind:'reward' },
dent:{ text:'Hit. It heals 1 per tick.',kind:'info' },
far:{ text:'Too far.',kind:'info',replace:true },
cool:{ text:'Recharging.',kind:'info',replace:true },
still:{ text:'Hit.',kind:'info' },
});
const LINE_SENTINEL = Object.freeze({ hp:2,regen:0 });

function isVeteran(facts) {
return facts.breached > 0 || facts.barrierOpen;
}
function refusalDue(ext,facts) {
return !hasBeat(ext,REFUSAL_BEAT) && !isVeteran(facts) && !isLine(ext);
}
function sentinelDue(ext,facts) {
if (isLine(ext)) return hasBeat(ext,'bolt') && !hasBeat(ext,DOWN_BEAT) && !facts.barrierOpen;
return !hasBeat(ext,DOWN_BEAT) && !isVeteran(facts);
}
function reach(hero,cell) {
return Math.max(Math.abs(hero.col - cell.col),Math.abs(hero.row - cell.row));
}
function nearSentinel(hero,range = REACH) {
return reach(hero,SENTINEL_CELL) <= range;
}
function withFirstPick(ext,pick) {
if (!Object.hasOwn(PICKS,pick)) return ext;
return ext.ghost && ext.ghost.first ? ext :withGhost(ext,{ first:pick });
}

export {
SENTINEL_ID,SENTINEL_CELL,REACH,SHOW_RANGE,REFUSAL_BEAT,DOWN_BEAT,PICKS,SHEET,BUMP_TOAST,holdToast,SHOT_TOASTS,LINE_SENTINEL,
isVeteran,refusalDue,sentinelDue,nearSentinel,withFirstPick,
};

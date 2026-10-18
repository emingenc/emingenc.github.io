import { hasBeat,hasFind,withFind } from '../ext/ops.js';
import { DRAWER_FIND,refactorLit } from '../finale/refactor.js';
import { ownedPowers } from '../power/powers.js';

const SEPARATOR = ' . ';

function ended(save) {
return Boolean(save) && save.ended === true;
}
function litOf(open) {
return (won,ext) => refactorLit(won,ext) && hasFind(ext,DRAWER_FIND) && open(ownedPowers(won));
}
function dueOf(lit,beat) {
return (won,ext,save) => lit(won,ext) && !hasBeat(ext,beat) && !ended(save);
}
function readyOf(lit,marks) {
return (won,ext,save) => lit(won,ext) && hasBeat(ext,marks.beat) && !hasFind(ext,marks.find) && !ended(save);
}
function openOf(lit,beat) {
return (won,ext,save) => lit(won,ext) && hasBeat(ext,beat) && !ended(save);
}
function clearOf(find) {
return (ext) => withFind(ext,find);
}
function outcomeOf(spec) {
return (run) => {
if (run.status !== 'won') return null;
const par = spec.par();
const atPar = run.moves <= par && run.wrong === 0;
const mine = run.moves + ' presses, ' + run.wrong + ' wrong. Par ' + par + '.';
return { rank:spec.rank,source:spec.source,atPar,lines:[atPar ? 'BIT: At par. ' + mine :'BIT: ' + mine,spec.brute(run)] };
};
}
function chipsOf(moves) {
return moves.map((one) => ({ id:'move-' + one.move,label:one.label,aria:one.aria,move:one.move }));
}
function viewOf(parts) {
return {
n:0,head:parts.head,count:'PRESS ' + parts.presses + SEPARATOR + 'PAR ' + parts.par,ask:parts.ask,
tele:parts.tele,note:'',fiction:'',chips:parts.chips,
};
}

function trialKit(spec) {
const lit = litOf(spec.open);
return {
lit,due:dueOf(lit,spec.beat),ready:readyOf(lit,spec),open:openOf(lit,spec.beat),clear:clearOf(spec.find),outcome:outcomeOf(spec),
};
}

export { SEPARATOR,trialKit,chipsOf,viewOf };

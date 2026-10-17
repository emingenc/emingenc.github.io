import { hasBeat,hasFind,withFind } from '../ext/ops.js';
import { DRAWER_FIND,refactorLit } from '../finale/refactor.js';
import { ownedPowers } from '../power/powers.js';
import { bruteWindows,windowMapNeed,windowMapPar,windowMapText } from './window-map.js';

const LIT_BEAT = 'window-map';
const CLEAR_FIND = 'window-map';
const RANK_SOURCE = 'window-map';
const RANK_PAID = 20;
const OFFER_ID = 'window-map-offer';
const LIT_LINES = Object.freeze(['BIT: WINDOW MAP is lit. NET and LOOKUP, composed.',"BIT: Keep the shortest window that holds the whole map. Try it on PATCH's bench."]);
const OFFER_LINES = Object.freeze([
{ who:'BIT',text:'A row of letters. The NEED map lists what the window must hold. EXTEND takes the next letter in, SHRINK lets the tail go.' },
{ who:'BIT',text:'BEST keeps a window that holds the whole map. Keep it before SHRINK breaks it, and keep only a shorter one.' },
]);
const SEPARATOR = ' . ';
const MOVE_CHIPS = Object.freeze([
{ move:'extend',label:'EXTEND',aria:'Extend the window by one letter' },
{ move:'shrink',label:'SHRINK',aria:'Shrink the window by one letter' },
{ move:'best',label:'BEST',aria:'Keep this window as the shortest' },
]);

function ended(save) {
return Boolean(save) && save.ended === true;
}
function windowMapOpen(usable) {
return usable.includes('net') && usable.includes('lookup');
}
function windowMapLit(won,ext) {
return refactorLit(won,ext) && hasFind(ext,DRAWER_FIND) && windowMapOpen(ownedPowers(won));
}
function windowMapDue(won,ext,save) {
return windowMapLit(won,ext) && !hasBeat(ext,LIT_BEAT) && !ended(save);
}
function trialReady(won,ext,save) {
return windowMapLit(won,ext) && hasBeat(ext,LIT_BEAT) && !hasFind(ext,CLEAR_FIND) && !ended(save);
}
function trialClear(ext) {
return withFind(ext,CLEAR_FIND);
}
function trialOutcome(run) {
if (run.status !== 'won') return null;
const par = windowMapPar();
const atPar = run.moves <= par && run.wrong === 0;
const mine = run.moves + ' presses, ' + run.wrong + ' wrong. Par ' + par + '.';
const brute = 'BRUTE: ' + bruteWindows() + ' windows checked. You pressed ' + run.moves + '.';
return { rank:RANK_PAID,source:RANK_SOURCE,atPar,lines:[atPar ? 'BIT: At par. ' + mine :'BIT: ' + mine,brute] };
}
function needLine(run) {
const need = windowMapNeed(run);
const parts = Object.keys(need).map((letter) => letter + need[letter]);
return 'NEED ' + parts.join(' ') + SEPARATOR + 'MISSING ' + run.missing;
}
function keptLine(run) {
return run.best ? 'BEST ' + windowMapText(run,run.best) + ' (' + (run.best.to - run.best.from) + ')' :'BEST none yet';
}
function trialView(run) {
const window = windowMapText(run);
return {
n:0,head:'WINDOW MAP',count:'PRESS ' + run.moves + SEPARATOR + 'PAR ' + windowMapPar(),ask:needLine(run),
tele:'WINDOW ' + (window || 'empty') + SEPARATOR + keptLine(run),note:'',fiction:'',
chips:MOVE_CHIPS.map((one) => ({ id:'move-' + one.move,label:one.label,aria:one.aria,move:one.move })),
};
}

export { LIT_BEAT,CLEAR_FIND,RANK_SOURCE,RANK_PAID,OFFER_ID,LIT_LINES,OFFER_LINES,windowMapOpen,windowMapLit,windowMapDue,trialReady,trialClear,trialOutcome,trialView };

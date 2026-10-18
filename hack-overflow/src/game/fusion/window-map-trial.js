import { bruteWindows,windowMapNeed,windowMapPar,windowMapText } from './window-map.js';
import { SEPARATOR,chipsOf,trialKit,viewOf } from './trial-kit.js';

const LIT_BEAT = 'window-map';
const CLEAR_FIND = 'window-map';
const RANK_SOURCE = 'window-map';
const RANK_PAID = 20;
const OFFER_ID = 'window-map-offer';
const LIT_LINES = Object.freeze(['BIT: WINDOW MAP is lit. NET and LOOKUP, composed.','BIT: Keep the shortest window that holds the whole map. Step on the glowing tile on the floor.']);
const OFFER_LINES = Object.freeze([
{ who:'BIT',text:'A row of letters. The NEED map lists what the window must hold. EXTEND takes the next letter in, SHRINK lets the tail go.' },
{ who:'BIT',text:'BEST keeps a window that holds the whole map. Keep it before SHRINK breaks it, and keep only a shorter one.' },
]);
const MISTAKE_NAMES = Object.freeze({
'late-extend':'EXTEND on a window that covers','early-shrink':'SHRINK before it covered','early-best':'BEST on a window that misses',
'lost-best':'SHRINK broke an unkept best','not-shorter':'BEST on a window not shorter',
});
const MOVE_CHIPS = Object.freeze([
{ move:'extend',label:'EXTEND',aria:'Extend the window by one letter' },
{ move:'shrink',label:'SHRINK',aria:'Shrink the window by one letter' },
{ move:'best',label:'BEST',aria:'Keep this window as the shortest' },
]);

function windowMapOpen(usable) {
return usable.includes('net') && usable.includes('lookup');
}
const kit = trialKit({
open:windowMapOpen,beat:LIT_BEAT,find:CLEAR_FIND,source:RANK_SOURCE,rank:RANK_PAID,par:windowMapPar,
brute:(run) => 'BRUTE: ' + bruteWindows() + ' windows checked. You pressed ' + run.moves + '.',
});
const { lit:windowMapLit,due:windowMapDue,ready:trialReady,open:machineOpen,clear:trialClear,outcome:trialOutcome } = kit;
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
return viewOf({
head:'WINDOW MAP',presses:run.moves,par:windowMapPar(),ask:needLine(run),tele:'WINDOW ' + (window || 'empty') + SEPARATOR + keptLine(run),
chips:chipsOf(MOVE_CHIPS),
});
}

export { LIT_BEAT,CLEAR_FIND,RANK_SOURCE,RANK_PAID,OFFER_ID,LIT_LINES,OFFER_LINES,MISTAKE_NAMES,windowMapOpen,windowMapLit,windowMapDue,trialReady,machineOpen,trialClear,trialOutcome,trialView };

import { hasBeat,hasFind,withFind } from '../ext/ops.js';
import { REFUSAL_BEAT } from '../cast/refusal.js';
import { ownedPowers } from '../power/powers.js';
import { BEATS } from './contract.js';

const LIT_BEAT = 'refactor';
const DRAWER_FIND = 'patch-drawer';
const DRAWER_RANK = 15;
const DRAWER_SOURCE = 'refactor-drawer';
const POWERS_NEEDED = 2;
const LIT_LINES = Object.freeze(['BIT: REFACTOR is lit. Two powers can compose.',"BIT: PATCH's drawer glows. Bump his bench."]);
const WAIT_LINE = 'BIT: REFACTOR needs two powers. Win another room.';
const DRAWER_LINES = Object.freeze(["PATCH's drawer slides open. A cyan card:",'"Small tools, composed. Measure twice."']);

function ended(save) {
return Boolean(save) && save.ended === true;
}

function refactorLit(won,ext) {
return hasBeat(ext,BEATS.m4) && hasBeat(ext,REFUSAL_BEAT) && ownedPowers(won).length >= POWERS_NEEDED;
}
function refactorDue(won,ext,save) {
return refactorLit(won,ext) && !hasBeat(ext,LIT_BEAT) && !ended(save);
}
function drawerReady(won,ext,save) {
return refactorLit(won,ext) && !hasFind(ext,DRAWER_FIND) && !ended(save);
}
function openDrawer(ext) {
return withFind(ext,DRAWER_FIND);
}

export { LIT_BEAT,DRAWER_FIND,DRAWER_RANK,DRAWER_SOURCE,LIT_LINES,WAIT_LINE,DRAWER_LINES,refactorLit,refactorDue,drawerReady,openDrawer };

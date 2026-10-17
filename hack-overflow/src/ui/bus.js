import { createBus } from '../game/bus.js';

let uiBus = null;
function uiGameBus() {
if (!uiBus) uiBus = createBus();
return uiBus;
}
function uiEmit(type,payload) {
uiGameBus().emit(type,payload);
}

const GRID_HOOKS = ['step','bump','tick','enter-cell','interact'];
const gridBus = createBus();
const claimers = new Map(GRID_HOOKS.map((name) => [name,[]]));

function uiGridHook(name,fn) {
if (!GRID_HOOKS.includes(name)) throw new RangeError('Unknown Grid hook "' + name + '"');
return gridBus.on(name,fn);
}
function uiGridClaim(name,claim) {
if (!GRID_HOOKS.includes(name)) throw new RangeError('Unknown Grid hook "' + name + '"');
claimers.get(name).push(claim);
}
function uiClaimed(name,info) {
return claimers.get(name).some(function (claim) {
try {
return claim(info) === true;
} catch (error) {
console.error(error);
return false;
}
});
}
function uiGridEmit(app,name,payload) {
const info = { ...payload,app };
if (!uiClaimed(name,info)) gridBus.emit(name,info);
}

export { uiGameBus, uiEmit, uiGridHook, uiGridClaim, uiGridEmit };

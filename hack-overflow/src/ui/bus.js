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

function uiGridHook(name,fn) {
if (!GRID_HOOKS.includes(name)) throw new RangeError('Unknown Grid hook "' + name + '"');
return gridBus.on(name,fn);
}
function uiGridEmit(app,name,payload) {
gridBus.emit(name,{ ...payload,app });
}

export { uiGameBus, uiEmit, uiGridHook, uiGridEmit };

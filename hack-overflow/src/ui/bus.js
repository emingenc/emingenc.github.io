import { createBus } from '../game/bus.js';

let uiBus = null;
function uiGameBus() {
if (!uiBus) uiBus = createBus();
return uiBus;
}
function uiEmit(type,payload) {
uiGameBus().emit(type,payload);
}

export { uiGameBus, uiEmit };

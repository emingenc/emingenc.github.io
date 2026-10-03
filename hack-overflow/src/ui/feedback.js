import { uiGameBus } from './bus.js';
import { uiWireSfx } from './sfx.js';
import { uiWireFx } from './fx.js';
import { uiWireAnnounce } from './announce.js';
import { uiGameDebug, uiDebugPush } from './game-state.js';

let uiFeedbackWired = false;
function uiLogEvent(type) {
uiDebugPush(uiGameDebug().log,{ type,t:Math.round(performance.now()) });
}
function uiWireFeedback() {
if (uiFeedbackWired) return;
uiFeedbackWired = true;
const bus = uiGameBus();
bus.on('*',uiLogEvent);
uiWireSfx(bus);
uiWireFx(bus);
uiWireAnnounce(bus);
}

export { uiWireFeedback };

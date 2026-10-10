import { uiOpenRigScreen } from './rig-loader.js';


let uiStreamLoading = null;

function uiLoadStreamModule() {
if (!uiStreamLoading) uiStreamLoading = import('./screen-stream.js');
return uiStreamLoading;
}
async function uiOpenStream(app) {
let mod;
try {
mod = await uiLoadStreamModule();
} catch (error) {
uiStreamLoading = null;
throw error;
}
await uiOpenRigScreen(app,{ id:'stream',screen:mod.uiStreamScreen,ready:mod.uiRigReady,open:mod.uiStreamOpen });
}

export { uiOpenStream };

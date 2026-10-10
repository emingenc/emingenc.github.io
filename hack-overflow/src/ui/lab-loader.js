import { uiOpenRigScreen } from './rig-loader.js';


let uiLabLoading = null;

function uiLoadLabModule() {
if (!uiLabLoading) uiLabLoading = import('./screen-lab.js');
return uiLabLoading;
}
async function uiOpenLabs(app) {
let mod;
try {
mod = await uiLoadLabModule();
} catch (error) {
uiLabLoading = null;
throw error;
}
await uiOpenRigScreen(app,{ id:'lab',screen:mod.uiLabScreen,ready:mod.uiRigReady,open:mod.uiLabOpen });
}

export { uiOpenLabs };

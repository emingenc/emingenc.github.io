import { uiOpenRigScreen } from './rig-loader.js';


let uiForgeLoading = null;

function uiLoadForgeModule() {
if (!uiForgeLoading) uiForgeLoading = import('./screen-forge.js');
return uiForgeLoading;
}
async function uiOpenForge(app) {
let mod;
try {
mod = await uiLoadForgeModule();
} catch (error) {
uiForgeLoading = null;
throw error;
}
await uiOpenRigScreen(app,{ id:'forge',screen:mod.uiForgeScreen,ready:mod.uiRigReady,open:mod.uiForgeOpen });
}

export { uiOpenForge };

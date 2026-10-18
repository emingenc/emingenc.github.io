import { applyWindowMap,bruteWindows,createWindowMap,windowMapMistake,windowMapPar } from '../game/fusion/window-map.js';
import * as trial from '../game/fusion/window-map-trial.js';
import { uiFusionEnter,uiInstallFusion } from './grid-fusion-scene.js';
import { uiPaintWindowMap } from './grid-window-map-draw.js';


const WINDOW_MAP = {
key:'windowMap',
hook:'window-map',
rules:{ create:createWindowMap,apply:applyWindowMap,mistake:windowMapMistake,par:windowMapPar,brute:bruteWindows },
trial:{ ...trial,due:trial.windowMapDue },
paint:uiPaintWindowMap,
};

function uiInstallWindowMap(app) {
uiInstallFusion(WINDOW_MAP,app);
}
function uiWindowMapEnter(app) {
uiFusionEnter(WINDOW_MAP,app);
}

export { WINDOW_MAP,uiInstallWindowMap,uiWindowMapEnter };

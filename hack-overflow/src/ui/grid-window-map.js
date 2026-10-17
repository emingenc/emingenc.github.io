import { applyWindowMap,createWindowMap,windowMapMistake } from '../game/fusion/window-map.js';
import * as trial from '../game/fusion/window-map-trial.js';
import { uiFusionBusy,uiFusionEnter,uiInstallFusion } from './grid-fusion-scene.js';
import { LOOP_PINCH } from './grid-loop-pinch.js';
import { uiPaintWindowMap } from './grid-window-map-draw.js';


const WINDOW_MAP = {
key:'windowMap',
hook:'window-map',
rules:{ create:createWindowMap,apply:applyWindowMap,mistake:windowMapMistake },
trial:{ ...trial,due:trial.windowMapDue },
paint:uiPaintWindowMap,
others:(game) => uiFusionBusy(LOOP_PINCH,game),
};

function uiInstallWindowMap(app) {
uiInstallFusion(WINDOW_MAP,app);
}
function uiWindowMapEnter(app) {
uiFusionEnter(WINDOW_MAP,app);
}

export { uiInstallWindowMap,uiWindowMapEnter };

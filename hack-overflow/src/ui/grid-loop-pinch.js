import { applyLoopPinch,createLoopPinch,loopPinchMistake } from '../game/fusion/loop-pinch.js';
import * as trial from '../game/fusion/loop-pinch-trial.js';
import { uiPaintLoopPinch } from './grid-loop-pinch-draw.js';
import { uiFusionEnter,uiInstallFusion } from './grid-fusion-scene.js';


const LOOP_PINCH = {
key:'loopPinch',
hook:'loop-pinch',
rules:{ create:createLoopPinch,apply:applyLoopPinch,mistake:loopPinchMistake },
trial:{ ...trial,due:trial.loopPinchDue },
paint:uiPaintLoopPinch,
others:(game) => Boolean(game.windowMap && game.windowMap.busy),
};

function uiInstallLoopPinch(app) {
uiInstallFusion(LOOP_PINCH,app);
}
function uiLoopPinchEnter(app) {
uiFusionEnter(LOOP_PINCH,app);
}

export { LOOP_PINCH,uiInstallLoopPinch,uiLoopPinchEnter };

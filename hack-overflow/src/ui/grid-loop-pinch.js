import { applyLoopPinch,bruteChecks,createLoopPinch,loopPinchMistake,loopPinchPar } from '../game/fusion/loop-pinch.js';
import * as trial from '../game/fusion/loop-pinch-trial.js';
import { uiPaintLoopPinch } from './grid-loop-pinch-draw.js';
import { uiFusionEnter,uiInstallFusion } from './grid-fusion-scene.js';


const LOOP_PINCH = {
key:'loopPinch',
hook:'loop-pinch',
rules:{ create:createLoopPinch,apply:applyLoopPinch,mistake:loopPinchMistake,par:loopPinchPar,brute:bruteChecks },
trial:{ ...trial,due:trial.loopPinchDue },
paint:uiPaintLoopPinch,
};

function uiInstallLoopPinch(app) {
uiInstallFusion(LOOP_PINCH,app);
}
function uiLoopPinchEnter(app) {
uiFusionEnter(LOOP_PINCH,app);
}

export { LOOP_PINCH,uiInstallLoopPinch,uiLoopPinchEnter };

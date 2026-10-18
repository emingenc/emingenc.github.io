import { applyMonoDeque,bruteLooks,createMonoDeque,monoDequeMistake,monoDequePar } from '../game/fusion/mono-deque.js';
import { monoDequeAutoReady,monoDequeForcedMove } from '../game/fusion/mono-deque-auto.js';
import * as trial from '../game/fusion/mono-deque-trial.js';
import { uiFusionEnter,uiInstallFusion } from './grid-fusion-scene.js';
import { uiPaintMonoDeque } from './grid-mono-deque-draw.js';


const MONO_DEQUE_FUSION = {
key:'monoDeque',
hook:'mono-deque',
rules:{ create:createMonoDeque,apply:applyMonoDeque,mistake:monoDequeMistake,par:monoDequePar,brute:bruteLooks },
trial:{ ...trial,due:trial.monoDequeDue },
paint:uiPaintMonoDeque,
auto:{ ready:monoDequeAutoReady,forced:monoDequeForcedMove },
};

function uiInstallMonoDeque(app) {
uiInstallFusion(MONO_DEQUE_FUSION,app);
}
function uiMonoDequeEnter(app) {
uiFusionEnter(MONO_DEQUE_FUSION,app);
}

export { MONO_DEQUE_FUSION,uiInstallMonoDeque,uiMonoDequeEnter };

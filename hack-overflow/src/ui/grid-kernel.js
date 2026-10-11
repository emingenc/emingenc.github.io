import { BEATS } from '../game/finale/contract.js';
import { hasBeat } from '../game/ext/ops.js';


async function uiKernelRun(app,opts = {}) {
const game = app.game;
if (game.kernelBusy) return;
game.kernelBusy = true;
try {
if (!hasBeat(game.ext,BEATS.roadback)) await (await import('./grid-roadback.js')).uiRoadBack(app);
if (opts.bump) await (await import('./grid-kernel-phases.js')).uiKernelPhases(app);
} finally {
game.kernelBusy = false;
}
}

export { uiKernelRun };

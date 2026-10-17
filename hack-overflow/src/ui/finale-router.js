import { hasBeat } from '../game/ext/ops.js';
import { BEATS,finalePhase } from '../game/finale/contract.js';
import { uiOpenEnding } from './screen-ending.js';

async function uiReview(app) {
const game = app.game;
if (!hasBeat(game.ext,BEATS.reveal)) {
game.kernelBusy = true;
await import('./grid-kernel-reveal.js').then((reveal) => reveal.uiRevealPlay(app)).catch(console.error).finally(function () { game.kernelBusy = false; });
}
if (app.game === game) return (await import('./review-loader.js')).uiOpenReview(app);
}

async function uiRoute(app,phase) {
if (phase === 'review') return uiReview(app);
if (phase === 'roadback' || phase === 'kernel') return (await import('./grid-kernel.js')).uiKernelRun(app,{ bump:true });
return uiOpenEnding(app);
}

async function uiFinaleRoute(app) {
const game = app.game;
if (game.kernelBusy) return;
const phase = finalePhase(game.ext,game.save,game.progress.left);
await uiRoute(app,phase);
if (phase !== 'roadback' && phase !== 'kernel') return;
if (finalePhase(game.ext,game.save,game.progress.left) === 'review') await uiRoute(app,'review');
}

export { uiFinaleRoute };

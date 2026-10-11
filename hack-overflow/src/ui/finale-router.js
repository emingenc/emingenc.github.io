import { finalePhase } from '../game/finale/contract.js';
import { uiOpenEnding } from './screen-ending.js';

async function uiRoute(app,phase) {
if (phase === 'review') return (await import('./review-loader.js')).uiOpenReview(app);
if (phase === 'roadback' || phase === 'kernel') return (await import('./grid-kernel.js')).uiKernelRun(app,{ bump:true });
return uiOpenEnding(app);
}

async function uiFinaleRoute(app) {
const game = app.game;
const phase = finalePhase(game.ext,game.save,game.progress.left);
await uiRoute(app,phase);
if (phase !== 'roadback' && phase !== 'kernel') return;
if (finalePhase(game.ext,game.save,game.progress.left) === 'review') await uiRoute(app,'review');
}

export { uiFinaleRoute };

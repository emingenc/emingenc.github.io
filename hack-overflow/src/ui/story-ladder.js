import { uiRenderKeepingFocus } from './app.js';
import { uiShowToast } from './grid-toast.js';

async function uiStoryChain(app,beat) {
const game = app.game;
const gen = game.gen;
const told = (app.game.ext && app.game.ext.beats) || [];
const later = window.setTimeout.bind(window);
const ladder = await import('../game/story/ladder.js');
ladder.ladderRest(beat.id,told).forEach(function (text,at) {
later(function () {
if (app.screen !== 'grid' || app.game !== game || game.gen !== gen) return;
uiShowToast(app,{ text,kind:'info' });
uiRenderKeepingFocus(app);
},ladder.LADDER_GAP_MS * (at + 1));
});
}

export { uiStoryChain };

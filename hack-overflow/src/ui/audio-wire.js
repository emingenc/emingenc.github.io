import { audioWanted } from '../game/ext/audio-ops.js';

let uiHeroLoaded = false;
function uiLoadHero() {
return import('./hero-audio.js').then(function (hero) {
uiHeroLoaded = true;
return hero;
});
}
function uiWantsHero(app) {
return audioWanted(app && app.game && app.game.ext);
}

function uiCue(app,name) {
uiLoadHero().then(function (hero) { hero.uiHeroCue(app,name); }).catch(function () {});
}
function uiBootHeroAudio(app) {
if (!uiWantsHero(app)) return;
uiLoadHero().then(function (hero) { hero.uiHeroAudioStart(app); }).catch(function () {});
}
function uiSyncHeroAudio(app) {
if (!uiHeroLoaded && !uiWantsHero(app)) return;
uiLoadHero().then(function (hero) { hero.uiHeroAudioSync(app); }).catch(function () {});
}

export { uiBootHeroAudio,uiCue,uiSyncHeroAudio };

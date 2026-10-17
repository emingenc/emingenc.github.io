import { audioChoice,withAudio } from '../game/ext/audio-ops.js';
import { createExt } from '../game/save-ext.js';
import { uiRenderKeepingFocus } from './app.js';
import { uiIsSoundOn,uiToggleSound } from './audio.js';
import { uiSyncHeroAudio } from './audio-wire.js';
import { uiCommitExt } from './ext-storage.js';
import { uiStoryChoice } from './story-dialogue.js';

const CARD = {
id:'jack-in',
lines:[{ who:'GHOSTWRITER',text:'The Grid has a sound: a low hum, a chime for each win. Jack in with it, or keep it silent? SOUND in the menu changes it later.' }],
choices:[{ id:'on',label:'JACK IN' },{ id:'silent',label:'JACK IN silent',default:true }],
};

function uiApplyChoice(app,choice) {
uiCommitExt(app,withAudio(app.game.ext || createExt(),choice));
if (uiIsSoundOn() !== (choice === 'on')) app.soundOn = uiToggleSound();
uiSyncHeroAudio(app);
}
async function uiJackInAsk(app) {
const gen = app.game.gen;
const pick = await uiStoryChoice(app,CARD);
if (app.game.gen === gen) uiApplyChoice(app,pick === 'on' ? 'on' :'silent');
}
function uiJackInEnter(app,proceed) {
const game = app.game;
const gen = game.gen;
if (game.audioAsk) return;
game.audioAsk = true;
uiJackInAsk(app)
.catch(function () {})
.then(function () {
if (game.gen !== gen) return;
game.audioAsk = false;
if (app.screen !== 'grid') return;
proceed(app);
if (typeof document !== 'undefined') uiRenderKeepingFocus(app);
});
}
function uiMirrorSound(app) {
const ext = app.game.ext;
if (!audioChoice(ext)) return;
const next = withAudio(ext,uiIsSoundOn() ? 'on' :'silent');
if (next !== ext) uiCommitExt(app,next);
uiSyncHeroAudio(app);
}

export { uiJackInAsk,uiJackInEnter,uiMirrorSound };

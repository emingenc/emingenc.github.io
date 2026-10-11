import { startFlow } from '../game/story/story.js';
import { uiRenderApp } from './app.js';
import { uiCastStill } from './grid-cast-act.js';
import { uiStoryBegin,uiStorySettle } from './story-dialogue.js';

const WAIT_MS = 250;

function uiOnGrid(app) {
const game = app.game;
const gen = game.gen;
return new Promise(function (resolve) {
function look() {
if (app.game !== game || game.gen !== gen) return;
if (app.screen === 'grid' && !app.story) resolve();
else window.setTimeout(look,WAIT_MS);
}
look();
});
}
function uiAnswerButton(target,choice,answer) {
const button = document.createElement('button');
button.className = 'story-choice';
button.type = 'button';
button.textContent = answer.label;
button.setAttribute('data-focus-key','story-choice-' + answer.id);
button.setAttribute('aria-label',answer.label);
button.addEventListener('click',function () {
if (target.story && target.story.choice === choice) {
uiStorySettle(target,answer.id);
uiRenderApp(target);
}
});
return button;
}
function uiOneChoice(answer,resolve) {
const choice = { choices:[answer],resolve };
let shown = null;
let asked = false;
choice.buttons = function (target) {
shown = { target,button:uiAnswerButton(target,choice,answer) };
return [shown.button];
};
choice.ask = function () {
if (asked) return;
asked = true;
shown.target.lastFocusKey = shown.button.getAttribute('data-focus-key');
shown.button.focus();
};
return choice;
}
async function uiOrdealSheet(app,sheet) {
const kit = await import('./story-choice.js');
await uiOnGrid(app);
await uiCastStill(app);
return new Promise(function (resolve) {
uiStoryBegin(app,startFlow([{ id:sheet.id,lines:sheet.lines,toast:false }]),uiOneChoice(sheet.choices[0],resolve));
kit.uiChoiceWireKeys(app);
uiRenderApp(app);
});
}

export { uiOnGrid,uiOrdealSheet };

import { startFlow } from '../game/story/story.js';
import { uiRenderApp } from './app.js';
import { uiEl } from './dom.js';
import { sheetGuardPress } from './sheet-guard.js';
import { uiStoryBegin,uiStorySettle } from './story-dialogue.js';
import { uiStoryLineDone } from './story-render.js';


const CHOICE_MIN = 2;
const CHOICE_MAX = 3;
const CHOICE_POLL_MS = 100;
const CHOICE_KEY_PREFIX = 'story-choice-';
const uiKeyedDocuments = new WeakSet();

function uiChoiceDefaults(choices) {
return choices.filter((choice) => choice.default === true).length;
}
function uiChoiceIsSheet(sheet) {
const ids = new Set(sheet.choices.map((choice) => choice.id));
const sized = sheet.choices.length >= CHOICE_MIN && sheet.choices.length <= CHOICE_MAX;
return sized && ids.size === sheet.choices.length && uiChoiceDefaults(sheet.choices) <= 1 && sheet.lines.length > 0;
}
function uiChoiceCheck(sheet) {
if (!uiChoiceIsSheet(sheet)) throw new RangeError('a choice sheet needs lines and ' + CHOICE_MIN + ' to ' + CHOICE_MAX + ' choices with their own ids and at most one default: ' + sheet.id);
}
function uiChoiceMoving(app,now) {
const walk = app.game.walk;
const stepping = Boolean(walk.tween) && now < walk.tween.until;
return stepping || walk.held.length > 0 || Boolean(walk.queued) || Boolean(walk.plan && walk.plan.dirs.length > 0);
}
function uiChoiceDockDown(app) {
const touch = app.game.touch;
const fire = app.game.fireDownAt;
return Boolean(touch && touch.gesture.pressed.size > 0) || (fire !== null && fire !== undefined);
}
function uiChoiceCalm(app) {
const holding = Boolean(app.game.chain && app.game.chain.holding);
return !app.story && !holding && !uiChoiceMoving(app,performance.now()) && !uiChoiceDockDown(app);
}
function uiChoiceLook(app,wait) {
if (app.game.gen !== wait.gen) return;
if (uiChoiceCalm(app)) {
wait.resolve();
return;
}
window.setTimeout(function () { uiChoiceLook(app,wait); },CHOICE_POLL_MS);
}
function uiChoiceWhenCalm(app) {
return new Promise(function (resolve) { uiChoiceLook(app,{ gen:app.game.gen,resolve }); });
}
function uiChoiceOpen(app,choice) {
return app.story && app.story.choice === choice;
}
function uiChoicePick(app,choice,id) {
if (!uiChoiceOpen(app,choice)) return;
uiStorySettle(app,id);
uiRenderApp(app);
}
function uiChoiceButton(app,choice,option) {
const button = uiEl('button',{
className:'story-choice',
text:option.label,
attrs:{ type:'button','data-focus-key':CHOICE_KEY_PREFIX + option.id,'aria-label':option.label },
});
button.addEventListener('click',function () { uiChoicePick(app,choice,option.id); });
return button;
}
function uiChoiceKey(app,event) {
const story = app.story;
const at = Number(event.key) - 1;
if (!story || !story.choice || event.repeat || !story.choice.choices[at]) return;
if (!story.flow.queue[0].lines[story.flow.line + 1] && uiStoryLineDone(story)) uiChoiceKeyPress(app,story,at);
}
function uiChoiceKeyPress(app,story,at) {
const verdict = sheetGuardPress(story.guard,performance.now());
story.guard = verdict.guard;
if (verdict.armed) uiChoicePick(app,story.choice,story.choice.choices[at].id);
}
function uiChoiceWireKeys(app) {
if (uiKeyedDocuments.has(document)) return;
uiKeyedDocuments.add(document);
document.addEventListener('keydown',function (event) { uiChoiceKey(app,event); });
}
function uiChoiceShow(app,sheet,resolve) {
const choice = { choices:sheet.choices,resolve };
let shown = null;
let asked = false;
choice.buttons = function (target) {
shown = { target,buttons:sheet.choices.map((option) => uiChoiceButton(target,choice,option)) };
return shown.buttons;
};
choice.ask = function () {
if (asked) return;
asked = true;
const button = shown.buttons[Math.max(sheet.choices.findIndex((option) => option.default),0)];
shown.target.lastFocusKey = button.getAttribute('data-focus-key');
button.focus();
};
uiStoryBegin(app,startFlow([{ id:sheet.id,lines:sheet.lines,toast:false }]),choice);
uiChoiceWireKeys(app);
uiRenderApp(app);
}
async function uiChoiceRun(app,sheet) {
uiChoiceCheck(sheet);
await uiChoiceWhenCalm(app);
return new Promise(function (resolve) { uiChoiceShow(app,sheet,resolve); });
}

export { CHOICE_POLL_MS,uiChoiceRun,uiChoiceWireKeys };

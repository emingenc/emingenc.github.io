import { TYPE_MS_PER_CHAR,isOneLine,lineAt,typedChars } from '../game/story/story.js';
import { uiEl, uiPrefersReducedMotion } from './dom.js';

const STORY_NEXT_KEY = 'story-next';
const STORY_SKIP_KEY = 'story-skip';
const STORY_CHOICES_CLASS = 'story-choices';
const STORY_WAITING_CLASS = ' is-waiting';
const STORY_SPEAKER_CLASS = { GHOSTWRITER:'story-who-ghost',SYSTEM:'story-who-system' };

let uiStoryTimer = 0;
function uiStoryStopTimer() {
window.clearInterval(uiStoryTimer);
uiStoryTimer = 0;
}
function uiStoryTyped(story) {
const line = lineAt(story.flow);
if (story.revealed || isOneLine(story.flow)) return line.text.length;
const elapsedMs = performance.now() - story.lineStartedAt;
return typedChars({ length:line.text.length,elapsedMs,reduced:Boolean(uiPrefersReducedMotion()) });
}
function uiStoryLineDone(story) {
return uiStoryTyped(story) >= lineAt(story.flow).text.length;
}
function uiStoryIsLastLine(story) {
return lineAt(story.flow).last && story.flow.beat === story.flow.queue.length - 1;
}
function uiChoosePrompt(count) {
return count > 1 ? 'CHOOSE (1-' + count + ')' :'CHOOSE';
}
function uiStoryPromptText(story) {
if (!uiStoryLineDone(story)) return '';
if (!uiStoryIsLastLine(story)) return 'TAP TO CONTINUE';
return story.choice ? uiChoosePrompt(story.choice.choices.length) :'TAP TO CLOSE';
}
function uiStoryTapLabel(story) {
if (!uiStoryIsLastLine(story)) return 'Continue';
return story.choice ? 'Choose below' :'Close';
}
function uiStoryCountText(flow) {
const beat = flow.queue[flow.beat];
return (flow.line + 1) + '/' + beat.lines.length;
}
function uiStoryTextNode(story) {
const line = lineAt(story.flow);
return uiEl('span',{ className:'story-text',attrs:{ 'aria-hidden':'true' },text:line.text.slice(0,uiStoryTyped(story)) });
}
function uiStoryTapButton(story,textNode) {
const line = lineAt(story.flow);
return uiEl('button',{
className:'story-tap',
attrs:{ type:'button','data-action':'story-next','data-focus-key':STORY_NEXT_KEY,'aria-label':uiStoryTapLabel(story) },
children:[
uiEl('span',{ className:'story-who ' + (STORY_SPEAKER_CLASS[line.who] || ''),attrs:{ 'aria-hidden':'true' },text:line.who }),
textNode,
uiEl('span',{ className:'story-prompt',attrs:{ 'aria-hidden':'true' },text:uiStoryPromptText(story) }),
],
});
}
function uiStoryTick(story,parts) {
if (!parts.textNode.isConnected) {
uiStoryStopTimer();
return;
}
const full = lineAt(story.flow).text;
parts.textNode.textContent = full.slice(0,uiStoryTyped(story));
if (!uiStoryLineDone(story)) return;
uiStoryStopTimer();
parts.button.lastChild.textContent = uiStoryPromptText(story);
if (!parts.choices) return;
parts.choices.node.className = STORY_CHOICES_CLASS;
story.choice.ask();
}
function uiStoryStartTyping(story,parts) {
uiStoryStopTimer();
if (uiStoryLineDone(story)) return;
uiStoryTimer = window.setInterval(function () { uiStoryTick(story,parts); },TYPE_MS_PER_CHAR);
}
function uiStorySkipButton() {
return uiEl('button',{
className:'story-skip',
text:'SKIP',
attrs:{ type:'button','data-action':STORY_SKIP_KEY,'data-focus-key':STORY_SKIP_KEY,'aria-label':'Skip the story' },
});
}
function uiStoryTrapFocus(overlay,controlsNow) {
overlay.addEventListener('keydown',function (event) {
if (event.key !== 'Tab') return;
event.preventDefault();
const controls = controlsNow();
const step = event.shiftKey ? controls.length - 1 :1;
const at = controls.indexOf(globalThis.document.activeElement);
controls[(at + step) % controls.length].focus();
});
overlay.addEventListener('mousedown',function (event) {
event.preventDefault();
});
}
function uiStoryPanel(story,parts) {
const count = uiEl('span',{ className:'story-count',attrs:{ 'aria-hidden':'true' },text:uiStoryCountText(story.flow) });
const foot = uiEl('div',{ className:'story-foot',children:[count,parts.skip].filter(Boolean) });
const children = [parts.button,parts.choices && parts.choices.node,foot].filter(Boolean);
return uiEl('div',{ className:'story-panel',children });
}
function uiStorySkipIfMore(story) {
return uiStoryIsLastLine(story) || story.choice ? null :uiStorySkipButton();
}
function uiStoryChoices(app,story) {
if (!story.choice || !uiStoryIsLastLine(story)) return null;
const buttons = story.choice.buttons(app);
const waiting = uiStoryLineDone(story) ? '' :STORY_WAITING_CLASS;
const node = uiEl('div',{ className:STORY_CHOICES_CLASS + waiting,attrs:{ role:'group','aria-label':'Choices' },children:buttons });
return { node,buttons };
}
function uiStoryTabStops(story,parts) {
const shown = parts.choices && uiStoryLineDone(story) ? parts.choices.buttons :[];
return [parts.button,parts.skip,...shown].filter(Boolean);
}
function uiStoryClaimFocus(app,controls) {
const keys = controls.map((control) => control.getAttribute('data-focus-key'));
if (!keys.includes(app.lastFocusKey)) app.lastFocusKey = STORY_NEXT_KEY;
}
function uiStoryIfOpen(app) {
const story = app.story;
if (!story) {
uiStoryStopTimer();
return null;
}
const textNode = uiStoryTextNode(story);
const button = uiStoryTapButton(story,textNode);
const parts = { textNode,button,choices:uiStoryChoices(app,story),skip:uiStorySkipIfMore(story) };
uiStoryStartTyping(story,parts);
const panel = uiStoryPanel(story,parts);
const entering = !story.entered;
story.entered = true;
if (parts.choices && uiStoryLineDone(story)) story.choice.ask();
const overlay = uiEl('div',{ className:'story-overlay' + (entering ? ' is-entering' :''),attrs:{ role:'dialog','aria-modal':'true','aria-label':'Transmission' },children:[panel] });
uiStoryTrapFocus(overlay,function () { return uiStoryTabStops(story,parts); });
uiStoryClaimFocus(app,uiStoryTabStops(story,parts));
return overlay;
}


export { uiStoryIfOpen,uiStoryLineDone,uiStoryStopTimer };

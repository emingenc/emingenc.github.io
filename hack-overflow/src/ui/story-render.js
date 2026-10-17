import { TYPE_MS_PER_CHAR,isOneLine,lineAt,typedChars } from '../game/story/story.js';
import { uiEl, uiPointerIsCoarse, uiPrefersReducedMotion } from './dom.js';

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
if (story.revealed || isOneLine(story.flow) || uiPointerIsCoarse()) return line.text.length;
const elapsedMs = performance.now() - story.lineStartedAt;
return typedChars({ length:line.text.length,elapsedMs,reduced:Boolean(uiPrefersReducedMotion()) });
}
function uiStoryLineDone(story) {
return uiStoryTyped(story) >= lineAt(story.flow).text.length;
}
function uiStoryIsLastLine(story) {
return lineAt(story.flow).last && story.flow.beat === story.flow.queue.length - 1;
}
function uiStoryAsks(story) {
return Boolean(story.choice) && story.choice.choices.length > 1;
}
function uiStoryPromptText(story) {
if (!uiStoryLineDone(story)) return '';
const touch = uiPointerIsCoarse();
const verb = touch ? 'TAP TO ' :'CLICK OR ENTER TO ';
if (!uiStoryIsLastLine(story)) return verb + 'CONTINUE';
if (!uiStoryAsks(story)) return verb + 'CLOSE';
return touch ? 'TAP ONE' :'CHOOSE (1-' + story.choice.choices.length + ')';
}
function uiStoryTapLabel(story) {
if (!uiStoryIsLastLine(story)) return 'Continue';
return uiStoryAsks(story) ? 'Choose below' :'Close';
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
text:'SKIP \u25B8\u25B8',
attrs:{ type:'button','data-action':STORY_SKIP_KEY,'data-focus-key':STORY_SKIP_KEY,'aria-label':'Skip ahead' },
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
return uiStoryIsLastLine(story) ? null :uiStorySkipButton();
}
function uiStoryChoices(app,story) {
if (!uiStoryAsks(story) || !uiStoryIsLastLine(story)) return null;
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


export { uiStoryAsks,uiStoryIfOpen,uiStoryIsLastLine,uiStoryLineDone,uiStoryStopTimer };

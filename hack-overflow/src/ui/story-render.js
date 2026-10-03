import { TYPE_MS_PER_CHAR,lineAt,typedChars } from '../game/story/story.js';
import { uiEl, uiPrefersReducedMotion } from './dom.js';

const STORY_NEXT_KEY = 'story-next';
const STORY_SKIP_KEY = 'story-skip';
const STORY_SPEAKER_CLASS = { GHOSTWRITER:'story-who-ghost',SYSTEM:'story-who-system' };

let uiStoryTimer = 0;
function uiStoryStopTimer() {
window.clearInterval(uiStoryTimer);
uiStoryTimer = 0;
}
function uiStoryTyped(story) {
const line = lineAt(story.flow);
if (story.revealed) return line.text.length;
const elapsedMs = performance.now() - story.lineStartedAt;
return typedChars({ length:line.text.length,elapsedMs,reduced:Boolean(uiPrefersReducedMotion()) });
}
function uiStoryLineDone(story) {
return uiStoryTyped(story) >= lineAt(story.flow).text.length;
}
function uiStoryIsLastLine(story) {
return lineAt(story.flow).last && story.flow.beat === story.flow.queue.length - 1;
}
function uiStoryPromptText(story) {
if (!uiStoryLineDone(story)) return '';
return uiStoryIsLastLine(story) ? 'TAP TO CLOSE' :'TAP TO CONTINUE';
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
const last = uiStoryIsLastLine(story);
return uiEl('button',{
className:'story-tap',
attrs:{ type:'button','data-action':'story-next','data-focus-key':STORY_NEXT_KEY,'aria-label':last ? 'Close' :'Continue' },
children:[
uiEl('span',{ className:'story-who ' + (STORY_SPEAKER_CLASS[line.who] || ''),attrs:{ 'aria-hidden':'true' },text:line.who }),
textNode,
uiEl('span',{ className:'story-prompt',attrs:{ 'aria-hidden':'true' },text:uiStoryPromptText(story) }),
],
});
}
function uiStoryTick(story,textNode,button) {
if (!textNode.isConnected) {
uiStoryStopTimer();
return;
}
const full = lineAt(story.flow).text;
textNode.textContent = full.slice(0,uiStoryTyped(story));
if (uiStoryLineDone(story)) {
uiStoryStopTimer();
button.lastChild.textContent = uiStoryPromptText(story);
}
}
function uiStoryStartTyping(story,textNode,button) {
uiStoryStopTimer();
if (uiStoryLineDone(story)) return;
uiStoryTimer = window.setInterval(function () { uiStoryTick(story,textNode,button); },TYPE_MS_PER_CHAR);
}
function uiStorySkipButton() {
return uiEl('button',{
className:'story-skip',
text:'SKIP',
attrs:{ type:'button','data-action':STORY_SKIP_KEY,'data-focus-key':STORY_SKIP_KEY,'aria-label':'Skip the story' },
});
}
function uiStoryTrapFocus(overlay,tapButton,skipButton) {
overlay.addEventListener('keydown',function (event) {
if (event.key !== 'Tab') return;
event.preventDefault();
const onTap = globalThis.document.activeElement === tapButton;
(onTap ? skipButton :tapButton).focus();
});
overlay.addEventListener('mousedown',function (event) {
event.preventDefault();
});
}
function uiStoryPanel(story,button,skip) {
const count = uiEl('span',{ className:'story-count',attrs:{ 'aria-hidden':'true' },text:uiStoryCountText(story.flow) });
return uiEl('div',{ className:'story-panel',children:[button,uiEl('div',{ className:'story-foot',children:[count,skip] })] });
}
function uiStoryIfOpen(app) {
const story = app.story;
if (!story) {
uiStoryStopTimer();
return null;
}
const textNode = uiStoryTextNode(story);
const button = uiStoryTapButton(story,textNode);
uiStoryStartTyping(story,textNode,button);
const skip = uiStorySkipButton();
const panel = uiStoryPanel(story,button,skip);
const entering = !story.entered;
story.entered = true;
const overlay = uiEl('div',{ className:'story-overlay' + (entering ? ' is-entering' :''),attrs:{ role:'dialog','aria-modal':'true','aria-label':'Transmission' },children:[panel] });
uiStoryTrapFocus(overlay,button,skip);
return overlay;
}


export { uiStoryIfOpen,uiStoryLineDone,uiStoryStopTimer };

import { mistakeQuip,successQuip } from '../game/story/story.js';
import { hashStr } from '../logic/tray.js';
import { uiEl } from './dom.js';

function uiGhostQuip(text) {
return uiEl('p',{
className:'ghost-quip',
children:[uiEl('span',{ className:'ghost-quip-who',text:'GHOSTWRITER' }),' ' + text],
});
}
function uiTracedQuip(traced) {
return uiGhostQuip(mistakeQuip(traced.visibleFails));
}
function uiBreachQuip(outcome) {
return uiGhostQuip(successQuip(outcome.stars,hashStr(String(outcome.key))));
}

export { uiGhostQuip,uiTracedQuip,uiBreachQuip };

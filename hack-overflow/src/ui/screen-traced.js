import { uiEl } from './dom.js';
import { uiJackIn } from './breach-flow.js';
import { uiEnterGrid } from './screen-grid.js';
import { SHOW_LINE_THRESHOLD } from '../logic/run-judge.js';

const TRACED_HEADLINE = 'TRACE COMPLETE — connection dropped';

function uiOpenTraced(app,traced) {
app.game.traced = traced;
app.screen = 'traced';
app.lastFocusKey = 'traced-retry';
}
function uiCarriedLines(traced) {
return traced.failed + ' distinct failed line' + (traced.failed === 1 ? '' :'s') + ' carried over';
}
function uiStarsGlyph(count) {
return count + '★';
}
function uiStarsWord(count) {
return count + ' star' + (count === 1 ? '' :'s');
}
function uiShowLineNote(traced,starsFor) {
if (traced.revealed) return ', SHOW LINE used';
return traced.visibleFails >= SHOW_LINE_THRESHOLD ? ', SHOW LINE unlocked (' + starsFor(0) + ' if used)' :'';
}
function uiCarriedTextWith(traced,starsFor) {
return uiCarriedLines(traced) + uiShowLineNote(traced,starsFor) + '. Breach it now for up to ' + starsFor(traced.maxStars) + '.';
}
function uiCarriedText(traced) {
return uiCarriedTextWith(traced,uiStarsGlyph);
}
function uiTracedButton(action,label,kind) {
return uiEl('button',{ className:'btn ' + kind,text:label,attrs:{ type:'button','data-action':action,'data-focus-key':action } });
}
function uiRenderTraced(app) {
const traced = app.game.traced;
return uiEl('section',{
className:'screen screen-card traced-screen',
attrs:{ 'data-screen':'traced' },
children:[
uiEl('h1',{ className:'traced-title',text:'TRACED' }),
uiEl('p',{ className:'traced-lead',text:TRACED_HEADLINE + ' at ' + traced.lockName + '.' }),
uiEl('p',{ className:'traced-carried',text:uiCarriedText(traced) }),
uiEl('p',{ className:'traced-note',text:'RETRY: fresh TRACE, reshuffled chips.' }),
uiEl('div',{
className:'traced-actions',
children:[uiTracedButton('traced-retry','RETRY','btn-primary'),uiTracedButton('traced-reconnect','BACK TO GRID','btn-ghost')],
}),
],
});
}
function uiApplyTracedAction(app,actionId) {
if (actionId === 'traced-retry') uiJackIn(app,app.game.traced.key);
else if (actionId === 'traced-reconnect') uiEnterGrid(app);
else return false;
return true;
}
function uiTracedAnnounce(app) {
const traced = app.game.traced;
return 'Dropped at ' + traced.lockName + '. ' + uiCarriedTextWith(traced,uiStarsWord);
}
function uiTracedScreen() {
return {
id:'traced',
render:uiRenderTraced,
focusKey:function () { return 'traced-retry'; },
announce:uiTracedAnnounce,
applyAction:uiApplyTracedAction,
};
}

export { uiTracedScreen, uiOpenTraced };

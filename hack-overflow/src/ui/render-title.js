import { uiEl } from './dom.js';
import { uiIsResumable } from './storage.js';

function uiTitleButton(action,label,kind) {
return uiEl('button',{
className:'btn ' + kind,
text:label,
attrs:{ type:'button','data-action':action,'data-focus-key':action },
});
}
function uiTitleStartLabel(app) {
return uiIsResumable(app.savedRun) ? 'CONTINUE' :'START';
}
function uiTitleHeading() {
return uiEl('div',{
className:'title-wordmark',
children:[
uiEl('h1',{ className:'wordmark',text:'HACK://OVERFLOW' }),
uiEl('h2',{ className:'subtitle',text:'ONE-LINER' }),
uiEl('p',{ className:'tagline',text:'One missing line. A real Python judge. Write it.' }),
],
});
}
function uiTitleActions(app) {
return uiEl('div',{
className:'title-actions',
children:[
uiTitleButton('title-start',uiTitleStartLabel(app),'btn-primary'),
uiTitleButton('title-route','ROUTE','btn-ghost'),
uiTitleButton('toggle-sound',app.soundOn ? 'SOUND: ON' :'SOUND: OFF','btn-ghost'),
],
});
}
function uiTitleFooter() {
return uiEl('div',{
className:'title-footer',
children:[uiEl('button',{
className:'btn-link',
text:'reset progress',
attrs:{ type:'button','data-action':'reset-progress','data-focus-key':'reset-progress' },
})],
});
}
function uiRenderTitle(app) {
const canvas = uiEl('canvas',{ className:'rain-canvas',attrs:{ 'aria-hidden':'true' } });
return uiEl('section',{
className:'screen title-screen',
attrs:{ 'data-screen':'title' },
children:[canvas,uiTitleHeading(),uiTitleActions(app),uiTitleFooter()],
});
}

export { uiRenderTitle };

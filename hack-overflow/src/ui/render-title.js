import { uiSetVar } from './css-var.js';
import { uiEl, uiQs, UI_ROOT_ID } from './dom.js';
import { uiHasGame } from './game-storage.js';
import { UI_SECTOR_ACCENTS } from './sector-accents.js';
import { uiSoundLamp } from './sound-lamp.js';

function uiTitleButton(action,label,kind) {
return uiEl('button',{
className:'btn ' + kind,
text:label,
attrs:{ type:'button','data-action':action,'data-focus-key':action },
});
}
function uiTitleStartLabel() {
return uiHasGame() ? 'CONTINUE' :'START';
}
function uiTitleSectorTiles() {
const tiles = Object.values(UI_SECTOR_ACCENTS).map(function (accent,index) {
const tile = uiEl('span',{ className:'title-sector' });
uiSetVar(tile,'--sector','var(--' + accent + ')');
uiSetVar(tile,'--n',index);
return tile;
});
return uiEl('div',{ className:'title-sectors',attrs:{ 'aria-hidden':'true' },children:tiles });
}
function uiTitleHeading() {
return uiEl('div',{
className:'title-wordmark',
children:[
uiEl('p',{ className:'title-kicker',text:'HACK://OVERFLOW' }),
uiEl('h1',{ className:'wordmark',text:'THE GRID' }),
uiTitleSectorTiles(),
uiEl('p',{ className:'tagline',text:'One missing line. A real Python judge. Breach the Grid.' }),
],
});
}
function uiTitleActions(app) {
return uiEl('div',{
className:'title-actions',
children:[
uiTitleButton('title-start',uiTitleStartLabel(),'btn-primary'),
uiSoundLamp(uiTitleButton('toggle-sound',app.soundOn ? 'SOUND: ON' :'SOUND: OFF','btn-ghost'),Boolean(app.soundOn)),
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
function uiTitleIsOnScreen() {
return Boolean(uiQs(UI_ROOT_ID)?.querySelector('.title-screen'));
}
function uiRenderTitle(app) {
const canvas = uiEl('canvas',{ className:'rain-canvas',attrs:{ 'aria-hidden':'true' } });
return uiEl('section',{
className:'screen title-screen' + (uiTitleIsOnScreen() ? '' :' is-booting'),
attrs:{ 'data-screen':'title' },
children:[canvas,uiTitleHeading(),uiTitleActions(app),uiTitleFooter()],
});
}

export { uiRenderTitle };

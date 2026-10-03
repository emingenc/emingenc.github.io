import { uiEl } from './dom.js';
import { uiHasGame } from './game-storage.js';
import { UI_SECTOR_ACCENTS } from './grid-draw-tiles.js';

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
const tiles = Object.values(UI_SECTOR_ACCENTS).map(function (accent) {
const tile = uiEl('span',{ className:'title-sector' });
tile.style.setProperty('--sector','var(--' + accent + ')');
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

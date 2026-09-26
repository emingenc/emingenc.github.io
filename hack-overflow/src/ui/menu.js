import { uiEl } from './dom.js';

function uiMenuButton(action,label) {
return uiEl('button',{
className:'btn btn-ghost menu-item',
text:label,
attrs:{ type:'button','data-action':action,'data-focus-key':action },
});
}
function uiMenuButtons(app) {
return [
uiMenuButton('menu-close','RESUME'),
uiMenuButton('route','ROUTE'),
uiMenuButton('toggle-sound',app.soundOn ? 'SOUND: ON' :'SOUND: OFF'),
uiMenuButton('reset-progress','RESET PROGRESS'),
];
}
function uiMenuPanel(app) {
const panel = uiEl('div',{ className:'menu-panel',children:uiMenuButtons(app) });
return uiEl('div',{
className:'menu-overlay',
attrs:{ role:'dialog','aria-modal':'true','aria-label':'Menu' },
children:[panel],
});
}
function uiMenuIfOpen(app) {
return app.menuOpen ? uiMenuPanel(app) :null;
}

export { uiMenuIfOpen };

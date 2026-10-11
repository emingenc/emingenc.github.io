import { uiBridgeInReach,uiBridgePress } from './grid-power-bridge.js';
import { uiLinkStyle } from './lazy-style.js';

const STYLE_HREF = 'styles/lazy/grid-power-pincer.css';
const FIRE_LABEL = { text:'FIRE',aria:'Fire at the sum' };

function uiAimLabel(app) {
return uiBridgeInReach(app) ? FIRE_LABEL :'';
}
function uiFire(app) {
if (!uiBridgeInReach(app)) return false;
uiBridgePress(app,'fire');
return true;
}
function uiModePincer() {
uiLinkStyle(STYLE_HREF);
return { id:'pincer',name:'PINCER',aim:false,chips:() => [],aimLabel:uiAimLabel,fire:uiFire,tap:() => false };
}

export { uiModePincer };

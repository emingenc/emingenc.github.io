import { uiLinkStyle } from './lazy-style.js';

const STYLE_HREF = 'styles/lazy/grid-power-net.css';

function uiModeNet() {
uiLinkStyle(STYLE_HREF);
return { id:'net',name:'NET',aim:false,chips:() => [] };
}

export { uiModeNet };

import { uiSetArt } from './art-hook.js';
import { uiCreateAtlas } from './art-atlas.js';
import { uiLinkStyles } from './lazy-style.js';

const UI_ATLASES = ['grid','actors'];
const UI_SKINS = ['base','grid','breach','code','title'];
const UI_PALETTE_NAMES = ['bg','panel','border','primary','bright','cyan','magenta','amber','red','violet','text','dim'];

function uiAssetUrl(path) {
return new URL('../../' + path,import.meta.url).href;
}
function uiReadPalette() {
const style = getComputedStyle(document.documentElement);
return Object.fromEntries(UI_PALETTE_NAMES.map(function (name) { return [name,style.getPropertyValue('--' + name).trim()]; }));
}
async function uiFetchOk(url) {
const response = await fetch(url);
if (!response.ok) throw new Error('missing ' + url);
return response;
}
async function uiFetchAtlas(name) {
const json = await (await uiFetchOk(uiAssetUrl('assets/art/' + name + '.json'))).json();
const image = await createImageBitmap(await (await uiFetchOk(uiAssetUrl('assets/art/' + (json.image || name + '.png')))).blob());
return { json,image };
}
async function uiLoadArt() {
try {
const atlas = uiCreateAtlas(uiReadPalette);
const skins = uiLinkStyles(UI_SKINS.map(function (name) { return uiAssetUrl('styles/art/skin-' + name + '.css'); }));
await Promise.all(UI_ATLASES.map(async function (name) {
try {
const loaded = await uiFetchAtlas(name);
atlas.add(loaded.json,loaded.image);
uiSetArt(atlas);
} catch (error) {
}
}));
await skins;
} catch (error) {
}
}

export { uiLoadArt };

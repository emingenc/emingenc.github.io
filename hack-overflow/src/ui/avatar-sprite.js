
import { uiDrawArt } from './art-hook.js';

const UI_AVATAR_PX = 16;
const UI_CLEAR = '.';
const UI_AVATAR_INKS = {
o:{ color:'bg' },
x:{ color:'bg',alpha:0.45 },
S:{ color:'cyan',toward:'bg',amount:0.78 },
C:{ color:'cyan',toward:'bg',amount:0.58 },
L:{ color:'cyan',toward:'bg',amount:0.3 },
W:{ color:'cyan',toward:'text',amount:0.4 },
t:{ color:'trim' },
v:{ color:'bright' },
};

function uiAvatarSheet(text) {
const lines = text.split('\n').slice(1,-1);
return [0,1,2].map(function (index) { return lines.map(function (line) { return line.split(' ')[index]; }); });
}

const UI_AVATAR_DOWN = uiAvatarSheet(`
................ ................ ................
......oooo...... ......oooo...... ......oooo......
....ooWWLLoo.... ....ooWWLLoo.... ....ooWWLLoo....
...oWLLLLLLCo... ...oWLLLLLLCo... ...oWLLLLLLCo...
..oWLLttttCCSo.. ..oWLLttttCCSo.. ..oWLLttttCCSo..
..oLLtooootCSo.. ..oLLtooootCSo.. ..oLLtooootCSo..
..oLtovoovotSo.. ..oLtovoovotSo.. ..oLtovoovotSo..
..oCtovoovotSo.. ..oCtovoovotSo.. ..oCtovoovotSo..
...oCooooooSo... ...oCooooooSo... ...oCooooooSo...
..oLoCCttCCoSo.. ..oLoCCttCCoSo.. ..oLoCCttCCoSo..
..oLoCCttCCoSo.. ..oLoCCttCCoSo.. ..oLoCCttCCoSo..
..oWoCCttCSoCo.. ..oWoCCttCSoCo.. ..oWoCCttCSoCo..
...oCCCttSSSo... ...oCCCttSSSo... ...oCCCttSSSo...
....oSSooSSo.... ....oSSooSSo.... ....oSSooSSo....
.....oo..oo..... ....oSSo.oo..... .....oo.oSSo....
................ .....oo......... .........oo.....
`);
const UI_AVATAR_UP = uiAvatarSheet(`
................ ................ ................
......oooo...... ......oooo...... ......oooo......
....ooWWLLoo.... ....ooWWLLoo.... ....ooWWLLoo....
...oWLLLLLLCo... ...oWLLLLLLCo... ...oWLLLLLLCo...
..oWLLLLLLLCSo.. ..oWLLLLLLLCSo.. ..oWLLLLLLLCSo..
..oLLLLLLLCCSo.. ..oLLLLLLLCCSo.. ..oLLLLLLLCCSo..
..oLLLLLLCCCSo.. ..oLLLLLLCCCSo.. ..oLLLLLLCCCSo..
..oCLLLLCCCCSo.. ..oCLLLLCCCCSo.. ..oCLLLLCCCCSo..
...oCttttttSo... ...oCttttttSo... ...oCttttttSo...
..oLoCCCCCSoSo.. ..oLoCCCCCSoSo.. ..oLoCCCCCSoSo..
..oLoCCCCCSoSo.. ..oLoCCCCCSoSo.. ..oLoCCCCCSoSo..
..oWoCCCCCSoCo.. ..oWoCCCCCSoCo.. ..oWoCCCCCSoCo..
...oCCCCCSSSo... ...oCCCCCSSSo... ...oCCCCCSSSo...
....oSSooSSo.... ....oSSooSSo.... ....oSSooSSo....
.....oo..oo..... ....oSSo.oo..... .....oo.oSSo....
................ .....oo......... .........oo.....
`);
const UI_AVATAR_LEFT = uiAvatarSheet(`
................ ................ ................
......oooo...... ......oooo...... ......oooo......
....ooWWLLoo.... ....ooWWLLoo.... ....ooWWLLoo....
...oWLLLLLLCo... ...oWLLLLLLCo... ...oWLLLLLLCo...
..otttLLLLLCSo.. ..otttLLLLLCSo.. ..otttLLLLLCSo..
..oooCLLLLLCSo.. ..oooCLLLLLCSo.. ..oooCLLLLLCSo..
..ovoCLLLLCCSo.. ..ovoCLLLLCCSo.. ..ovoCLLLLCCSo..
..ovoCLLLLCCSo.. ..ovoCLLLLCCSo.. ..ovoCLLLLCCSo..
...ooCCCCCCSo... ...ooCCCCCCSo... ...ooCCCCCCSo...
...oLLLCCCCSo... ...oLLLCCCCSo... ...oLLLCCCCSo...
...oLLLCCCCSo... ...oLLLCCCCSo... ...oLLLCCCCSo...
...oLWWCCCSSo... ...oLWWCCCSSo... ...oLWWCCCSSo...
...oCooCCCSSo... ...oCooCCCSSo... ...oCooCCCSSo...
...oSSSoooooo... ..oSSoooooSSo... ..oSSoooooSSo...
....ooo......... .oSSo......oo... ...oo....oSSo...
................ ..oo............ ..........oo....
`);
const UI_AVATAR_SHADOW = [
...Array(UI_AVATAR_PX - 2).fill(''),
'...xxxxxxxxxx...',
'....xxxxxxxx....',
];

function uiMirrorRows(rows) {
return rows.map(function (row) { return row.split('').reverse().join(''); });
}
function uiRowRuns(text,row) {
const runs = [];
let start = 0;
for (let col = 1; col <= text.length; col += 1) {
if (text[col] === text[start]) continue;
if (text[start] !== UI_CLEAR) runs.push({ ink:text[start],col:start,row,width:col - start });
start = col;
}
return runs;
}
function uiInkLayers(rows) {
const layers = {};
rows.forEach(function (text,row) {
uiRowRuns(text,row).forEach(function (run) { (layers[run.ink] = layers[run.ink] || []).push(run); });
});
return Object.entries(layers).map(function ([ink,runs]) { return { ink,runs }; });
}
const UI_AVATAR_ART = {
down:UI_AVATAR_DOWN,up:UI_AVATAR_UP,left:UI_AVATAR_LEFT,right:UI_AVATAR_LEFT.map(uiMirrorRows),
};
const UI_AVATAR_LAYERS = Object.fromEntries(Object.entries(UI_AVATAR_ART).map(function ([facing,frames]) {
return [facing,frames.map(uiInkLayers)];
}));
const UI_SHADOW_LAYERS = uiInkLayers(UI_AVATAR_SHADOW);

const UI_HEX_COLOR = /^#[0-9a-f]{6}$/i;
const UI_HEX_RADIX = 16;
function uiChannels(color) {
return UI_HEX_COLOR.test(color) ? color.slice(1).match(/../g).map(function (pair) { return Number.parseInt(pair,UI_HEX_RADIX); }) :null;
}
function uiMixed(base,toward,amount) {
return base.map(function (channel,index) { return Math.round(channel + (toward[index] - channel) * amount); });
}
function uiInkColor(spec,colors) {
const base = uiChannels(colors[spec.color]);
if (!base) return colors[spec.color];
const toward = spec.toward ? uiChannels(colors[spec.toward]) :null;
const rgb = toward ? uiMixed(base,toward,spec.amount) :base;
return spec.alpha ? `rgba(${rgb.join(',')},${spec.alpha})` :`rgb(${rgb.join(',')})`;
}
const UI_INK_CACHE = new WeakMap();
function uiResolveInks(palette,rootRank) {
const colors = { ...palette,trim:rootRank ? palette.amber :palette.cyan };
return Object.fromEntries(Object.entries(UI_AVATAR_INKS).map(function ([glyph,spec]) { return [glyph,uiInkColor(spec,colors)]; }));
}
function uiAvatarInks(palette,rootRank) {
const cached = UI_INK_CACHE.get(palette) || {};
const rank = rootRank ? 'root' :'user';
if (!cached[rank]) cached[rank] = uiResolveInks(palette,rootRank);
UI_INK_CACHE.set(palette,cached);
return cached[rank];
}
function uiPaintLayers(ctx,layers,spot) {
layers.forEach(function (layer) {
ctx.fillStyle = spot.inks[layer.ink];
layer.runs.forEach(function (run) { ctx.fillRect(spot.x + run.col * spot.unit,spot.y + run.row * spot.unit,run.width * spot.unit,spot.unit); });
});
}
const UI_BODY = { feet:0.92,shadow:0.9,height:0.8 };
const UI_SHADOW_LIFT = { shrink:0.08,fade:0.1,floor:0.5 };
const EYE_ROW_DOWN = 0.285;
const EYE_ROW_SIDE = 0.32;
const EYE_COL = { downLeft:0.439,downRight:0.544,left:0.344,right:0.656 };
const UI_EYES = { down:[[EYE_COL.downLeft,EYE_ROW_DOWN],[EYE_COL.downRight,EYE_ROW_DOWN]],left:[[EYE_COL.left,EYE_ROW_SIDE]],right:[[EYE_COL.right,EYE_ROW_SIDE]] };
const UI_LID = { width:0.06,height:0.065 };
const UI_NO_PUSH = { x:0,y:0 };
const UI_NO_SCALE = { x:1,y:1 };

function uiPivotTransform(ctx,pivot,shape) {
ctx.translate(pivot.x,pivot.y);
ctx.transform(shape.scale.x,0,shape.shear,shape.scale.y,0,0);
ctx.translate(-pivot.x,-pivot.y);
}
function uiPaintShadow(ctx,box,lift) {
const shrink = Math.max(UI_SHADOW_LIFT.floor,1 - UI_SHADOW_LIFT.shrink * lift);
if (shrink === 1) return uiDrawArt(ctx,'hero-shadow',box);
const alpha = ctx.globalAlpha;
const centre = { x:box.left + box.size / 2,y:box.top + box.size * UI_BODY.shadow };
ctx.save();
ctx.globalAlpha = alpha * (1 - UI_SHADOW_LIFT.fade * lift);
uiPivotTransform(ctx,centre,{ scale:{ x:shrink,y:shrink },shear:0 });
const drawn = uiDrawArt(ctx,'hero-shadow',box);
ctx.restore();
return drawn;
}
function uiPaintLids(ctx,box,look) {
ctx.fillStyle = look.palette.bg;
(UI_EYES[look.facing] || []).forEach(function ([across,down]) {
ctx.fillRect(box.left + box.size * (across - UI_LID.width / 2),box.top + box.size * (down - UI_LID.height / 2),box.size * UI_LID.width,box.size * UI_LID.height);
});
}
function uiFigureShear(look,box) {
return look.lean ? -look.lean * box.unit / (UI_BODY.height * box.size) :0;
}
function uiIsShaped(shear,scale) {
return shear !== 0 || scale.x !== 1 || scale.y !== 1;
}
function uiPaintFigure(ctx,box,look) {
const name = `hero${look.rootRank ? '-root' :''}-${look.facing}-${look.frame}`;
const shear = uiFigureShear(look,box);
const scale = look.scale || UI_NO_SCALE;
const shaped = uiIsShaped(shear,scale);
if (!shaped && !look.blink) return uiDrawArt(ctx,name,box);
ctx.save();
if (shaped) uiPivotTransform(ctx,{ x:box.left + box.size / 2,y:box.ground },{ scale,shear });
const drawn = uiDrawArt(ctx,name,box);
if (drawn && look.blink) uiPaintLids(ctx,box,look);
ctx.restore();
return drawn;
}
function uiLiftPx(look,place,dpr) {
return Math.round((look.bob || 0) * place.unit * dpr) / dpr;
}
function uiPaintAvatar(ctx,place,look) {
const dpr = ctx.getTransform?.().a || 1;
const lift = uiLiftPx(look,place,dpr);
const push = look.push || UI_NO_PUSH;
const size = place.unit * UI_AVATAR_PX;
const box = { left:place.x,top:place.y,size,dpr };
if (uiPaintShadow(ctx,box,look.bob || 0)) {
const figure = { ...box,left:place.x + push.x,top:place.y + push.y - lift,unit:place.unit,ground:place.y + push.y + size * UI_BODY.feet };
if (uiPaintFigure(ctx,figure,look)) return;
}
const inks = uiAvatarInks(look.palette,look.rootRank);
uiPaintLayers(ctx,UI_SHADOW_LAYERS,{ ...place,inks });
uiPaintLayers(ctx,UI_AVATAR_LAYERS[look.facing][look.frame],{ ...place,x:place.x + push.x,y:place.y + push.y - lift,inks });
}

export { UI_AVATAR_PX, uiPaintAvatar };

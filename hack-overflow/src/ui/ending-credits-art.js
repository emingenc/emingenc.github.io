import { HERO_ID } from '../game/credits.js';
import { uiPaintAvatar } from './avatar-sprite.js';
import { UI_CAST_ART } from './grid-cast-sprites.js';
import { BIT_MARKS,uiBitWears,uiPaintRows } from './grid-chain-bit.js';

const PALETTE_NAMES = ['bg','panel','border','dim','text','primary','bright','cyan','magenta','amber','red','violet'];
const FIGURE = ['..hhhh..','.hhhhhh.','.hkhhkh.','.hhhhhh.','..bbbb..','.bbaabb.','bbbaabbb','.bbbbbb.','.ll..ll.','.ll..ll.'];
const TWIN = ['.hhhh.','hhhhhh','hkhhkh','.hhhh.','.bbbb.','bbaabb','bbaabb','.bbbb.','.l..l.','.l..l.'];
const BIT_BODY = { rows:['.bbbbb.','bbbbbbb','bkbbbkb','bbbbbbb','.b...b.'],ink:{ b:'cyan',k:'bg' } };
const CAST_ART = {
tally:{ rows:FIGURE,ink:{ h:'text',k:'bg',b:'cyan',a:'amber',l:'dim' } },
twins:{ rows:TWIN.map((row) => row + '..' + row),ink:{ h:'text',k:'bg',b:'cyan',a:'primary',l:'dim' } },
brace:{ rows:['.aaaaaa.','..hhhh..','.hkhhkh.','..hhhh..','..bbbb.c','.bbbbbbc','.bbbbbbc','.bbbbbbc','.ll..llc','.ll..ll.'],ink:{ a:'amber',h:'text',k:'bg',b:'amber',c:'dim',l:'dim' } },
oracle:{ rows:['..vvvv..','.vvvvvv.','.vwwwwv.','.vvvvvv.','..vvvv..','.vvvvvv.','vvvvvvvv','vvvvvvvv','vvvvvvvv','.dddddd.'],ink:{ v:'violet',w:'bright',d:'dim' } },
sill:{ rows:['..hhhh..','.hhhhhh.','.hkhhkh.','..hhhh..','cccccccc','cppcpppc','cppcpppc','cccccccc','.cc..cc.','.cc..cc.'],ink:{ h:'text',k:'bg',c:'cyan',p:'panel' } },
brute:{ rows:['...rrrr...','..rrrrrr..','..rkrrkr..','..rrrrrr..','.rrrrrrrr.','rrrraarrrr','rrrraarrrr','rrrrrrrrrr','.rr....rr.','.rr....rr.'],ink:{ r:'red',k:'bg',a:'amber' } },
null:{ rows:['..dddd..','.d....d.','.d.dd.d.','.d....d.','.d....d.','.d....d.','.d....d.','.d....d.','.d.dd.d.','..d..d..'],ink:{ d:'dim' } },
patch:UI_CAST_ART.patch,
};
const ART_ROWS = 10;
const HERO_ROWS = 16;
const HOP_MS = 140;
const BOB_MS = 420;
const BIT_FLOAT = 3;
const HERO_SCALE = 0.67;
const MEMBERS = Object.freeze(['bit','tally','twins','brace','oracle','sill','brute','null','patch']);

function uiReadPalette(canvas) {
const style = window.getComputedStyle(canvas);
return Object.fromEntries(PALETTE_NAMES.map((name) => [name,style.getPropertyValue('--' + name).trim()]));
}
function uiSizeCanvas(canvas) {
if (typeof canvas.getContext !== 'function') return null;
const ratio = window.devicePixelRatio || 1;
const { clientWidth:width,clientHeight:height } = canvas;
if (!width || !height) return null;
canvas.width = Math.round(width * ratio);
canvas.height = Math.round(height * ratio);
const ctx = canvas.getContext('2d');
ctx.setTransform(ratio,0,0,ratio,0,0);
return { ctx,width,height };
}
function widthOf(art) {
return art.rows[0].length;
}
function hop(now,walking) {
return walking && Math.floor(now / HOP_MS) % 2 === 1 ? 1 :0;
}
function paintBit(ctx,spot,wears) {
uiPaintRows(ctx,BIT_BODY,spot);
wears.forEach((id) => uiPaintRows(ctx,BIT_MARKS[id],spot));
}
function paintHero(ctx,spot,figure) {
const unit = Math.max(1,Math.floor(spot.pixel * HERO_SCALE));
const stride = figure.walking ? 1 + Math.floor(spot.now / HOP_MS) % 2 :0;
const left = spot.center - unit * HERO_ROWS / 2;
const top = spot.floor - unit * HERO_ROWS;
uiPaintAvatar(ctx,{ x:left,y:top,unit },{ facing:'right',frame:stride,bob:0,palette:spot.palette,rootRank:true });
const bitPixel = Math.max(2,Math.round(spot.pixel * HERO_SCALE));
const bitSpot = { palette:spot.palette,pixel:bitPixel,left:left + unit * HERO_ROWS,top:top - bitPixel + Math.sin(spot.now / BOB_MS) * bitPixel };
paintBit(ctx,bitSpot,spot.wears);
}
function paintBitMember(ctx,spot) {
const pixel = spot.pixel;
const floating = spot.floor - (ART_ROWS * pixel) / 2 - BIT_FLOAT * pixel + Math.sin(spot.now / BOB_MS) * pixel;
paintBit(ctx,{ palette:spot.palette,pixel,left:spot.center - (widthOf(BIT_BODY) * pixel) / 2,top:floating },spot.wears);
}
function paintCast(ctx,spot,figure) {
const art = CAST_ART[figure.id];
const left = spot.center - (widthOf(art) * spot.pixel) / 2;
uiPaintRows(ctx,art,{ palette:spot.palette,pixel:spot.pixel,left,top:spot.floor - art.rows.length * spot.pixel - hop(spot.now,figure.walking) * spot.pixel / 2 });
}
function uiPaintMember(ctx,spot,figure) {
if (figure.id === HERO_ID) paintHero(ctx,spot,figure);
else if (figure.id === 'bit') paintBitMember(ctx,spot);
else paintCast(ctx,spot,figure);
}
function uiDrawnIds() {
return [HERO_ID,...MEMBERS];
}

export { BIT_BODY,uiBitWears,uiDrawnIds,uiPaintMember,uiReadPalette,uiSizeCanvas };

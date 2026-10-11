const UI_CAST_ART = {
patch:{ rows:['..kkkk..','.kkkkkk.','.kssvsk.','.ksssssk','..ssss..','.jjjjjj.','jjjjjjjj','.jjjjjj.','.jj..jj.','.dd..dd.'],
ink:{ k:'dim',s:'text',v:'cyan',j:'amber',d:'dim' } },
crate:{ rows:['aaaaaaaa','arddddra','adrddrda','addrrdda','addrrdda','adrddrda','arddddra','aaaaaaaa'],ink:{ a:'amber',d:'dim',r:'red' } },
screen:{ rows:['........','........','.cccccc.','.cbbbbc.','.cbbbbc.','.cccccc.','pppppppp','p......p'],
ink:{ c:'dim',b:'cyan',p:'primary' } },
keys:{ rows:['........','........','........','........','........','..tttt..','pppppppp','p......p'],ink:{ t:'text',p:'primary' } },
sentinel:{ rows:['..mmmm..','.mmmmmm.','mmmeemmm','mmmeemmm','mmmmmmmm','.m.mm.m.','.m....m.'],ink:{ m:'magenta',e:'red' } },
};
const ART_TILES = 0.86;
const HALF = 0.5;

function uiPaintCastArt(ctx,frame,spot) {
const art = UI_CAST_ART[spot.name];
const width = art.rows[0].length;
const pixel = (frame.tile * ART_TILES) / Math.max(width,art.rows.length);
const left = spot.left + (frame.tile - pixel * width) * HALF;
const top = spot.top + (frame.tile - pixel * art.rows.length) * HALF;
art.rows.forEach(function (line,row) {
[...line].forEach(function (glyph,col) {
if (!Object.hasOwn(art.ink,glyph)) return;
ctx.fillStyle = frame.palette[art.ink[glyph]];
ctx.fillRect(left + col * pixel,top + row * pixel,pixel,pixel);
});
});
}

export { UI_CAST_ART,uiPaintCastArt };

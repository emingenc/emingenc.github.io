const UI_SPRITE_SIZE = 16;
const UI_TRANSPARENT = '.';
const UI_SPRITE_PALETTE = {
'.':null,
k:{ color:'bg' },
p:{ color:'panel' },
b:{ color:'border' },
B:{ color:'border',light:0.3 },
D:{ color:'dim',shade:0.55 },
d:{ color:'dim' },
t:{ color:'text' },
g:{ color:'primary' },
h:{ color:'primary',shade:0.72 },
G:{ color:'bright' },
y:{ color:'amber' },
Y:{ color:'amber',shade:0.55 },
r:{ color:'red' },
R:{ color:'red',shade:0.55 },
z:{ color:'red',alpha:0.2 },
x:{ color:'bg',alpha:0.5 },
A:{ color:'accent' },
a:{ color:'accent',shade:0.5 },
s:{ color:'accent',shade:0.78 },
e:{ color:'accent',shade:0.84 },
f:{ color:'accent',shade:0.91 },
L:{ color:'accent',light:0.5 },
};

function uiSheet(names,text) {
const lines = text.split('\n').slice(1,-1);
return Object.fromEntries(names.map(function (name,index) {
return [name,lines.map(function (line) { return line.split(' ')[index]; })];
}));
}

const UI_FLOOR_SHEET = uiSheet(['floor','floor-trace','floor-vent','pad'],`
eeeeeeeeeeeeeeee eeeeeeeeeeeeeeee eeeeeeeeeeeeeeee eeeeeeeeeeeeeeee
efffffffffffffff efffffffffffffff efffffffffffffff efffffffffffffff
efffffffffffffff efffffffffffffff efffffffffffffff efffffffffffffff
efffffffffffffff efffaaffffffffff efffffffffffffff efffffhhhhhfffff
efffffffffffffff efffaasssfffffff efffkkkkkkkkffff effffhfffffhffff
efffffffffffffff effffffffsffffff efffeeeeeeeeffff efffhfffffffhfff
efffffffffffffff efffffffffsfffff efffffffffffffff effhfffffffffhff
efffffffffffffff effffffffffsffff efffkkkkkkkkffff effhfffgggfffhff
efffffffffffffff effffffffffsffff efffeeeeeeeeffff effhfffgggfffhff
efffffffffffffff effffffffffsffff efffffffffffffff effhfffgggfffhff
efffffffffffffff effffffffffaafff efffkkkkkkkkffff effhfffffffffhff
efffffffffffffff effffffffffaafff efffeeeeeeeeffff efffhfffffffhfff
efffffffffffffff efffffffffffffff efffffffffffffff effffhfffffhffff
efffffffffffffff efffffffffffffff efffffffffffffff efffffhhhhhfffff
efffffffffffffff efffffffffffffff efffffffffffffff efffffffffffffff
efffffffffffffff efffffffffffffff efffffffffffffff efffffffffffffff
`);

const UI_WALL_SHEET = uiSheet(['wall-top','wall-face','rim-up','rim-ne','rim-se'],`
pkkkkkkkpkkkkkkk ................ AAAAAAAAAAAAAAAA ..............AA ................
kkkkkkkpkkkkkkkp ................ aaaaaaaaaaaaaaaa ..............aA ................
kkkkkkpkkkkkkkpk ................ ................ ................ ................
kkkkkpkkkkkkkpkk ................ ................ ................ ................
kkkkpkkkkkkkpkkk ................ ................ ................ ................
kkkpkkkkkkkpkkkk kkkkkkkkkkkkkkkk ................ ................ ..............kk
kkpkkkkkkkpkkkkk ssssssssssssssss ................ ................ ..............aA
kpkkkkkkkpkkkkkk bbbbbbbbbbbbbbbb ................ ................ ..............aA
pkkkkkkkpkkkkkkk kpppppppkppppppp ................ ................ ..............aA
kkkkkkkpkkkkkkkp kpBpppppkpBppppp ................ ................ ..............aA
kkkkkkpkkkkkkkpk kpppppppkppppppp ................ ................ ..............aA
kkkkkpkkkkkkkpkk kpppppppkppppppp ................ ................ ..............aA
kkkkpkkkkkkkpkkk kkkkkkkkkkkkkkkk ................ ................ ..............aA
kkkpkkkkkkkpkkkk AAAAAAAAAAAAAAAA ................ ................ ..............aA
kkpkkkkkkkpkkkkk aaaaaaaaaaaaaaaa ................ ................ ..............aA
kpkkkkkkkpkkkkkk kkkkkkkkkkkkkkkk ................ ................ ..............aA
`);

const UI_BARRIER_SHEET = uiSheet(['door','jamb','beams','emitter-up'],`
.kkkkkkkkkkkkkk. kkkkkkkkkkkkkkkk .ztzzzrzzrzzzrz. kkkkkkkkkkkkkkkk
.kBBBBBBBBBBBBk. khhhhhhhhhhhhhhk .zrzzzrzzrzzzrz. kBBBBBBBBBBBBBBk
.kyyYYyyYYyyYYk. kkkkkkkkkkkkkkkk .zrzzzrzzrzzztz. kbAbbbAbbAbbbAbk
.kyYYyyYYyyYYyk. ................ .zrzzzrzzrzzzrz. kkrkkkrkkrkkkrkk
.kYYyyYYyyYYyyk. ................ .zrzzztzzrzzzrz. ................
.kYyyYYyyYYyyYk. ................ .zrzzzrzzrzzzrz. ................
.kyyYYkkkkyyYYk. ................ .zrzzzrzztzzzrz. ................
.kyYYyktrkyYYyk. ................ .zrzzzrzzrzzzrz. ................
.kYYyykrRkYYyyk. ................ .ztzzzrzzrzzzrz. ................
.kYyyYkkkkYyyYk. ................ .zrzzzrzzrzzzrz. ................
.kyyYYyyYYyyYYk. ................ .zrzzzrzzrzzztz. ................
.kyYYyyYYyyYYyk. ................ .zrzzzrzzrzzzrz. ................
.kYYyyYYyyYYyyk. ................ .zrzzztzzrzzzrz. ................
.kYyyYYyyYYyyYk. kkkkkkkkkkkkkkkk .zrzzzrzzrzzzrz. ................
.kbbbbbbbbbbbbk. khhhhhhhhhhhhhhk .zrzzzrzztzzzrz. ................
.kkkkkkkkkkkkkk. kkkkkkkkkkkkkkkk .zrzzzrzzrzzzrz. ................
`);

const UI_PASSAGE_SHEET = uiSheet(['chevrons'],`
................
................
................
................
...hh....gg.....
....hh....gg....
.....hh....gg...
......hh....gg..
......hh....gg..
.....hh....gg...
....hh....gg....
...hh....gg.....
................
................
................
................
`);

const UI_TERMINAL_SHEET = uiSheet(['terminal-idle','terminal-breached','terminal-replay','led'],`
................ ................ ................ ................
.kkkkkkkkkkkkkk. .kkkkkkkkkkkkkk. .kkkkkkkkkkkkkk. ................
.kBBBBBBBBBBBBk. .kBBBBBBBBBBBBk. .kBBBBBBBBBBBBk. ................
.kBkkkkkkkkkkbk. .kBkkkkkkkkkkbk. .kBkkkkkkkkkkbk. ................
.kBkYYYyyYYYkbk. .kBkhhhhhhhGkbk. .kBkhhhGhhhhkbk. ................
.kBkYYyYYyYYkbk. .kBkhhhhhhGhkbk. .kBkhhhGGhhhkbk. ................
.kBkYYyyyyYYkbk. .kBkhGhhhGhhkbk. .kBkhhhGGGhhkbk. ................
.kBkYYyykyYYkbk. .kBkhhGhGhhhkbk. .kBkhhhGGhhhkbk. ................
.kBkYYyyyyYYkbk. .kBkhhhGhhhhkbk. .kBkhhhGhhhhkbk. ................
.kBkkkkkkkkkkbk. .kBkkkkkkkkkkbk. .kBkkkkkkkkkkbk. ................
.kbbbkbkbkbbkbk. .kbbbkbkbkbbgbk. .kbbbkbkbkbbgbk. ............y...
.kkkkkkkkkkkkkk. .kkkkkkkkkkkkkk. .kkkkkkkkkkkkkk. ................
kLAAAAAAAAAAAAak kLAAAAAAAAAAAAak kLAAAAAAAAAAAAak ................
kasksksksksksksk kasksksksksksksk kasksksksksksksk ................
kaaaaaaaaaaaaaak kaaaaaaaaaaaaaak kaaaaaaaaaaaaaak ................
kkkkkkkkkkkkkkkk kkkkkkkkkkkkkkkk kkkkkkkkkkkkkkkk ................
`);

const UI_PIP_SHEET = uiSheet(['pip-1','pip-2','pip-3','focus'],`
................ ................ ................ GGG..........GGG
................ ................ ................ G..............G
................ ................ ................ G..............G
................ ................ ................ ................
................ ................ ................ ................
................ ................ ................ ................
................ ................ ................ ................
................ ................ ................ ................
................ ................ ................ ................
................ ................ ................ ................
.....y.......... .......y........ .........y...... ................
................ ................ ................ ................
................ ................ ................ ................
................ ................ ................ G..............G
................ ................ ................ G..............G
................ ................ ................ GGG..........GGG
`);

const UI_RIG_SHEET = uiSheet(['rig-idle','rig-lit','rig-done','rig-pip','rig-halo'],`
kkkkkkkkkkkkkkkk kkkkkkkkkkkkkkkk kkkkkkkkkkkkkkkk ................ .LLLLLLLLLLLLLL.
kLLLLLLLLLLLLLLk kLLLLLLLLLLLLLLk kLLLLLLLLLLLLLLk ................ L..............L
kLAkAAkAAkAAkALk kLAAAAAAAAAAAALk kLAGAAGAAGAAGALk ................ L..............L
kLLLLLLLLLLLLLLk kLLLLLLLLLLLLLLk kLLLLLLLLLLLLLLk ................ L..............L
kkkkkkkkkkkkkkkk kkkkkkkkkkkkkkkk kkkkkkkkkkkkkkkk ................ L..............L
kpBBBBBBBBBBBBpk kpBBBBBBBBBBBBpk kpBBBBBBBBBBBBpk ................ L..............L
kpBAAAAAAAAAAbpk kpBkkkkAkkkkkbpk kpBhhhhhhhhGhbpk ................ L..............L
kpBAkAAAAAAAAbpk kpBkkkkAAkkkkbpk kpBhhhhhhhGhhbpk ................ L..............L
kpBAAkAAAAAAAbpk kpBkkkkAAAkkkbpk kpBhGhhhhGhhhbpk ................ L..............L
kpBAkAAkkkAAAbpk kpBkkkkAAkkkkbpk kpBhhGhhGhhhhbpk ................ L..............L
kpBaaaaaaaaaabpk kpBkkkkAkkkkkbpk kpBhhhGGhhhhhbpk ................ L..............L
kpbbbbbbbbbbbbpk kpbbbbbbbbbbbbpk kpbbbbbbbbbbbbpk ................ L..............L
kaDDaDDaDDaaLLak kaDDaDDaDDaaLLak kaDDaDDaDDaaLLak ..yy............ L..............L
kaDDaDDaDDaaLLak kaDDaDDaDDaaLLak kaDDaDDaDDaaLLak ..yy............ L..............L
kssssssssssssssk kssssssssssssssk kssssssssssssssk ................ L..............L
kkkkkkkkkkkkkkkk kkkkkkkkkkkkkkkk kkkkkkkkkkkkkkkk ................ .LLLLLLLLLLLLLL.
`);

const UI_RIG_MAST_SHEET = uiSheet(['rig-mast','rig-mast-done','rig-beacon'],`
................ ................ ................
................ ................ ................
................ ................ ................
................ ................ ................
................ ................ ................
................ ................ ................
......kkkk...... ......kkkk...... ...L........L...
.....kLLLLk..... .....kGGGGk..... ..L..........L..
.....kLttLk..... .....kGttGk..... .L............L.
.....kLttLk..... .....kGttGk..... .L............L.
.....kLLLLk..... .....kGGGGk..... ..L..........L..
......kAAk...... ......kAAk...... ...L........L...
.......kk....... .......kk....... ................
.......BB....... .......BB....... ................
.......BB....... .......BB....... ................
......BBBB...... ......BBBB...... ................
`);

const UI_CORE_SHEET = uiSheet(['core-sealed','core-ready','core-claimed','core-glow'],`
................ ................ ................ ................
....kkkkkkkk.... ....kkkkkkkk.... ....kkkkkkkk.... ................
...kaaaaaaaak... ...kLLLLLLLLk... ...kDDDDDDDDk... ................
..kasssssssssk.. ..kLAAAAAAAAak.. ..kDbbbbbbbbbk.. ................
.kaskkkkkkkkssk. .kLAkkkkkkkkAak. .kDbkkkkkkkkbbk. ................
.kasksssssskssk. .kLAkkkLLkkkAak. .kDbkkkkkkkkbbk. .......LL.......
.kaskkkkkkkkssk. .kLAkkLttAkkAak. .kDbkksssskkbbk. ......LttL......
.kasksssssskssk. .kLAkLttAAakAak. .kDbkkskkskkbbk. .....LttttL.....
.kaskkkrrkkkssk. .kLAkLtAAaakAak. .kDbkkskkskkbbk. .....LttttL.....
.kaskssrrsskssk. .kLAkkAAaakkAak. .kDbkksssskkbbk. ......LttL......
.kaskkkkkkkkssk. .kLAkkkaakkkAak. .kDbkkkkkkkkbbk. .......LL.......
.kaskkkkkkkkssk. .kLAkkkkkkkkAak. .kDbkkkkkkkkbbk. ................
..kasssssssssk.. ..kLAAAAAAAAak.. ..kDbbbbbbbbbk.. ................
...kasssssssk... ...kLaaaaaaak... ...kDbbbbbbbk... ................
....kkkkkkkk.... ....kkkkkkkk.... ....kkkkkkkk.... ................
................ ................ ................ ................
`);

const UI_THINGS_SHEET = uiSheet(['cache','cache-empty','sparkle','kernel-door','kernel','encrypted'],`
................ ................ ................ kkkkkkkkkkkkkkkk ................ kkkkkkkkkkkkkkkk
................ ................ ................ kRRRRRRRRRRRRRRk ....y.y..y.y.... kDDDDDDDDDDDDDDk
................ ................ .............t.. kRrpppppppppprRk ....Y.Y..Y.Y.... kDkpkpkpkpkpkpDk
................ ................ ............ttt. kRppppppppppppRk ...kkkkkkkkkk... kDpkpkpkpkpkpkDk
....kkkkkkkk.... ....ssssssss.... .............t.. kRppppppppppppRk .yYkBBBBBBBBkYy. kDkpkpkddkpkpkDk
....kttyyyyk.... ....s......s.... ................ kRppppkkkkppppRk ...kBkkkkkkbk... kDpkpkdkkdpkpkDk
....ktkkkkyk.... ....s......s.... ................ kRpppkytyYkpppRk .yYkBkrrrRkbkYy. kDkpkpdkkdkpkpDk
....kykttkyk.... ....s......s.... ................ kRpppktyyYkpppRk ...kBkrttRkbk... kDpkpddddddkpkDk
....kykkkkyk.... ....s......s.... ................ kRpppkyyYYkpppRk ...kBkrttRkbk... kDkpkddddddpkpDk
....kyyyyyyk.... ....s......s.... ................ kRpppkYYYYkpppRk .yYkBkRRRRkbkYy. kDpkpddkkddkpkDk
....kyYyYyYk.... ....s......s.... ................ kRppppkkkkppppRk ...kBkkkkkkbk... kDkpkddkkddpkpDk
....kkkkkkkk.... ....ssssssss.... ................ kRppppppppppppRk .yYkbbbbbbbbkYy. kDpkpddddddkpkDk
.....xxxxxxxx... ................ ................ kRppppppppppppRk ...kkkkkkkkkk... kDkpkpkpkpkpkpDk
................ ................ ................ kRrpppppppppprRk ....Y.Y..Y.Y.... kDpkpkpkpkpkpkDk
................ ................ ................ kRRRRRRRRRRRRRRk ....y.y..y.y.... kDDDDDDDDDDDDDDk
................ ................ ................ kkkkkkkkkkkkkkkk ................ kkkkkkkkkkkkkkkk
`);

const UI_GLYPHS = {
'0':['###','#.#','#.#','#.#','###'],
'1':['.#.','##.','.#.','.#.','###'],
'2':['##.','..#','.#.','#..','###'],
'3':['##.','..#','.#.','..#','##.'],
'4':['#.#','#.#','###','..#','..#'],
'5':['###','#..','##.','..#','##.'],
'6':['.##','#..','###','#.#','###'],
'7':['###','..#','.#.','.#.','.#.'],
'8':['###','#.#','###','#.#','###'],
'9':['###','#.#','###','..#','##.'],
L:['#..','#..','#..','#..','###'],
V:['#.#','#.#','#.#','#.#','.#.'],
'/':['..#','..#','.#.','#..','#..'],
};
const UI_GLYPH_INK = '#';
const UI_BADGE_TONES = { gate:{ ink:'r',plate:'k',edge:'R' },kernel:{ ink:'y',plate:'k',edge:'Y' } };

const UI_RING = { inner:4.5,outer:6.6,centre:8,pixelCentre:0.5,lit:'g',unlit:'R' };

const UI_BEAM_FRAMES = 4;
const UI_BEAM_STEP = 2;
const UI_RIG_PIPS = 3;
const UI_RIG_PIP_STEP = 3;

function uiTurn(rows) {
return rows[0].split('').map(function (glyph,col) { return rows.map(function (row) { return row[col]; }).join(''); });
}
function uiMirror(rows) {
return rows.map(function (row) { return row.split('').reverse().join(''); });
}
function uiFlip(rows) {
return [...rows].reverse();
}
function uiRecolor(rows,from,to) {
return rows.map(function (row) { return row.split(from).join(to); });
}
function uiScrollDown(rows,count) {
return [...rows.slice(rows.length - count),...rows.slice(0,rows.length - count)];
}
function uiScrollRight(rows,count) {
return rows.map(function (row) { return row.slice(row.length - count) + row.slice(0,row.length - count); });
}
function uiRigGlow(idle) {
return idle.map(function (row) { return row.split('').map(function (glyph) { return glyph === 'A' ? 'L' :UI_TRANSPARENT; }).join(''); });
}
function uiRigPips(pip) {
return Object.fromEntries(Array.from({ length:UI_RIG_PIPS },function (_,slot) { return ['rig-pip-' + (slot + 1),uiScrollRight(pip,slot * UI_RIG_PIP_STEP)]; }));
}
function uiPosts(emitter) {
const post = uiRecolor(emitter,'r','k');
return { 'post-up':post,'post-down':uiFlip(post),'post-left':uiTurn(post),'post-right':uiMirror(uiTurn(post)) };
}
function uiDerivedSprites(drawn) {
const derived = {
'rim-left':uiTurn(drawn['rim-up']),'rim-right':uiMirror(uiTurn(drawn['rim-up'])),
'rim-nw':uiMirror(drawn['rim-ne']),'rim-sw':uiMirror(drawn['rim-se']),
'emitter-down':uiFlip(drawn['emitter-up']),'emitter-left':uiTurn(drawn['emitter-up']),
'emitter-right':uiMirror(uiTurn(drawn['emitter-up'])),'door-turned':uiTurn(drawn.door),'jamb-turned':uiTurn(drawn.jamb),
'rig-glow':uiRigGlow(drawn['rig-idle']),...uiRigPips(drawn['rig-pip']),...uiPosts(drawn['emitter-up']),
'chevrons-turned':uiTurn(drawn.chevrons),
};
for (let frame = 0; frame < UI_BEAM_FRAMES; frame += 1) {
derived['beams-' + frame] = uiScrollDown(drawn.beams,frame * UI_BEAM_STEP);
derived['beams-turned-' + frame] = uiTurn(derived['beams-' + frame]);
}
return derived;
}
const UI_DRAWN_SPRITES = {
...UI_FLOOR_SHEET,...UI_WALL_SHEET,...UI_BARRIER_SHEET,...UI_PASSAGE_SHEET,...UI_TERMINAL_SHEET,...UI_PIP_SHEET,...UI_RIG_SHEET,...UI_RIG_MAST_SHEET,...UI_CORE_SHEET,
...UI_THINGS_SHEET,
};
const UI_SPRITES = { ...UI_DRAWN_SPRITES,...uiDerivedSprites(UI_DRAWN_SPRITES) };

function uiSpriteRuns(rows) {
const runs = [];
rows.forEach(function (text,row) {
let col = 0;
while (col < text.length) {
const glyph = text[col];
const start = col;
while (col < text.length && text[col] === glyph) col += 1;
if (glyph !== UI_TRANSPARENT) runs.push({ row,col:start,span:col - start,glyph });
}
});
return runs;
}
function uiGlyph(char) {
if (!Object.hasOwn(UI_GLYPHS,char)) throw new Error('grid-sprites: no glyph for "' + char + '"');
return UI_GLYPHS[char];
}
function uiTextLines(text,tone) {
const glyphs = text.split('').map(uiGlyph);
return glyphs[0].map(function (line,index) {
const joined = glyphs.map(function (glyph) { return glyph[index]; }).join(UI_TRANSPARENT);
return joined.split('').map(function (pixel) { return pixel === UI_GLYPH_INK ? tone.ink :tone.plate; }).join('');
});
}
function uiBadgeRows(text,tone) {
const inks = UI_BADGE_TONES[tone];
const padded = uiTextLines(text,inks).map(function (line) { return inks.plate + line + inks.plate; });
const width = padded[0].length;
const body = [inks.plate.repeat(width),...padded,inks.plate.repeat(width)].map(function (line) { return inks.edge + line + inks.edge; });
const edge = UI_TRANSPARENT + inks.edge.repeat(width) + UI_TRANSPARENT;
return [edge,...body,edge];
}
function uiRingGlyph(pixel,lit,total) {
const across = pixel.col + UI_RING.pixelCentre - UI_RING.centre;
const down = pixel.row + UI_RING.pixelCentre - UI_RING.centre;
const radius = Math.hypot(across,down);
if (radius < UI_RING.inner || radius >= UI_RING.outer) return UI_TRANSPARENT;
const turn = (Math.atan2(across,-down) / (2 * Math.PI) + 1) % 1;
return Math.floor(turn * total) < lit ? UI_RING.lit :UI_RING.unlit;
}
function uiRingRows(lit,total) {
return Array.from({ length:UI_SPRITE_SIZE },function (_,row) {
return Array.from({ length:UI_SPRITE_SIZE },function (__,col) { return uiRingGlyph({ col,row },lit,total); }).join('');
});
}
const uiMadeSprites = new Map();
function uiMadeSprite(name,make) {
if (!uiMadeSprites.has(name)) uiMadeSprites.set(name,make());
return name;
}
function uiBadgeSprite(text,tone) {
return uiMadeSprite('badge:' + tone + ':' + text,function () { return uiBadgeRows(text,tone); });
}
function uiRingSprite(lit,total) {
return uiMadeSprite('ring:' + lit + '/' + total,function () { return uiRingRows(lit,total); });
}
function uiSpriteRows(name) {
return Object.hasOwn(UI_SPRITES,name) ? UI_SPRITES[name] :uiMadeSprites.get(name);
}

function uiInkFill(ctx,rect,paint) {
ctx.globalAlpha = paint.alpha;
ctx.fillStyle = paint.color;
ctx.fillRect(rect.left,rect.top,rect.width,rect.height);
}
function uiFillRun(ctx,run,look) {
const ink = UI_SPRITE_PALETTE[run.glyph];
const rect = { left:run.col * look.pixel,top:run.row * look.pixel,width:run.span * look.pixel,height:look.pixel };
uiInkFill(ctx,rect,{ color:look.palette[ink.color === 'accent' ? look.accent :ink.color],alpha:ink.alpha || 1 });
if (ink.shade) uiInkFill(ctx,rect,{ color:look.palette.bg,alpha:ink.shade });
if (ink.light) uiInkFill(ctx,rect,{ color:look.palette.text,alpha:ink.light });
ctx.globalAlpha = 1;
}
function uiRenderSprite(rows,look) {
const canvas = document.createElement('canvas');
canvas.width = rows[0].length * look.pixel;
canvas.height = rows.length * look.pixel;
const ctx = canvas.getContext('2d');
uiSpriteRuns(rows).forEach(function (run) { uiFillRun(ctx,run,look); });
return canvas;
}
let uiCanvasCache = { palette:null,bySize:new Map() };
function uiCachedCanvases(paint) {
if (uiCanvasCache.palette !== paint.palette) uiCanvasCache = { palette:paint.palette,bySize:new Map() };
if (!uiCanvasCache.bySize.has(paint.pixel)) uiCanvasCache.bySize.set(paint.pixel,new Map());
return uiCanvasCache.bySize.get(paint.pixel);
}
function uiSpriteCanvas(name,accent,paint) {
const byName = uiCachedCanvases(paint);
if (!byName.has(name)) byName.set(name,new Map());
const byAccent = byName.get(name);
if (!byAccent.has(accent)) byAccent.set(accent,uiRenderSprite(uiSpriteRows(name),{ ...paint,accent }));
return byAccent.get(accent);
}

export {
UI_SPRITE_SIZE,
UI_SPRITE_PALETTE,
UI_BEAM_FRAMES,
UI_RIG_PIPS,
UI_SPRITES,
uiSpriteRuns,
uiSpriteRows,
uiBadgeRows,
uiBadgeSprite,
uiRingRows,
uiRingSprite,
uiSpriteCanvas,
};

const SHIELD_TEXTS = {
coach:{
open:'{g} opens an order. PUSH it: the tower holds it, and you can only touch the top plate.',
close:'{g} closes. POP only if the top plate is its match: {top} on top.',
breach:'{g} meets {top} on top and they cannot match. Hold BREACH to deflect the whole volley.',
stray:'{g} arrives with no plate to meet. Hold BREACH.',
end:'$ ends the order. Tower empty: CLEAR. Plates left: hold BREACH.',
mixed:'Two kinds now: ( ) and [ ]. A plate only matches its own kind.',
plain:'Order {o} of {n}. {g} is next. The tower holds {depth}.',
push:'PUSH {g}. The tower holds {depth}.',
pop:'POP {g}. The tower holds {depth}.',
clear:'Order clear. Tower empty. Streak x{combo}.',
deflect:'Deflected. A volley that cannot match is dead on the spot.',
chip:'ORDER {o}/{n}',
announce:'{g}. Tower holds {depth}.',
},
rule:'Block {n} volleys. PUSH an opener onto the tower, POP a closer that matches the top plate. Cannot match? Hold BREACH.',
why:{
missedTop:'{g} cannot POP {top}. Top must match: that volley was a BREACH.',
missedEmpty:'{g} came with no plate to match. That volley was a BREACH.',
missedEnd:'CLEAR at $ with {left} stacked: unclosed. Leftovers mean BREACH.',
falseBreach:'That volley still matched ({g}). BREACH only when the top cannot match.',
slipOpen:'{g} opens: PUSH it.',
slipClose:'{g} closes {top}: POP it.',
slipEnd:'$ with an empty tower: CLEAR it.',
hit:' -1 ♥.',
},
toast:{
hold:'Hold BREACH. A tap is not enough.',
},
card:{
used:'You used {steps} actions. Brute force would re-read {reads} glyphs.',
stars:'STARS: 1 = cleared, 2 = no false or missed BREACH, 3 = also no slip: one action per glyph.',
title:'DISH RUSH CLEAR - THE SHIELD HOLDS',
next:'Next: breach a LOCK. Solving locks is how you pass each sector.',
failTitle:'SHIELD DOWN',
how:'How scoring works',
why:'WHY IT MATTERS: BRUTE re-reads the order from its start at every glyph: {n} glyphs, {reads} reads. A stack touches each glyph once: O(n), not O(n^2).',
},
};

export { SHIELD_TEXTS };

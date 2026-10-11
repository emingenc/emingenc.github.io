const PINCER_TEXTS = {
rule:'Two cannons, one crumbling bridge. Low sum: move L>. High sum: move <R. Equal to the target: FIRE. ROOT eats a tile every move.',
coach:{
start:'Sum {sum}, target {t}. Move the cannon that changes the sum the right way.',
low:'Sum {sum} is below {t}. Raise it: L> moves the left cannon up.',
high:'Sum {sum} is above {t}. Lower it: <R moves the right cannon down.',
equal:'Sum {sum} = {t}. FIRE now.',
dropHint:'The wrong cannon can throw the answer away. Low sum: L>. High sum: <R.',
plank:'Plank pillar {v}: a spare FIRE there is +150 and ROOT skips a tile. It costs a charge and a step.',
floorLow:'{floor} tiles of bridge left. Every wasted move is floor you lose.',
pairDone:'Pair found: {a} + {b} = {t}.',
},
toast:{
rightSafeLeft:'L> at sum {sum} {rel} {t} -> L moved when the sum was {state}. Safe this time, but it can drop the answer.',
rightSafeRight:'<R at sum {sum} {rel} {t} -> R moved when the sum was {state}. Safe this time, but it can drop the answer.',
dropLeft:'L> at sum {sum} {rel} {t} ({a}+{b}) -> you dropped {v}, and {v}+{partner}={t} was still possible. High sum: move <R down. Equal sum: FIRE.',
dropRight:'<R at sum {sum} {rel} {t} ({a}+{b}) -> you dropped {v}, and {v}+{partner}={t} was still possible. Low sum: move L> up. Equal sum: FIRE.',
miss:'FIRE at {sum} ≠ {t} -> wasted charge. Fire only on equal.',
floor:'ROOT ate the last tile. The bridge is gone.',
charges:'No charges left. FIRE only when the sum equals the target.',
plank:'Plank shot at pillar {v}: +150. ROOT will skip a tile.',
},
card:{
title:'THE CANNONS MEET',
failTitle:'BRIDGE LOST',
used:'You used {steps} steps. Brute force would check {checks} pairs.',
stars:'STARS: 1 = pair found, 2 = also no wrong moves, 3 = also no more steps than the perfect line.',
why:'WHY IT MATTERS: BRUTE tries every pair: 10x9/2 = 45 checks. Moving the correct pointer never skips the answer, so two pointers need at most 9 moves.',
next:'Next: breach a LOCK. Sorted data lets one pass do the work of n^2 checks.',
failFloor:'ROOT ate the whole bridge. Every move should close the gap between the cannons.',
failDrop:'The answer was dropped. A cannon that moves off a pillar throws it away for good.',
failCharges:'Out of charges. FIRE only when the sum equals the target.',
how:'How scoring works',
},
};

function fillText(template,values) {
return template.replace(/\{(\w+)\}/g,function (_,name) {
return name in values ? String(values[name]) :'';
});
}

export { PINCER_TEXTS,fillText };

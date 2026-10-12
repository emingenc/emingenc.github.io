const NET_TEXTS = {
rule:'Slide one net over the stream. EXTEND takes the peeked item in, SHRINK lets the oldest go. Never hold a repeat.',
ruleSum:'Slide one net over the weights. Keep the sum at or under K: EXTEND takes the peeked item in, SHRINK lets the oldest go.',
coach:{
start:'Peek {x}. New to the net: EXTEND. Already in it: SHRINK past it first.',
fresh:'Peek {x} is not in the net. EXTEND.',
dup:'Peek {x} is already in the net. SHRINK until it leaves.',
jump:'Peek {x} was last at {at}. JUMP moves l to {to} in one move.',
sumLow:'Sum {sum} is within K={k}. EXTEND.',
sumHigh:'Sum {sum} > K={k}. SHRINK until the sum is {k} or less.',
gold:'The gold item is in the net. Tap it for +{points}; it costs one move.',
best:'BEST {best}.',
announce:'Net {len} long. Best {best}. Peek {x}.',
},
toast:{
tear:'EXTEND onto the peeked 2nd {x} -> net tore. Shrink past the first {x} first.',
wasted:'SHRINK with no repeat in the net -> wasted step. Shrink only until the duplicate leaves.',
tearJump:'JUMP on {x} -> l went back to {l} (old {x}+1), re-admitting the first {y} -> net tore. The old {x} was already outside: EXTEND.',
jumpBack:'JUMP on {x} -> l went back to {l}. The old {x} was already outside: EXTEND.',
jumpStays:'JUMP on {x} -> l stays at {l}. The old {x} was already outside: EXTEND.',
strain:'sum {sum} > K={k} -> shrink until <= K.',
tearSum:'EXTEND at sum {sum} > K={k} -> net tore. Shrink until <= K first.',
wastedSum:'SHRINK at sum {sum} <= K={k} -> wasted step. Shrink only while the sum is over K.',
flick:'Flicked {x} out of the net: +{points}. One move over par.',
},
card:{
title:'THE NET HOLDS',
failTitle:'NET TORN',
used:'{steps} moves for {n} items; perfect is {par}. BRUTE rebuilt the net from every start: {reads} reads.',
stars:'1 clear, 2 no tear and no wasted move, 3 also moves <= par.',
how:'How scoring works',
why:'WHY IT MATTERS: BRUTE rebuilds the net from every start: {reads} reads. A sliding window moves each edge forward once: O(n).',
},
};
function fillText(template,values) {
return template.replace(/\{(\w+)\}/g,function (_,name) {
return name in values ? String(values[name]) :'';
});
}

export { NET_TEXTS,fillText };

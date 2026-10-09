const TURRET_TEXTS = {
coach:{
first:'{v} needs {t} - {v} = {key}. Drag {v} onto slot {key}: empty, so it gets stored.',
second:'{v} needs {t} - {v} = {key}. Slot {key}: lit = PAIR, empty = STORE.',
plain:'Drone {v} in the bay. Target {t}.',
dup:'Another {v}! Storing stacks it: slot {v} holds x{count}.',
rush:'RUSH: a wrong LOOKUP now lets the next drone ram you.',
fuse:'FUSE ON: {sec} s per drone. ASSIST (top right) turns fuses off.',
switched:'TARGET IS NOW {t}! Old tags still count: the key is the value.',
two:'TWO in the bay: {first} and {second}. Tap one to pick it; the other keeps its fuse.',
pair:'LOOKUP slot {key}: {key} + {v} = {t}. One check. Pair down!',
store:'LOOKUP slot {key}: empty. So {v} is stored in slot {v}. Get, then put.',
tag:'STORE: {v} goes in slot {v}. Key = value.',
chip:'BAY {n} · T {t}',
announce:'{n}. Target {t}.',
},
rule:'Clear all {n} drones to open the way. Drop each drone on the slot TARGET minus its number: lit slot = PAIR, empty slot = STORE.',
banner:'FUSE: {sec} s per drone, or it fires and costs a heart.',
toast:{
wrong:'Wrong slot. {v} needs a {key} ({t} - {v}). Slot {slot} was {state}.',
ram:' A drone hits you: -1 ♥.',
walk:'Slot {key} was lit, so the {key} drone slipped past: -1 ♥. Check slot {key} before you STORE IT.',
fuseOut:'Fuse out!',
fuse:'The {v} drone fused out. {v} needs a {key} ({t} - {v}); slot {key} was {state}. -1 ♥.',
lit:'lit',
empty:'empty',
},
card:{
used:'You used {steps} lookups. Brute force would need {compares}.',
stars:'STARS: 1 = cleared, 2 = no wrong lookups, 3 = also no more checks than drones. A fuse miss costs a heart, not a star.',
title:'WAVE CLEAR - THE WAY IS OPEN',
next:'Next: breach a LOCK. Solving locks is how you pass each sector.',
failTitle:'OVERRUN',
how:'How scoring works',
noRank:'No extra rank: you already earned this at these stars',
lookup:'LOOKUP acquired: a new power. RANK is your hero standing.',
why:'WHY IT MATTERS: BRUTE compares each new drone with every earlier one: {n}x{last}/2 = {compares}. A hash map is O(n), not O(n^2).',
},
};

function fillText(template,values) {
return template.replace(/\{(\w+)\}/g,function (_,name) {
return name in values ? String(values[name]) :'';
});
}

export { TURRET_TEXTS,fillText };

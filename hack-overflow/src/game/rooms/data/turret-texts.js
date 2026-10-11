const TURRET_TEXTS = {
coach:{
first:'{v} needs {t} - {v} = {key}. Drag {v} onto slot {key}: empty, so it gets stored.',
second:'{v} needs {t} - {v} = {key}. Slot {key}: lit = PAIR, empty = STORE.',
plain:'Drone {v} in the bay. Target {t}.',
dup:'Another {v}! Storing stacks it: slot {v} holds x{count}.',
rush:'RUSH: a wrong LOOKUP now lets the next drone ram you.',
switched:'TARGET IS NOW {t}! Old tags still count: the key is the value.',
two:'TWO in the bay: {first} and {second}. Tap one to pick it; the other keeps its fuse.',
pair:'LOOKUP slot {key}: {key} + {v} = {t}. One check. Pair down!',
store:'LOOKUP slot {key}: empty. So {v} is stored in slot {v}. Get, then put.',
tag:'STORE: {v} goes in slot {v}. Key = value.',
chip:'BAY {n} · T {t}',
chipGold:'GOLD {n} · T {t}',
hint:'GHOSTWRITER: "Slot {slot}." TRUST fires it. VERIFY is on you.',
verify:'VERIFY: {v} needs {t} - {v}. Look it up yourself.',
gold:'GOLD drone {v}! Answer it first: x2 and a DOUBLE LOOKUP.',
double:'DOUBLE LOOKUP: your next tap answers two drones.',
billed:'DOUBLE BILLED! A second {v}: slot {v} holds x2.',
dark:'The slots are dark now. Compute T - v, then look it up.',
announce:'{n}. Target {t}.',
},
rule:'Clear all {n} drones to open the way. Drop each drone on the slot TARGET minus its number: lit slot = PAIR, empty slot = STORE.',
rule2:'Clear all {n} drones. The slots are dark: work out TARGET minus the number, then look it up.',
ruleOverflow:'OVERFLOW has no end. The swarm speeds up. Hold it as long as you can.',
toast:{
wrong:'Wrong slot. {v} needs a {key} ({t} - {v}). Slot {slot} was {state}.',
ram:' A drone hits you: -1 ♥.',
walk:'Slot {key} was lit, so the {key} drone slipped past: -1 ♥. Check slot {key} before you STORE IT.',
fuseOut:'Fuse out!',
fuseCovered:'The {v} drone fused out. The gold answer covered it: combo lost, no heart.',
self:'{v} + {v} = {t}, but a drone cannot pair with itself. LOOKUP first, then STORE: that order never self-pairs.',
swarm:'The swarm rammed the bay: a {v} drone got through (-1 ♥). It needed a {key}. Answer faster.',
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
title2:'WAVE 2 CLEAR',
overflowTitle:'OVERFLOW OVER',
overflowUsed:'You held the swarm for {drones} drones in {steps} lookups. BRUTE would need {compares} checks.',
billed:'DOUBLE BILLED: drone {n} was a second {v}. Slot {v} held x2: a count above 1 means "seen before".',
best:'BEST {score}',
newBest:'NEW BEST {score}',
wave1:'WAVE 1',
wave2:'WAVE 2',
overflow:'OVERFLOW',
how:'How scoring works',
why:'WHY IT MATTERS: BRUTE compares each new drone with every earlier one: {n}x{last}/2 = {compares}. A hash map is O(n), not O(n^2).',
},
};

function fillText(template,values) {
return template.replace(/\{(\w+)\}/g,function (_,name) {
return name in values ? String(values[name]) :'';
});
}

export { TURRET_TEXTS,fillText };

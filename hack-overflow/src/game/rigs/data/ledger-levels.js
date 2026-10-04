
const TEXTS = {
'miss-self':'Slot {x} is empty: this {x} is not stored yet, so it cannot pair with itself. STORE it so the next {x} can pair.',
'no-partner':'No {k} stored yet. Nothing to pair {x} with. {choice} it.',
'wrong-slot':'{x} needs {need} (= {T} - {x}), not {k}.',
'why-miss-self':'slot {x} was empty, and a {x} cannot pair with itself.',
'why-no-partner':'no {k} was stored to pair {x} with.',
'why-wrong-slot':'{x} needed slot {need}, you tapped {k}.',
'traced':'Integrity gone: 3 wrong pairs ({packets}). Packet {p}, PAIR {k}: {why}',
'overflow-self-skip':'Packet {p}: {need} was in the ledger, so PAIR {need} would pair {x} and free a slot. STORE hit a full ledger.',
'overflow-skip':'Packet {p}: STORED {x} while {need} sat in the ledger. That {x} still holds a slot.',
'overflow-hoard':'Packet {p}: STORED {x}, but no {need} came for it in time. DROP what will not pair.',
'overflow-full':'Packet {p}: STORE {x} hit a full ledger ({cap}/{cap}). {tip}',
'tip-pair':'PAIR first to keep a slot free.',
'tip-drop':'DROP it, or keep a slot free.',
'tip-evict':'EVICT a slot first, or DROP it.',
'short-wrong':'Packet {p}: a wrong pair (PAIR {k} for {x}) broke the chain. You scored {score}; best was {best}.',
'short-skip':'Packet {p}: {verb} {x} while {need} sat in the ledger broke the chain. You scored {score}; best was {best}.',
'short-drop':'Packet {p}: DROP {x}, but its partner {need} came later. You scored {score}; best was {best}.',
'short-evict':'Packet {p}: EVICT {k}, but a {need} came for it in time. You scored {score}; best was {best}.',
'short-hoard':'Packet {p}: STORE {x}, but no {need} came for it in time. You scored {score}; best was {best}.',
'short-crowd':'Packet {p}: STORE {x} here cost a bigger pair later. You scored {score}; best was {best}.',
'short-pair':'Packet {p}: PAIR {k} here cost a bigger pair later. You scored {score}; best was {best}.',
'skip-note':'Packet {p}: {verb} {x} while {need} sat in the ledger. It cost nothing this time, but the loop pairs first.',
};

const FIRST_PAIRS = {
id:'ledger-1',
title:'FIRST PAIRS',
target:10,
cap:3,
preview:2,
verbs:['pair','store'],
hint:'full',
retry:true,
variants:[
{ stream:[3,8,7,4,9,2,1,4,6],bounty:[5],max:4,best:140,marks:[90,140] },
{ stream:[2,9,1,7,6,3,4,9,8],bounty:[6],max:4,best:160,marks:[100,160] },
{ stream:[2,7,8,4,9,3,6,4,1],bounty:[1],max:4,best:140,marks:[90,140] },
],
bridge:'That loop is Two Sum in one pass. {lock} changes two things: store each packet\'s index (seen[x] = i) and test `need in seen`.',
};

const DOUBLES_AND_NOISE = {
id:'ledger-2',
title:'DOUBLES AND NOISE',
target:10,
cap:3,
preview:3,
verbs:['pair','store','drop'],
hint:'blank',
retry:false,
variants:[
{ stream:[3,1,1,7,3,6,9,5,5,9,5,7],bounty:[10],max:5,best:220,marks:[140,200] },
{ stream:[4,5,4,3,7,3,6,9,5,3,7,7],bounty:[6,11],max:5,best:260,marks:[160,240] },
{ stream:[9,7,1,1,5,9,2,4,3,6,6,5],bounty:[6,8],max:5,best:200,marks:[120,180] },
],
bridge:'Counts, not presence: LeetCode 1679 Max Number of K-Sum Pairs is this loop with a Counter.',
};

const CACHE = {
id:'ledger-3',
title:'CACHE',
target:12,
cap:3,
preview:3,
ttl:4,
verbs:['pair','store','drop','evict'],
hint:'none',
retry:false,
variants:[
{ stream:[6,6,7,10,9,4,7,2,8,2,5,10,3],bounty:[8,12],max:5,best:200,marks:[120,180] },
{ stream:[3,2,10,11,1,11,6,7,3,2,6,5,9],bounty:[8],max:5,best:220,marks:[140,200] },
{ stream:[11,9,10,3,1,2,2,1,5,4,11,1,7],bounty:[6,11],max:5,best:220,marks:[140,200] },
],
bridge:'A full ledger is a cache. You evicted with the future in view (Belady\'s optimal policy). Real caches cannot see ahead, so LeetCode 146 LRU Cache evicts the least recently used key.',
};

const LEDGER = {
id:'ledger',
title:'THE LEDGER',
levels:[FIRST_PAIRS,DOUBLES_AND_NOISE,CACHE],
texts:TEXTS,
};

export { LEDGER };

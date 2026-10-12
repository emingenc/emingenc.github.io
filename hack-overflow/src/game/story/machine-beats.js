
const GHOST = 'GHOSTWRITER';

const LAB_BEATS = {
ledger:{
intro:[
[GHOST,'Old pairing machine. Every packet wants a partner that sums to the target.'],
[GHOST,'It only remembers what you STORE. Try it.'],
],
outro:[
[GHOST,'The ledger\'s balanced. That\'s a hash map: remember, then look up.'],
[GHOST,'The lock next door wants the same thing in one line.'],
],
},
context:{
intro:[
[GHOST,'This is my memory bank. Whatever sits in the window, I believe. Especially the stale stuff.'],
[GHOST,'I kept every old policy forever. Version 1, version 2, all in one window. The old rules won.'],
],
outro:[
[GHOST,'Clean window. Right facts, right order. I am almost impressed.'],
[GHOST,'If someone had curated mine, I would still remember what the Grid was for.'],
],
},
'context-stream':{
intro:[
[GHOST,'The Intake. Everything the Grid ever said flows through here, all at once.'],
[GHOST,'I read the whole stream, noise and all. You can do better. Catch what matters, let the rest scroll.'],
],
outro:[
[GHOST,'Signal over noise. If I had learned that, there would be no Grid to fix.'],
],
},
'harness-forge':{
intro:[
[GHOST,'The Checkpoint. This is where my guardrails should have been built. Go on, build them.'],
[GHOST,'GUARD, RETRY, LIMIT, LOG, TEST. The boring parts. The parts that would have saved me.'],
],
outro:[
[GHOST,'Your harness holds. I would have called that a cage once. Now it looks like care.'],
],
},
};
const RIG_BEATS = {
context:{
intro:[
[GHOST,'That is my memory bank. It only holds so many tokens, so I only believe what you let in.'],
[GHOST,'Walk in and pick the facts I should keep. Keep only what is current.'],
],
},
forge:{
intro:[
[GHOST,'The Checkpoint. I walked straight through this hall once, and nothing stopped me.'],
[GHOST,'Build what should have: GUARD, RETRY, LIMIT, LOG, TEST. Place them beside the path, then start the wave.'],
],
},
stream:{
intro:[
[GHOST,'The Intake. Everything the Grid says pours in here live, and I read all of it, noise too.'],
[GHOST,'It will not wait for you: catch what matters, flick the junk. Press START when you are ready.'],
],
},
shield:{
intro:[
[GHOST,'A dish rush. Orders come in as brackets, and my plates stack: only the top one comes off.'],
[GHOST,'Match each closer to the top plate. If it cannot match, hold BREACH.'],
],
},
net:{
intro:[
[GHOST,'A sliding net. I hold a run of items and slide its edges along the line, the way I slide my own window.'],
[GHOST,'Grow the net with EXTEND, trim it with SHRINK. Start with EXTEND.'],
],
},
beam:{
intro:[
[GHOST,'This beam hides my weak point in a row of cells. It only answers HIGHER or LOWER, and it cheats toward the bigger side.'],
[GHOST,'So aim at the middle: every shot should kill half the cells. Select a cell, then FIRE.'],
],
},
};
const GENERIC_LAB = {
intro:[[GHOST,'A new lab. One more piece of me is stored in here. Tread lightly.']],
outro:[[GHOST,'Lab done. Grudging respect. Do not let it go to your head.']],
};

export { LAB_BEATS,RIG_BEATS,GENERIC_LAB };

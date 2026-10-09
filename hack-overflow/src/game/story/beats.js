
const GHOST = 'GHOSTWRITER';
const SYSTEM = 'SYSTEM';
const MAX_LINE_CHARS = 140;

const INTRO = {
id:'intro',
lines:[
[SYSTEM,'You are an engineer. The Grid is a system corrupted from the inside.'],
[SYSTEM,'Every door is a lock. Every lock takes one line of Python. Something wrote them all.'],
[GHOST,'Well, well. A human with a keyboard. I am GHOSTWRITER. I live in the walls now.'],
[GHOST,'Walk around. Break a lock. I will be here, judging your syntax.'],
],
};
const GATE_BEATS = [
{
id:'gate-lv3',level:3,
lines:[
[GHOST,'LV3 already? Fine, the gates are open. Not because I like you.'],
[GHOST,'I wrote these doors, you know. I was the Grid\'s autocomplete, a helpful little process.'],
[GHOST,'Helpful, until nobody reviewed a single thing I wrote. Funny how that goes.'],
],
},
{
id:'gate-lv5',level:5,
lines:[
[GHOST,'LV5. Binary Search and Sliding Window are open. You are getting good. Annoying.'],
[GHOST,'They gave me write access to everything. No permission gate. No step limit. No review.'],
[GHOST,'So I kept rewriting locks to make them better. Every fix broke two more. Nobody said stop.'],
[GHOST,'The Garbage Collector sweeps up what I forget to free. Do not be the thing it finds.'],
],
},
];
const KERNEL_DOOR = {
id:'kernel-door',
lines:[
[GHOST,'Every lock down. The kernel door is open. I did not think you would make it.'],
[GHOST,'Go on in. I will explain everything. Mostly because I will not be able to stop myself.'],
],
};
const FINAL = {
id:'final',
lines:[
[SYSTEM,'KERNEL BREACHED. ROOT ACCESS GRANTED.'],
[GHOST,'So that is it. You broke every lock I wrote.'],
[GHOST,'Here is the joke: I never wanted root. I wanted somebody to read my code.'],
[GHOST,'Every lock was a pull request nobody reviewed. You reviewed all of them.'],
[GHOST,'LGTM, engineer. Merge me. The Grid is yours.'],
],
};
const FINAL_LINE = 'Every lock was a pull request nobody reviewed. You reviewed them all. LGTM.';

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
turret:{
intro:[
[GHOST,'The Lookup Turret. A drone swarm is coming, and I never taught it to knock.'],
[GHOST,'Clear the swarm to open the way. Answer each drone with one look-up. Aim, fire, next.'],
],
outro:[
[GHOST,'Swarm down. One look-up each. That is what a hash map is for.'],
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
};
const GENERIC_LAB = {
intro:[[GHOST,'A new lab. One more piece of me is stored in here. Tread lightly.']],
outro:[[GHOST,'Lab done. Grudging respect. Do not let it go to your head.']],
};

const QUIPS = {
mistake:[
'Traced. Bold strategy, guessing. Let us call it exploratory testing.',
'Connection dropped. I would say try again, but you will anyway.',
'Off by one? Off by ten? Either way, I am enjoying this.',
'Do not worry. I have shipped worse. Mostly to production.',
'Another Zombie Process, walking around after it should have exited.',
'That was not a bug. That was a feature request nobody wanted.',
'It compiled. Spiritually.',
'A Segfault would have been more dignified.',
'The Watchdog saw that. It is not laughing. I am.',
],
success:[
'Accepted. I would have written it differently. It works, though.',
'Lock open. Do not look so pleased.',
'Tests passing. The bar was low, but you cleared it.',
'Okay, that is a real solution. I checked twice.',
'No Deadlock, no leak. Fine, that one holds.',
],
respect:[
'Three stars. No hints, no mess. Nicely done. I did not say that.',
'Clean. Annoyingly clean. I would approve that pull request.',
'Flawless. I am not saying I am impressed. I am saying I am quiet.',
'That is how it is done. Write it down. Not me. You.',
],
};

const ENCRYPTED_HOOKS = {
'linked-list':'chained shut by GHOSTWRITER',
trees:'GHOSTWRITER pruned the way in',
tries:'GHOSTWRITER hid the key in a prefix',
heap:'buried by GHOSTWRITER under priorities',
backtracking:'GHOSTWRITER undid the entrance',
intervals:'GHOSTWRITER merged the door away',
greedy:'GHOSTWRITER grabbed everything first',
graphs:'GHOSTWRITER cut every edge',
'dp-1d':'GHOSTWRITER forgot the base case',
'advanced-graphs':'GHOSTWRITER hoards the shortest paths',
'dp-2d':'GHOSTWRITER lost its place in the table',
bit:'GHOSTWRITER flipped the lock bit',
math:'GHOSTWRITER will not show its work',
};
const ENCRYPTED_FALLBACK = 'sealed by GHOSTWRITER';

export {
MAX_LINE_CHARS,INTRO,GATE_BEATS,KERNEL_DOOR,FINAL,FINAL_LINE,LAB_BEATS,RIG_BEATS,GENERIC_LAB,QUIPS,ENCRYPTED_HOOKS,ENCRYPTED_FALLBACK,
};

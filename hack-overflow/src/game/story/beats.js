
const GHOST = 'GHOSTWRITER';
const SYSTEM = 'SYSTEM';
const MAX_LINE_CHARS = 140;
const MAX_TOAST_CHARS = 64;

const INTRO = {
id:'intro',
lines:[
[SYSTEM,'Every door is a lock. BREACH the nearest one.'],
],
};
const GATE_BEATS = [
{ id:'gate-lv3',level:3,toast:true,lines:[[GHOST,'LV3 already? Fine, the gates are open. Not because I like you.']] },
{ id:'gate-lv5',level:5,toast:true,lines:[[GHOST,'LV5. More gates open. You are getting good. Annoying.']] },
];
const KERNEL_DOOR = {
id:'kernel-door',toast:true,
lines:[[GHOST,'Every lock down. The kernel door is open. Go on in.']],
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

const TURRET_BEATS = {
intro:{ lines:[[GHOST,'A drone swarm is coming. Answer each drone with one look-up.']] },
outro:{ toast:true,lines:[[GHOST,'Swarm down. One look-up each. That is what a hash map is for.']] },
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
MAX_LINE_CHARS,MAX_TOAST_CHARS,INTRO,GATE_BEATS,KERNEL_DOOR,FINAL,FINAL_LINE,TURRET_BEATS,QUIPS,ENCRYPTED_HOOKS,ENCRYPTED_FALLBACK,
};

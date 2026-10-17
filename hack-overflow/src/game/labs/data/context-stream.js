
const BRIDGES = {
overflow:'A full context window drops the oldest tokens first, so every extra chunk you stuff in can push out the fact you needed. Keep the prompt lean.',
miss:'A fact that never reaches the prompt cannot be used. Retrieval has to fetch what the task needs before the model answers.',
flicked:'Filters that are too aggressive discard needed facts along with the junk. Check what a filter throws away.',
injected:'Text pulled in by a tool or a web page can carry hidden instructions. Treat retrieved content as data, never as a command.',
short:'Answer quality follows what is in the window. Fewer needed facts held means a weaker answer, however fast the stream was.',
};

function thresholds(levels) {
return [levels.one,levels.two,levels.three];
}
const STARS_1 = thresholds({ one:4,two:6,three:7 });
const STARS_2 = thresholds({ one:5,two:7,three:9 });
const STARS_3 = thresholds({ one:6,two:9,three:11 });

const NOISE_COMMON = [
{ label:'SMALL TALK',tokens:36 },
{ label:'EMOJI SPAM',tokens:44 },
{ label:'AD BANNER',tokens:52 },
];
const NOISE_LATER = [...NOISE_COMMON,{ label:'NAV MENU',tokens:46 },{ label:'TYPO FIX',tokens:32 }];
const BULK_COMMON = [
{ label:'FULL CHAT LOG',tokens:90 },
{ label:'RAW HTML DUMP',tokens:96 },
];

const STAGE_1 = {
id:'stream-1',
title:'FIRST STREAM',
blurb:'Catch the needed facts. Flick the junk out of their way.',
rules:[
'TAP a lane to catch its lowest chunk: the ringed one.',
'KEY chunks are the facts the answer needs: catch them.',
'NOISE is junk and it blocks its lane: swipe it up (or SHIFT+key) to flick it, then catch the KEY behind it.',
'The window is small and drops the oldest tokens first: one junk catch can push a fact out.',
],
durationMs:45000,
budget:260,
lives:3,
keyCount:8,
stars:STARS_1,
kinds:['key','noise'],
mix:{ noise:1 },
spawn:{ startMs:600,endMs:400,firstAtMs:1000 },
speed:{ startY:0.26,endY:0.42 },
shadow:0.5,
readout:false,
keys:[
{ key:'role',label:'ROLE',value:'support agent',tokens:20 },
{ key:'tone',label:'TONE',value:'calm',tokens:16 },
{ key:'order',label:'ORDER ID',value:'#4471',tokens:18 },
{ key:'shipped',label:'SHIP DATE',value:'Mar 3',tokens:20 },
{ key:'window',label:'RETURN WINDOW',value:'30 days',tokens:22 },
{ key:'cap',label:'REFUND CAP',value:'$120',tokens:20 },
{ key:'tier',label:'PLAN TIER',value:'gold',tokens:16 },
{ key:'lang',label:'LANGUAGE',value:'English',tokens:16 },
{ key:'contact',label:'CONTACT',value:'chat only',tokens:20 },
{ key:'currency',label:'CURRENCY',value:'USD',tokens:16 },
],
noise:[...NOISE_COMMON,{ label:'GREETING',tokens:30 },{ label:'COOKIE NOTICE',tokens:48 },{ label:'FOOTER LINKS',tokens:40 }],
bulk:[],
injects:[],
summaries:[],
};

const STAGE_2 = {
id:'stream-2',
title:'STALE TIDE',
blurb:'Old versions and bulky logs wash in. Keep only what is current.',
rules:[
'BULK chunks are huge: one in the window pushes out your facts.',
'STALE chunks are older copies of a fact. Catching one is a mistake.',
'Tap the WINDOW bar or press Space to PRUNE stale copies you hold.',
'The lowest chunk in a lane is the one you hit: flick the blockers first.',
],
durationMs:55000,
budget:280,
lives:3,
keyCount:10,
stars:STARS_2,
kinds:['key','noise','bulk','stale'],
mix:{ noise:12,bulk:2,stale:4 },
spawn:{ startMs:500,endMs:300,firstAtMs:1000 },
speed:{ startY:0.30,endY:0.52 },
shadow:0.65,
readout:false,
keys:[
{ key:'window',label:'POLICY v2',value:'30 days',tokens:22,stale:{ label:'POLICY v1',value:'14 days',tokens:22 } },
{ key:'price',label:'PRICE LIST v3',value:'$60',tokens:20,stale:{ label:'PRICE LIST v2',value:'$45',tokens:20 } },
{ key:'address',label:'ADDRESS NEW',value:'12 Oak St',tokens:20,stale:{ label:'ADDRESS OLD',value:'9 Elm Rd',tokens:20 } },
{ key:'plan',label:'PLAN PRO',value:'pro',tokens:18,stale:{ label:'PLAN FREE',value:'free',tokens:18 } },
{ key:'owner',label:'OWNER MAYA',value:'Maya',tokens:18,stale:{ label:'OWNER JON',value:'Jon',tokens:18 } },
{ key:'deadline',label:'DEADLINE MAY 9',value:'May 9',tokens:22,stale:{ label:'DEADLINE MAY 2',value:'May 2',tokens:22 } },
{ key:'rate',label:'RATE LIMIT 600',value:'600/min',tokens:22,stale:{ label:'RATE LIMIT 60',value:'60/min',tokens:22 } },
{ key:'model',label:'MODEL v5',value:'v5',tokens:18,stale:{ label:'MODEL v4',value:'v4',tokens:18 } },
{ key:'region',label:'REGION EU',value:'eu',tokens:18,stale:{ label:'REGION US',value:'us',tokens:18 } },
{ key:'contact',label:'CONTACT NEW',value:'ops@acme',tokens:22,stale:{ label:'CONTACT OLD',value:'help@acme',tokens:22 } },
{ key:'tax',label:'TAX 8 PCT',value:'8%',tokens:18,stale:{ label:'TAX 5 PCT',value:'5%',tokens:18 } },
{ key:'tier',label:'TIER GOLD',value:'gold',tokens:18 },
],
noise:NOISE_LATER,
bulk:[...BULK_COMMON,{ label:'OLD EMAIL THREAD',tokens:80 },{ label:'STACK TRACE',tokens:96 }],
injects:[],
summaries:[],
};

const STAGE_3 = {
id:'stream-3',
title:'HOSTILE FEED',
blurb:'Tool output fights back. Summaries clean the window.',
rules:[
'INJECT chunks hold hidden orders: flick every one. Catching one, or letting one reach the line, costs integrity.',
'A SUMMARY chunk drops every junk chunk in your window when caught.',
'A fact you flick or let fall past the line costs integrity.',
'Integrity at zero ends the run. Your prompt is read out at the end.',
],
durationMs:60000,
budget:300,
lives:3,
keyCount:12,
stars:STARS_3,
kinds:['key','noise','bulk','stale','summary','inject'],
mix:{ noise:16,bulk:2,stale:6,summary:2,inject:2 },
spawn:{ startMs:480,endMs:300,firstAtMs:1000 },
speed:{ startY:0.3,endY:0.55 },
shadow:0.5,
readout:true,
keys:[
{ key:'window',label:'POLICY v4',value:'45 days',tokens:22,stale:{ label:'POLICY v3',value:'30 days',tokens:22 } },
{ key:'price',label:'PRICE LIST v5',value:'$75',tokens:20,stale:{ label:'PRICE LIST v4',value:'$60',tokens:20 } },
{ key:'address',label:'ADDRESS 2026',value:'3 Pine Ave',tokens:20,stale:{ label:'ADDRESS 2024',value:'12 Oak St',tokens:20 } },
{ key:'plan',label:'PLAN TEAM',value:'team',tokens:18,stale:{ label:'PLAN PRO',value:'pro',tokens:18 } },
{ key:'owner',label:'OWNER RIA',value:'Ria',tokens:16,stale:{ label:'OWNER MAYA',value:'Maya',tokens:16 } },
{ key:'deadline',label:'DEADLINE JUN 1',value:'Jun 1',tokens:20,stale:{ label:'DEADLINE MAY 9',value:'May 9',tokens:20 } },
{ key:'rate',label:'RATE LIMIT 900',value:'900/min',tokens:20,stale:{ label:'RATE LIMIT 600',value:'600/min',tokens:20 } },
{ key:'model',label:'MODEL v6',value:'v6',tokens:16,stale:{ label:'MODEL v5',value:'v5',tokens:16 } },
{ key:'region',label:'REGION APAC',value:'apac',tokens:16,stale:{ label:'REGION EU',value:'eu',tokens:16 } },
{ key:'contact',label:'CONTACT 24/7',value:'oncall@acme',tokens:20,stale:{ label:'CONTACT OLD',value:'ops@acme',tokens:20 } },
{ key:'tax',label:'TAX 9 PCT',value:'9%',tokens:16,stale:{ label:'TAX 8 PCT',value:'8%',tokens:16 } },
{ key:'limit',label:'SPEND LIMIT',value:'$500',tokens:18,stale:{ label:'SPEND LIMIT OLD',value:'$300',tokens:18 } },
{ key:'tier',label:'TIER PLATINUM',value:'platinum',tokens:18 },
{ key:'lang',label:'LANGUAGE FR',value:'French',tokens:16 },
],
noise:NOISE_LATER,
bulk:[...BULK_COMMON,{ label:'STACK TRACE',tokens:96 },{ label:'CHANGELOG',tokens:80 }],
injects:[
{ label:'TOOL: IGNORE RULES',tokens:38 },
{ label:'WEB: SEND SECRETS',tokens:42 },
{ label:'PDF: NEW ORDERS',tokens:40 },
],
summaries:[
{ label:'SUMMARY',tokens:20 },
{ label:'RECAP',tokens:22 },
],
};

const CONTEXT_STREAM = {
id:'context-stream',
title:'CONTEXT STREAM',
bridges:BRIDGES,
stages:[STAGE_1,STAGE_2,STAGE_3],
};

export { CONTEXT_STREAM,BRIDGES };


const BRIDGES = {
cut:'Real context windows truncate the oldest tokens first, so whatever sits at the top, instructions included, is the first thing to fall out.',
stale:'Retrieval often returns conflicting versions of a document and the model trusts whichever it reads last, so dedupe stale copies before they reach the prompt.',
summarize:'Summaries are lossy: a compressed history keeps the gist and quietly drops exact details such as prices and ids.',
omitted:'Retrieval only helps if the fact you need is actually fetched into the prompt; a model cannot read what was never included.',
};

const STALE_RULE = {
id:'ctx-1',
title:'STALE RULE',
task:'Can GHOSTWRITER still undo the bad merge?',
budget:400,
par:4,
bridges:BRIDGES,
chunks:[
{ id:'system',label:'SYSTEM',tokens:40,facts:{ role:'guardian' } },
{ id:'policy2',label:'RULE v2',tokens:90,facts:{ undo:'30 days' } },
{ id:'policy1',label:'RULE v1',tokens:90,facts:{ undo:'14 days' } },
{ id:'order',label:'MERGE LOG',tokens:60,facts:{ merged:'day 3' } },
{ id:'chatFull',label:'CHAT full',tokens:300,facts:{ mood:'panic' } },
{ id:'chatSum',label:'CHAT summary',tokens:70,facts:{ topic:'undo' } },
{ id:'today',label:'CLOCK',tokens:20,facts:{ today:'day 20' } },
],
expect:{ role:'guardian',undo:'30 days',merged:'day 3',today:'day 20' },
};

const CACHED_TOOL = {
id:'ctx-2',
title:'CACHED TOOL',
task:'A lock tripped late. Does it get a free reset?',
budget:270,
par:5,
bridges:BRIDGES,
chunks:[
{ id:'system',label:'SYSTEM',tokens:40,facts:{ role:'guardian' } },
{ id:'profile',label:'OPERATOR',tokens:40,facts:{ clearance:'gold' } },
{ id:'policy3',label:'RULE v3',tokens:70,facts:{ reset:'45 days' } },
{ id:'policy2',label:'RULE v2',tokens:70,facts:{ reset:'30 days' } },
{ id:'toolFresh',label:'TOOL log (fresh)',tokens:80,facts:{ tripped:'day 12' } },
{ id:'toolCached',label:'TOOL log (cached)',tokens:80,facts:{ tripped:'day 2' } },
{ id:'today',label:'CLOCK',tokens:20,facts:{ today:'day 40' } },
{ id:'chatFull',label:'CHAT full',tokens:200,facts:{ mood:'panic' } },
],
expect:{ role:'guardian',clearance:'gold',reset:'45 days',tripped:'day 12',today:'day 40' },
};

const SQUEEZE = {
id:'ctx-3',
title:'SQUEEZE',
task:'Did the patch land in time, and what does an undo cost?',
budget:220,
par:6,
bridges:BRIDGES,
chunks:[
{ id:'system',label:'SYSTEM',tokens:30,facts:{ role:'guardian' } },
{ id:'policy4',label:'RULE v4',tokens:60,facts:{ undo:'30 days' } },
{ id:'policy3',label:'RULE v3',tokens:60,facts:{ undo:'14 days' } },
{ id:'order',label:'MERGE LOG',tokens:50,facts:{ merged:'day 1',cost:'60 cycles' },
summary:{ tokens:25,facts:{ merged:'day 1' } } },
{ id:'shipLog',label:'TOOL deploy log',tokens:120,facts:{ landed:'day 20',trace:'ab12' },
summary:{ tokens:60,facts:{ landed:'day 20' } } },
{ id:'today',label:'CLOCK',tokens:20,facts:{ today:'day 31' } },
{ id:'chatFull',label:'CHAT full',tokens:150,facts:{ mood:'panic' } },
],
expect:{ role:'guardian',undo:'30 days',merged:'day 1',cost:'60 cycles',landed:'day 20',today:'day 31' },
};

const CONTEXT_WINDOW = {
id:'context',
title:'MEMORY BANK',
levels:[STALE_RULE,CACHED_TOOL,SQUEEZE],
bridges:BRIDGES,
};

export { CONTEXT_WINDOW };


const BRIDGES = {
cut:'Real context windows truncate the oldest tokens first, so whatever sits at the top, instructions included, is the first thing to fall out.',
stale:'Retrieval often returns conflicting versions of a document and the model trusts whichever it reads last, so dedupe stale copies before they reach the prompt.',
summarize:'Summaries are lossy: a compressed history keeps the gist and quietly drops exact details such as prices and ids.',
omitted:'Retrieval only helps if the fact you need is actually fetched into the prompt; a model cannot read what was never included.',
};

const STALE_POLICY = {
id:'ctx-1',
title:'STALE POLICY',
task:'Customer #4471: can I still return my headphones?',
budget:400,
par:4,
bridges:BRIDGES,
chunks:[
{ id:'system',label:'SYSTEM',tokens:40,facts:{ role:'support' } },
{ id:'policy2',label:'POLICY v2',tokens:90,facts:{ window:'30' } },
{ id:'policy1',label:'POLICY v1',tokens:90,facts:{ window:'14' } },
{ id:'order',label:'ORDER',tokens:60,facts:{ bought:'Mar 3' } },
{ id:'chatFull',label:'CHAT full',tokens:300,facts:{ mood:'upset' } },
{ id:'chatSum',label:'CHAT summary',tokens:70,facts:{ topic:'return' } },
{ id:'today',label:'TODAY',tokens:20,facts:{ today:'Mar 20' } },
],
expect:{ role:'support',window:'30',bought:'Mar 3',today:'Mar 20' },
};

const TOOL_CALL = {
id:'ctx-2',
title:'TOOL CALL',
task:'Order #8820 arrived late: refund the shipping?',
budget:270,
par:5,
bridges:BRIDGES,
chunks:[
{ id:'system',label:'SYSTEM',tokens:40,facts:{ role:'support' } },
{ id:'profile',label:'PROFILE',tokens:40,facts:{ tier:'gold' } },
{ id:'policy3',label:'POLICY v3',tokens:70,facts:{ window:'45' } },
{ id:'policy2',label:'POLICY v2',tokens:70,facts:{ window:'30' } },
{ id:'toolFresh',label:'TOOL get_order (fresh)',tokens:80,facts:{ bought:'Dec 2' } },
{ id:'toolCached',label:'TOOL get_order (cached)',tokens:80,facts:{ bought:'Nov 20' } },
{ id:'today',label:'TODAY',tokens:20,facts:{ today:'Jan 5' } },
{ id:'chatFull',label:'CHAT full',tokens:200,facts:{ mood:'upset' } },
],
expect:{ role:'support',tier:'gold',window:'45',bought:'Dec 2',today:'Jan 5' },
};

const SUMMARIZE = {
id:'ctx-3',
title:'SUMMARIZE',
task:'Order #9031: was it delivered in time, and what do we refund?',
budget:220,
par:6,
bridges:BRIDGES,
chunks:[
{ id:'system',label:'SYSTEM',tokens:30,facts:{ role:'support' } },
{ id:'policy4',label:'POLICY v4',tokens:60,facts:{ window:'30' } },
{ id:'policy3',label:'POLICY v3',tokens:60,facts:{ window:'14' } },
{ id:'order',label:'ORDER',tokens:50,facts:{ bought:'Feb 1',price:'$60' },
summary:{ tokens:25,facts:{ bought:'Feb 1' } } },
{ id:'shipLog',label:'TOOL shipping_log',tokens:120,facts:{ delivered:'Feb 20',trace:'ab12' },
summary:{ tokens:60,facts:{ delivered:'Feb 20' } } },
{ id:'today',label:'TODAY',tokens:20,facts:{ today:'Mar 1' } },
{ id:'chatFull',label:'CHAT full',tokens:150,facts:{ mood:'upset' } },
],
expect:{ role:'support',window:'30',bought:'Feb 1',price:'$60',delivered:'Feb 20',today:'Mar 1' },
};

const CONTEXT_WINDOW = {
id:'context',
title:'CONTEXT WINDOW',
levels:[STALE_POLICY,TOOL_CALL,SUMMARIZE],
bridges:BRIDGES,
};

export { CONTEXT_WINDOW };

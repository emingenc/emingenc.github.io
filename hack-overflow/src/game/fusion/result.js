
const LIST_TITLE = 'MISTAKES';
const NO_WRONG = 'No wrong presses.';

function mistakeTally(kinds,names) {
const rows = [];
for (const kind of kinds) {
const row = rows.find((one) => one.kind === kind);
if (row) row.count += 1;
else rows.push({ kind,name:Object.hasOwn(names,kind) ? names[kind] :kind,count:1 });
}
return rows;
}
function factsOf(input) {
const { run,par,pay,hands } = input;
const facts = [{ label:'PRESSES',value:run.moves },{ label:'PAR',value:par },{ label:'WRONG',value:run.wrong },{ label:'RANK',value:pay.paid === true ? '+' + pay.rank + ' R' :'paid' }];
if (Number.isFinite(hands.called) && Number.isFinite(hands.machine)) facts.push({ label:'YOU CALLED',value:hands.called },{ label:'MACHINE DID',value:hands.machine });
return facts;
}
function listOf(rows) {
if (rows.length === 0) return [{ text:NO_WRONG,tone:'ok' }];
return rows.map((row) => ({ text:row.name + ' x' + row.count,tone:'bad' }));
}
function fusionCard({ id,title,run,par,bruteLabel,bruteCount,kinds,names,rank,paid,called,machine }) {
const atPar = run.moves <= par && run.wrong === 0;
const max = Math.max(run.moves,bruteCount);
return {
id,title,badge:atPar ? 'AT PAR' :'OVER PAR',tone:atPar ? 'good' :'warn',
facts:factsOf({ run,par,pay:{ rank,paid },hands:{ called,machine } }),
bars:[{ label:'YOU',value:run.moves,max,tone:atPar ? 'good' :'warn' },{ label:'BRUTE',value:bruteCount,max,tone:'bad' }],
listTitle:LIST_TITLE,list:listOf(mistakeTally(kinds,names)),note:bruteLabel,
actions:[{ id:'replay',label:atPar ? 'REPLAY' :'REPLAY FOR PAR',primary:!atPar },{ id:'done',label:'DONE',primary:atPar }],escapeId:'done',
};
}

export { mistakeTally,fusionCard };

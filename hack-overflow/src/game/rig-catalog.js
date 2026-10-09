const RIG_CATALOG = {
ledger:{
id:'ledger',title:'THE LEDGER',family:'hash',host:'rig',
labId:'ledger',
levels:['ledger-1','ledger-2','ledger-3'],
xp:{ 0:0,1:10,2:20,3:30 },
pitch:'pair packets that sum to the target',
guided:true,
},
context:{
id:'context',title:'MEMORY BANK',family:'safehouse',host:'lab',
labId:'context',
levels:['ctx-1','ctx-2','ctx-3'],
xp:{ 0:0,1:10,2:20,3:30 },
pitch:'choose what the model gets to remember',
guided:true,
},
forge:{
id:'forge',title:'THE CHECKPOINT',family:'hall',host:'forge',
labId:'forge',storyId:'harness-forge',
levels:['forge-1','forge-2','forge-3'],
pitch:'build the rules that stop a runaway agent',
guided:true,
},
stream:{
id:'stream',title:'THE INTAKE',family:'window',host:'stream',
labId:'context-stream',
levels:['stream-1','stream-2','stream-3'],
pitch:'REAL-TIME triage of a live context feed',
guided:false,
},
turret:{
id:'turret',title:'LOOKUP TURRET',family:'hash',host:'rig',
labId:'turret',
levels:['turret-1'],
rank:{ 0:0,1:10,2:20,3:30 },
pitch:'answer each drone with one look-up',
guided:false,
},
};
const STARS_PER_LEVEL = 3;
function rigOf(rigId) {
return Object.hasOwn(RIG_CATALOG,rigId) ? RIG_CATALOG[rigId] :null;
}
function rigStars(save,rigId) {
const rig = rigOf(rigId);
if (!rig) return null;
const record = Object.hasOwn(save.labs,rig.labId) ? save.labs[rig.labId] :{};
const bests = rig.levels.map((levelId) => (Object.hasOwn(record,levelId) ? record[levelId].best :0));
return {
cleared:bests.filter((best) => best > 0).length,
levels:rig.levels.length,
stars:bests.reduce((sum,best) => sum + best,0),
maxStars:rig.levels.length * STARS_PER_LEVEL,
};
}

export { RIG_CATALOG,rigOf,rigStars };


const LAB_ID = 'context-stream';
const NO_STARS = 0;

function levelsOf(save) {
return Object.hasOwn(save.labs,LAB_ID) ? save.labs[LAB_ID] :{};
}
function recordOf(save,stageId) {
const levels = levelsOf(save);
return Object.hasOwn(levels,stageId) ? levels[stageId] :null;
}
function xpFor(xpTable,stars) {
return Object.hasOwn(xpTable,stars) ? xpTable[stars] :0;
}
function nextRecord(before,stars,score) {
return {
best:Math.max(before ? before.best :0,stars),
clears:(before ? before.clears :0) + 1,
score:Math.max(before && before.score ? before.score :0,score),
};
}
function recordStream(save,result) {
const { stageId,stars,score,xpTable } = result;
const before = recordOf(save,stageId);
const bestBefore = before ? before.best :0;
if (stars <= NO_STARS) return { save,gained:0,improved:false,bestBefore };
const gained = Math.max(0,xpFor(xpTable,stars) - xpFor(xpTable,bestBefore));
const labs = { ...save.labs,[LAB_ID]:{ ...levelsOf(save),[stageId]:nextRecord(before,stars,score) } };
return { save:{ ...save,xp:save.xp + gained,labs },gained,improved:stars > bestBefore,bestBefore };
}

function allStagesCleared(save,stageIds) {
return stageIds.every(function (stageId) {
const record = recordOf(save,stageId);
return Boolean(record) && record.best > NO_STARS;
});
}

export { LAB_ID,recordStream,allStagesCleared };

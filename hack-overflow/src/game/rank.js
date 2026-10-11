const RANK_AT = Object.freeze(Object.values({ 1:0,2:30,3:70,4:120,5:180,6:250,7:330,8:420,9:520 }));
const RANK_HEARTS = Object.freeze(Object.values({ 1:0,2:0,3:1,4:1,5:2,6:2,7:3,8:3,9:4 }));

function rankLevel(points) {
const reached = RANK_AT.filter((need) => points >= need).length;
return Math.max(1,reached);
}
function rankHearts(level) {
return RANK_HEARTS[level - 1] ?? 0;
}
function nextAt(points) {
return RANK_AT[rankLevel(points)] ?? null;
}

export { RANK_AT,rankLevel,rankHearts,nextAt };

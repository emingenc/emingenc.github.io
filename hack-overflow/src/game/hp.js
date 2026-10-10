
const HP_MAX = 3;
const FIRST_HEART_ZAPS = 2;
const SECOND_HEART_ZAPS = 8;
const HEART_ZAPS = [FIRST_HEART_ZAPS,SECOND_HEART_ZAPS];

function maxHeartsFor(zaps) {
return HP_MAX + HEART_ZAPS.filter(function (need) { return zaps >= need; }).length;
}
function createHp(spawn,max = HP_MAX) {
return { hearts:max,max,doorway:{ col:spawn.col,row:spawn.row } };
}
function growHp(hp,max) {
return max > hp.max ? { ...hp,max,hearts:hp.hearts + max - hp.max } :hp;
}
function hurtHp(hp,dmg) {
const hearts = Math.max(0,hp.hearts - dmg);
return { hp:{ ...hp,hearts },down:hearts === 0 };
}
function passDoorway(hp,cell) {
return { ...hp,doorway:{ col:cell.col,row:cell.row } };
}
function reviveHp(hp) {
return { hp:{ ...hp,hearts:hp.max },pos:{ ...hp.doorway } };
}

export { HP_MAX, maxHeartsFor, createHp, growHp, hurtHp, passDoorway, reviveHp };

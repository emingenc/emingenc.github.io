import { rankHearts,rankLevel } from './rank.js';

const HP_MAX = 3;
const FIRST_HEART_ZAPS = 2;
const SECOND_HEART_ZAPS = 8;
const HEART_ZAPS = [FIRST_HEART_ZAPS,SECOND_HEART_ZAPS];
const HEARTS_CAP = 7;

function maxHeartsFor(zaps,level) {
const earned = HP_MAX + HEART_ZAPS.filter(function (need) { return zaps >= need; }).length;
return Math.min(HEARTS_CAP,earned + rankHearts(level));
}
function maxHeartsOf(ext) {
return ext ? maxHeartsFor(ext.zaps,ext.rank ? rankLevel(ext.rank.r) :undefined) :HP_MAX;
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

export { HP_MAX, maxHeartsFor, maxHeartsOf, createHp, growHp, hurtHp, passDoorway, reviveHp };

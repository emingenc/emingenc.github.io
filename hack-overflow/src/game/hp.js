
const HP_MAX = 3;

function createHp(spawn) {
return { hearts:HP_MAX,max:HP_MAX,doorway:{ col:spawn.col,row:spawn.row } };
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

export { HP_MAX, createHp, hurtHp, passDoorway, reviveHp };

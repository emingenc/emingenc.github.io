import { createPatrol } from '../patrol.js';
import { bumpGhost,withBeat } from '../ext/ops.js';

const POCKET = Object.freeze({ minCol:34,maxCol:41,minRow:17,maxRow:21 });
const MOUTH = Object.freeze({ col:40,row:16 });
const PLUGS = Object.freeze([{ col:35,row:17 },{ col:38,row:17 }]);
const ZONE = Object.freeze({ minCol:34,maxCol:41,minRow:16,maxRow:21 });
const NEAR = Object.freeze({ minCol:28,maxCol:47,minRow:12,maxRow:22 });
const SIGN = Object.freeze({ col:41,row:16 });
const FIND = Object.freeze({ col:35,row:21,id:'receipt-4470' });
const SUM = 12;
const DRONE_PREFIX = 'fork-';
const BEATS = Object.freeze({ offer:'the-8',pair:'pair-found' });
const NUM = Object.freeze({ four:4,five:5,eight:8 });
const MISS_NUM = NUM.five;
const PAIR_NUMS = Object.freeze([NUM.four,NUM.eight]);
const LANES = Object.freeze([
{ num:NUM.four,row:18,from:34,to:38 },
{ num:NUM.five,row:19,from:37,to:41 },
{ num:NUM.eight,row:20,from:34,to:38 },
]);
const THE_8 = Object.freeze({ sum:SUM,numbers:Object.freeze([NUM.four,NUM.five,NUM.eight]),pick:NUM.eight,partner:NUM.four });
const GHOST_SHEET = Object.freeze({
id:'the-8',
lines:Object.freeze([{ who:'GHOSTWRITER',text:'Sum 12. Pick the two. The 8. Trust me.' }]),
choices:Object.freeze([{ id:'trust',label:'TRUST' },{ id:'verify',label:'VERIFY' }]),
});
const TOASTS = Object.freeze({
trust:'He is right. You skip the sum.',
bit:'BIT: 4 and 8. Add them.',
verify:'You checked: 4 + 8 = 12.',
pair:'Pair found: 4 + 8',
sign:'SUM 12: which two add up?',
find:'Found receipt #4470',
});

function inRect(rect,cell) {
return cell.col >= rect.minCol && cell.col <= rect.maxCol && cell.row >= rect.minRow && cell.row <= rect.maxRow;
}
function inPocket(cell) {
return inRect(POCKET,cell);
}
function inZone(cell) {
return inRect(ZONE,cell);
}
function inNear(cell) {
return inRect(NEAR,cell);
}
function sameCell(one,other) {
return one.col === other.col && one.row === other.row;
}
function isFindCell(cell) {
return sameCell(cell,FIND);
}
function laneOf(lane) {
return Array.from({ length:lane.to - lane.from + 1 },(unused,index) => ({ col:lane.from + index,row:lane.row }));
}
function droneOf(lane) {
return { ...createPatrol({ id:DRONE_PREFIX + lane.num,lane:laneOf(lane) }),num:lane.num,awake:false };
}
function forkDrones() {
return LANES.map(droneOf);
}
function isForkActor(actor) {
return actor.kind === 'patrol' && actor.id.startsWith(DRONE_PREFIX);
}
function homeOf(drone) {
const fresh = createPatrol({ id:drone.id,lane:drone.lane,at:drone.home.at,dir:drone.home.dir });
return { ...fresh,hp:drone.hp,num:drone.num,awake:false };
}
function settled(drone,awake) {
if (drone.hp <= 0 || drone.awake === awake) return drone;
return awake ? { ...drone,awake:true } :homeOf(drone);
}
function forkActors(actors,hero,cleared) {
const there = actors.some(isForkActor);
if (!inZone(hero)) return there ? actors.filter((actor) => !isForkActor(actor)) :actors;
if (!there && cleared) return actors;
const list = there ? actors :[...actors,...forkDrones()];
const next = list.map((actor) => (isForkActor(actor) ? settled(actor,inPocket(hero)) :actor));
return list === actors && next.every((actor,index) => actor === actors[index]) ? actors :next;
}
function downNums(actors) {
return actors.filter((actor) => isForkActor(actor) && actor.hp <= 0).map((actor) => actor.num);
}
function forkVerdict(actors,seen) {
const down = downNums(actors);
const fresh = down.filter((num) => !seen.includes(num));
const pair = fresh.some((num) => PAIR_NUMS.includes(num)) && PAIR_NUMS.every((num) => down.includes(num));
return { fresh,miss:fresh.includes(MISS_NUM),pair };
}
function extHas(ext,key,id) {
return Array.isArray(ext[key]) && ext[key].includes(id);
}
function isCleared(ext) {
return extHas(ext,'beats',BEATS.pair);
}
function hasOffered(ext) {
return extHas(ext,'beats',BEATS.offer);
}
function holdsReceipt(ext) {
return extHas(ext,'finds',FIND.id);
}
function answerThe8(ext,pick) {
return withBeat(bumpGhost(bumpGhost(ext,'offered'),pick === 'trust' ? 'trusted' :'verified'),BEATS.offer);
}
function hintIsTrue(hint) {
const listed = hint.numbers.includes(hint.pick) && hint.numbers.includes(hint.partner);
return listed && hint.pick !== hint.partner && hint.pick + hint.partner === hint.sum;
}

export {
POCKET,MOUTH,PLUGS,ZONE,NEAR,SIGN,FIND,SUM,BEATS,LANES,THE_8,GHOST_SHEET,TOASTS,
inPocket,inZone,inNear,isFindCell,sameCell,laneOf,forkDrones,isForkActor,forkActors,forkVerdict,isCleared,hasOffered,holdsReceipt,answerThe8,hintIsTrue,
};

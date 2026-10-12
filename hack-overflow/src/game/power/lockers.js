import { hasFind,withFind } from '../ext/ops.js';

const GUARDS = Object.freeze({
armored:Object.freeze({ power:'lookup',reward:10,sealedLine:'Sealed. The armored mite still walks. TAG it.' }),
shield:Object.freeze({ power:'pincer',reward:15,sealedLine:'Sealed. The shield drone still holds. Crack it.' }),
});

function cell(spot) {
return Object.freeze({ col:spot.col,row:spot.row });
}
function cellsOf(spots) {
return Object.freeze(spots.map(cell));
}
function lockerOf(spec,guard,cells) {
 const rule = GUARDS[guard];
 return Object.freeze({
 id:spec.id,col:spec.at.col,row:spec.at.row,guard,power:rule.power,sector:spec.sector,
 ...cells,
 find:spec.id,reward:rule.reward,source:spec.id,line:spec.line,sealedLine:rule.sealedLine,
 });
}
function armoredLocker(spec) {
 const back = spec.path.slice(1,-1).reverse();
 return lockerOf(spec,'armored',{ drone:null,lane:Object.freeze([]),pocket:cellsOf(spec.path),ring:cellsOf([...spec.path,...back]) });
}
function shieldLocker(spec) {
 const drone = cell(spec.drone);
 const lane = cellsOf(spec.lane);
 return lockerOf(spec,'shield',{ drone,lane,pocket:Object.freeze([drone,...lane]),ring:Object.freeze([]) });
}

const LOCKERS = Object.freeze([
armoredLocker({
id:'lk-a1',at:{ col:49,row:21 },sector:'hash',line:'An index card. One key, one slot, no search.',
path:[{ col:50,row:20 },{ col:50,row:21 },{ col:51,row:21 }],
}),
armoredLocker({
id:'lk-a2',at:{ col:23,row:3 },sector:'two-pointers',line:'A bent ruler. Two ends, one sorted line.',
path:[{ col:24,row:2 },{ col:24,row:3 },{ col:25,row:3 }],
}),
armoredLocker({
id:'lk-a3',at:{ col:15,row:21 },sector:'stack',line:'A stack of notes. The last one in is read first.',
path:[{ col:15,row:19 },{ col:15,row:20 },{ col:14,row:20 },{ col:14,row:21 }],
}),
armoredLocker({
id:'lk-a4',at:{ col:43,row:6 },sector:'window',line:'A cracked pane. Slide it, keep what fits.',
path:[{ col:44,row:6 },{ col:44,row:7 },{ col:43,row:7 },{ col:43,row:8 }],
}),
shieldLocker({
id:'lk-s1',at:{ col:15,row:6 },sector:'binary-search',line:'A torn page. Each guess threw half the rest away.',
drone:{ col:15,row:8 },lane:[{ col:13,row:6 },{ col:14,row:6 },{ col:14,row:7 },{ col:15,row:7 }],
}),
shieldLocker({
id:'lk-s2',at:{ col:17,row:8 },sector:'two-pointers',line:'A shield tag. Sorted rows crack from both ends.',
drone:{ col:19,row:8 },lane:[{ col:17,row:6 },{ col:17,row:7 },{ col:18,row:7 },{ col:18,row:8 }],
}),
shieldLocker({
id:'lk-s3',at:{ col:57,row:21 },sector:'hash',line:'A sealed box. Every plate had its partner.',
drone:{ col:54,row:21 },lane:[{ col:55,row:20 },{ col:56,row:20 },{ col:56,row:21 },{ col:55,row:21 }],
}),
]);

function lockerById(id) {
return LOCKERS.find((locker) => locker.id === id) || null;
}
function lockerAt(at) {
return LOCKERS.find((locker) => locker.col === at.col && locker.row === at.row) || null;
}
function lockerCells() {
return LOCKERS.map((locker) => ({ col:locker.col,row:locker.row }));
}
function guardCells(id) {
const locker = lockerById(id);
return locker ? locker.pocket.map((one) => ({ col:one.col,row:one.row })) :[];
}
function pocketCells() {
return LOCKERS.flatMap((locker) => guardCells(locker.id));
}
function isSealed(ext,id) {
const locker = lockerById(id);
return locker !== null && !hasFind(ext,locker.find);
}
function sealedAt(ext,at) {
const locker = lockerAt(at);
return locker && isSealed(ext,locker.id) ? locker :null;
}
function lockersFor(power) {
return LOCKERS.filter((locker) => locker.power === power).map((locker) => locker.id);
}
function unspentLockers(ext) {
return LOCKERS.filter((locker) => isSealed(ext,locker.id)).map((locker) => locker.id);
}
function openLocker(ext,id) {
const locker = lockerById(id);
return locker ? withFind(ext,locker.find) :ext;
}

export { LOCKERS,guardCells,isSealed,lockerAt,lockerById,lockerCells,lockersFor,openLocker,pocketCells,sealedAt,unspentLockers };


const MAX_PRESSES = 4;
const LANE_ROWS = Object.freeze([
{ id:'lk-s1',plates:Object.values({ a:1,b:5,c:8,d:10,e:13 }),target:15 },
{ id:'lk-s2',plates:Object.values({ a:2,b:4,c:6,d:9,e:12,f:15 }),target:16 },
{ id:'lk-s3',plates:Object.values({ a:2,b:3,c:7,d:8,e:10,f:13 }),target:17 },
]);
const LANE_PUZZLES = Object.freeze(LANE_ROWS.map((row) => Object.freeze({ ...row,plates:Object.freeze(row.plates) })));
const LANE_TEXT = Object.freeze({
start:'A shield drone. Crack its armour with L> and <R.',
win:'Armour down. The locker opens.',
stand:'Drone left as it was.',
});

function puzzleFor(lockerId) {
return LANE_PUZZLES.find((puzzle) => puzzle.id === lockerId) || null;
}
function solveByTwoPointers(puzzle) {
const line = [];
let low = 0;
let high = puzzle.plates.length - 1;
while (low < high) {
const sum = puzzle.plates[low] + puzzle.plates[high];
if (sum === puzzle.target) return [...line,'fire'];
line.push(sum < puzzle.target ? 'l' :'r');
if (sum < puzzle.target) low += 1;
else high -= 1;
}
return null;
}
const SOLUTIONS = Object.freeze(Object.fromEntries(LANE_PUZZLES.map((puzzle) => [puzzle.id,Object.freeze(solveByTwoPointers(puzzle))])));

export { LANE_PUZZLES,LANE_TEXT,MAX_PRESSES,SOLUTIONS,puzzleFor,solveByTwoPointers };

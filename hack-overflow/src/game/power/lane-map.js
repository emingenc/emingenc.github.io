
const POCKET = Object.freeze({ minCol:36,maxCol:41,minRow:6,maxRow:8 });
const DOOR = Object.freeze([Object.freeze({ col:36,row:9 }),Object.freeze({ col:36,row:10 })]);
const LANE_ROW = 7;
const SILL_CELL = Object.freeze({ col:38,row:5 });
const SILL_APPROACH = Object.freeze({ col:38,row:6 });
const SHOT_COUNT = 6;
const SHOTS = Object.freeze(Array.from({ length:SHOT_COUNT },(unused,index) => Object.freeze({ col:POCKET.minCol + index,row:LANE_ROW })));

function inPocket(cell) {
return cell.col >= POCKET.minCol && cell.col <= POCKET.maxCol && cell.row >= POCKET.minRow && cell.row <= POCKET.maxRow;
}

export { POCKET as LANE_POCKET,DOOR as LANE_DOOR,LANE_ROW,SHOTS as LANE_SHOTS,SILL_CELL,SILL_APPROACH,inPocket };


function uiSpotOf(cell,frame) {
const left = (cell.col - frame.camera.col) * frame.tile;
const top = (cell.row - frame.camera.row) * frame.tile;
return left + frame.tile > 0 && top + frame.tile > 0 && left < frame.width && top < frame.height ? { left,top } :null;
}

export { uiSpotOf };

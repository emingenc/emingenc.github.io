
const PAD_ROW = 17;
const ROW_END = 31;
const MACHINES = Object.freeze([
Object.freeze({ id:'loop-pinch',name:'LOOP-PINCH',pad:Object.freeze({ col:17,row:PAD_ROW }),rowStart:Object.freeze({ col:25,row:PAD_ROW }),hold:Object.freeze({ col:28,row:PAD_ROW,from:17,to:ROW_END }) }),
Object.freeze({ id:'window-map',name:'WINDOW MAP',pad:Object.freeze({ col:19,row:PAD_ROW }),rowStart:Object.freeze({ col:25,row:PAD_ROW }),hold:Object.freeze({ col:28,row:PAD_ROW,from:19,to:ROW_END }) }),
Object.freeze({ id:'mono-deque',name:'MONO DEQUE',pad:Object.freeze({ col:21,row:PAD_ROW }),rowStart:Object.freeze({ col:22,row:PAD_ROW }),hold:Object.freeze({ col:26.5,row:PAD_ROW,from:21,to:ROW_END }) }),
]);

function machineAtPad(cell) {
return MACHINES.find((one) => one.pad.col === cell.col && one.pad.row === cell.row) || null;
}

export { PAD_ROW,MACHINES,machineAtPad };

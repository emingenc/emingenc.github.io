import { hasFind } from '../ext/ops.js';

const KEYCARD = 'keycard';
const LEDGE_3 = { id:'ledge-3',col:48,row:17 };
const UNREACHABLE_ON_FOOT = [{ col:LEDGE_3.col,row:LEDGE_3.row }];
const AMBUSH_FOES = ['s1','d1','d2'];
const VENTS = [
{ id:'vent-w',mouth:{ col:47,row:15 },from:{ col:46,row:15 },to:{ col:49,row:15 } },
{ id:'vent-e',mouth:{ col:48,row:15 },from:{ col:49,row:15 },to:{ col:46,row:15 } },
{ id:'vent-l',mouth:{ col:48,row:16 },from:{ col:48,row:17 },to:{ col:49,row:16 } },
];
const GRATE_TOAST = 'A vent grate. A keycard would open it.';
const KEYCARD_TOAST = 'Keycard. It opens the vents.';

function ventAt(cell) {
return VENTS.find((vent) => vent.mouth.col === cell.col && vent.mouth.row === cell.row) || null;
}
function canVent(ext,foesAlive) {
return hasFind(ext,KEYCARD) && foesAlive.length === 0;
}
function ventRefusal(ext,foesAlive) {
if (!hasFind(ext,KEYCARD)) return GRATE_TOAST;
return foesAlive.length > 0 ? 'Not with ' + foesAlive[0].name + ' awake. STAND DOWN or clear it.' :'';
}

export { AMBUSH_FOES,KEYCARD,KEYCARD_TOAST,LEDGE_3,UNREACHABLE_ON_FOOT,VENTS,canVent,ventAt,ventRefusal };

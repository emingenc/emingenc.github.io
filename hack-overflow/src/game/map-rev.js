const MAP_REV = 2;
const LEGACY_MAP_REV = 1;
const LEGACY_SHIFT_FROM_COL = 33;
const LEGACY_SHIFT_BY = 10;

function clampMapRev(value) {
if (!Number.isFinite(value)) return LEGACY_MAP_REV;
return Math.min(MAP_REV,Math.max(LEGACY_MAP_REV,Math.floor(value)));
}
function isWholeCell(pos) {
return typeof pos === 'object' && pos !== null && Number.isInteger(pos.col) && Number.isInteger(pos.row);
}
function shiftLegacyPos(mainRecord,rev) {
if (rev === MAP_REV || typeof mainRecord !== 'object' || mainRecord === null) return mainRecord;
const pos = mainRecord.pos;
if (!isWholeCell(pos) || pos.col < LEGACY_SHIFT_FROM_COL) return mainRecord;
return { ...mainRecord,pos:{ ...pos,col:pos.col + LEGACY_SHIFT_BY } };
}

export { MAP_REV, LEGACY_SHIFT_FROM_COL, LEGACY_SHIFT_BY, clampMapRev, shiftLegacyPos };

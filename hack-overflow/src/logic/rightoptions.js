import { canAppendChip, paletteIndicesFromChips, segmentIntoChips } from './line.js';

const acceptedIndicesCache = new WeakMap();
function chipsToIndices(problem,text) {
return paletteIndicesFromChips(segmentIntoChips(text,problem.palette),problem.palette);
}
function acceptedLinesFor(problem) {
if (!acceptedIndicesCache.has(problem)) {
acceptedIndicesCache.set(problem,problem.accepted.map((text) => chipsToIndices(problem,text)));
}
return acceptedIndicesCache.get(problem);
}
function isPrefixOf(prefix,full) {
return prefix.length <= full.length && prefix.every((value,index) => value === full[index]);
}
function hasAcceptedPrefix(line,acceptedLines) {
return acceptedLines.some((accepted) => isPrefixOf(line,accepted));
}
function isAcceptedLine(line,acceptedLines) {
return acceptedLines.some((accepted) => accepted.length === line.length && isPrefixOf(line,accepted));
}
function rightChipIds(line,tray,acceptedLines) {
const ids = [];
tray.order.forEach((paletteIndex,trayPosition) => {
if (hasAcceptedPrefix([...line,paletteIndex],acceptedLines)) ids.push(`chip-${trayPosition}`);
});
return ids;
}
function rightOptions(problem,tray,line) {
const acceptedLines = acceptedLinesFor(problem);
const options = canAppendChip(line) ? rightChipIds(line,tray,acceptedLines) :[];
if (isAcceptedLine(line,acceptedLines)) options.push('run','submit');
if (!hasAcceptedPrefix(line,acceptedLines)) options.push('backspace');
return options;
}

export { rightOptions };

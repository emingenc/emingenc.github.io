const MAX_LINE_CHIPS = 20;
function canAppendChip(line) {
return line.length < MAX_LINE_CHIPS;
}
function appendChip(line,paletteIndex) {
return canAppendChip(line) ? [...line,paletteIndex] :line;
}
function removeLastChip(line) {
return line.length === 0 ? line :line.slice(0,-1);
}
function clearLine() {
return [];
}
function removeChipAt(line,position) {
if (position < 0 || position >= line.length) return line;
return [...line.slice(0,position),...line.slice(position + 1)];
}
function lineTextFor(problem,line) {
return line.map((paletteIndex) => problem.palette[paletteIndex]).join(' ');
}
function longestMatchAt(text,position,chipsByLengthDesc) {
return chipsByLengthDesc.find((chip) => text.startsWith(chip,position)) || null;
}
function advancePastChip(text,position,chip) {
const afterChip = position + chip.length;
if (afterChip >= text.length) return afterChip;
return text[afterChip] === ' ' ? afterChip + 1 :null;
}
function segmentIntoChips(text,palette) {
const chipsByLengthDesc = [...palette].sort((left,right) => right.length - left.length);
const chips = [];
let position = 0;
while (position < text.length) {
const chip = longestMatchAt(text,position,chipsByLengthDesc);
if (!chip) return null;
chips.push(chip);
position = advancePastChip(text,position,chip);
if (position === null) return null;
}
return chips;
}
function paletteIndicesFromChips(chips,palette) {
return chips.map((chip) => palette.indexOf(chip));
}
function paletteIndicesFromText(text,palette) {
const chips = segmentIntoChips(text,palette);
return chips ? paletteIndicesFromChips(chips,palette) :null;
}

export { MAX_LINE_CHIPS, canAppendChip, appendChip, removeLastChip, clearLine, removeChipAt, lineTextFor, segmentIntoChips, paletteIndicesFromChips, paletteIndicesFromText };

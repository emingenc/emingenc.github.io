
const LINE_BEAT = 'line-open';
const DRONE_BEAT = 'line-drone';
const BOLT_BEAT_ID = 'bolt';

function beatsOf(ext) {
return ext && Array.isArray(ext.beats) ? ext.beats :[];
}
function isLine(ext) {
return beatsOf(ext).includes(LINE_BEAT);
}
function droneTold(ext) {
return beatsOf(ext).includes(DRONE_BEAT);
}
function lineQuiet(ext) {
return isLine(ext) && !beatsOf(ext).includes(BOLT_BEAT_ID);
}

function openingPlan(ext,facts) {
if (isLine(ext)) return facts.breached > 0 && !droneTold(ext) ? 'play' :'none';
if (ext.opening) return 'none';
return facts.breached > 0 ? 'signpost' :'play';
}

export { LINE_BEAT,DRONE_BEAT,isLine,droneTold,lineQuiet,openingPlan };

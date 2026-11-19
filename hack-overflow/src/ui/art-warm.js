import { tileSizeFor } from '../game/viewport.js';

const IDLE_TIMEOUT_MS = 500;
const SLICE_MIN_MS = 4;
const SLICE_FALLBACK_MS = 8;
const FALLBACK_DELAY_MS = 16;
const GUESS_ACCENTS = ['dim','primary','cyan','magenta','amber','bright'];

let uiAtlas = null;
let uiJob = null;
let uiScheduled = false;

function uiWarmStep(job,atlas,hasTime) {
let built = 0;
while (job.next < job.pairs.length && (built === 0 || hasTime())) {
const [name,accent] = job.pairs[job.next];
job.next += 1;
if (atlas.has(name)) atlas.canvas(name,{ accent,devicePx:job.devicePx });
built += 1;
}
return job.pairs.length - job.next;
}
function uiIdle(run) {
if (typeof window !== 'undefined' && window.requestIdleCallback) {
window.requestIdleCallback(run,{ timeout:IDLE_TIMEOUT_MS });
return;
}
const start = performance.now();
setTimeout(function () { run({ timeRemaining() { return SLICE_FALLBACK_MS - (performance.now() - start); } }); },FALLBACK_DELAY_MS);
}
function uiSlice(deadline) {
uiScheduled = false;
if (!uiAtlas || !uiJob) return;
const left = uiWarmStep(uiJob,uiAtlas,function () { return deadline.timeRemaining() > SLICE_MIN_MS; });
if (left > 0) uiSchedule();
}
function uiSchedule() {
if (uiScheduled || !uiAtlas || !uiJob) return;
uiScheduled = true;
uiIdle(uiSlice);
}
function uiGuessPairs(list) {
return list.flatMap(function (frame) { return frame.tint ? GUESS_ACCENTS.map(function (accent) { return [frame.name,accent]; }) :[[frame.name,GUESS_ACCENTS[0]]]; });
}
function uiWarmArt(request) {
uiJob = { ...request,next:0 };
uiSchedule();
}
function uiWarmAtlas(atlas) {
uiAtlas = atlas;
if (!uiJob) uiJob = { pairs:uiGuessPairs(atlas.list()),devicePx:Math.round(tileSizeFor(window.innerWidth) * (window.devicePixelRatio || 1)),next:0 };
uiSchedule();
}

export { uiGuessPairs,uiWarmStep,uiWarmArt,uiWarmAtlas };

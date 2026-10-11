
const SHEET_MS = { arm:400,fresh:250,quiet:250,swallow:300 };
const SHEET_OVERLAY = '.story-overlay';
const SHEET_EVENTS = ['pointerdown','pointerup','pointercancel','click'];
const uiWiredDocuments = new WeakSet();

function sheetGuardShow(now) {
return { shownAt:now,lastDownAt:-Infinity,fresh:false };
}
function sheetGuardDown(guard,at) {
const fresh = at - guard.shownAt >= SHEET_MS.fresh && at - guard.lastDownAt >= SHEET_MS.quiet;
return { ...guard,lastDownAt:at,fresh };
}
function sheetGuardTap(guard,at) {
return { armed:guard.fresh && at - guard.shownAt >= SHEET_MS.arm,guard:{ ...guard,fresh:false } };
}
function sheetGuardPress(guard,at) {
return sheetGuardTap(sheetGuardDown(guard,at),at);
}
function sheetSwallows(closedAt,now) {
return now - closedAt < SHEET_MS.swallow;
}
function uiSheetInBox(event) {
return Boolean(event.target?.closest?.(SHEET_OVERLAY));
}
function uiSheetClick(story,event,now) {
const verdict = event.detail > 0 ? sheetGuardTap(story.guard,now) :sheetGuardPress(story.guard,now);
story.guard = verdict.guard;
if (!verdict.armed) event.stopPropagation();
}
function uiSheetEvent(app,event) {
const now = performance.now();
if ((event.type !== 'click' || event.detail !== 0) && sheetSwallows(app.sheetClosedAt,now)) {
event.stopPropagation();
return;
}
const story = app.story;
if (!story) return;
if (event.type === 'pointerdown') story.guard = sheetGuardDown(story.guard,now);
if (event.type === 'click' && uiSheetInBox(event)) uiSheetClick(story,event,now);
}
function uiSheetGuardWire(app) {
if (typeof document === 'undefined' || !document.addEventListener || uiWiredDocuments.has(document)) return;
uiWiredDocuments.add(document);
for (const type of SHEET_EVENTS) document.addEventListener(type,(event) => uiSheetEvent(app,event),true);
}

export { sheetGuardShow,sheetGuardDown,sheetGuardTap,sheetGuardPress,sheetSwallows,uiSheetGuardWire };

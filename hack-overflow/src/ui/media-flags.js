const UI_QUERIES = { reduced:'(prefers-reduced-motion: reduce)',coarse:'(pointer: coarse)' };
const uiLists = new Map();
let uiSeen = null;

function uiMatches(query) {
if (typeof window === 'undefined' || !window.matchMedia) return false;
if (window.matchMedia !== uiSeen) {
uiSeen = window.matchMedia;
uiLists.clear();
}
const cached = uiLists.get(query);
if (cached) return cached.matches;
const list = window.matchMedia(query);
if (list && typeof list.addEventListener === 'function') uiLists.set(query,list);
return Boolean(list && list.matches);
}
function uiReducedMotion() {
return uiMatches(UI_QUERIES.reduced);
}
function uiCoarsePointer() {
return uiMatches(UI_QUERIES.coarse);
}

export { uiReducedMotion,uiCoarsePointer };

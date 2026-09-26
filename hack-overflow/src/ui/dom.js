const UI_ROOT_ID = 'app';
const UI_LIVE_ID = 'live';
const UI_BADGE_ID = 'selftest-badge';
const UI_ANNOUNCE_DELAY_MS = 30;
function uiAppendChild(node,child) {
if (child === null || child === undefined) return;
node.appendChild(typeof child === 'string' ? document.createTextNode(child) :child);
}
function uiApplyAttrs(node,attrs) {
Object.keys(attrs).forEach(function (name) {
node.setAttribute(name,attrs[name]);
});
}
function uiApplyElOptions(node,options) {
if (options.className) node.className = options.className;
if (options.text !== undefined) node.textContent = options.text;
if (options.attrs) uiApplyAttrs(node,options.attrs);
if (options.children) options.children.forEach(function (child) { uiAppendChild(node,child); });
}
function uiEl(tag,options) {
const node = document.createElement(tag);
uiApplyElOptions(node,options || {});
return node;
}
function uiQs(id) {
return document.getElementById(id);
}
function uiClear(node) {
while (node.firstChild) node.removeChild(node.firstChild);
}
function uiMount(rootId,nodes) {
const root = uiQs(rootId);
uiClear(root);
nodes.forEach(function (node) { uiAppendChild(root,node); });
return root;
}
function uiAnnounce(message) {
const live = uiQs(UI_LIVE_ID);
if (!live) return;
live.textContent = '';
window.setTimeout(function () { live.textContent = message; },UI_ANNOUNCE_DELAY_MS);
}
function uiFindByFocusKey(root,key) {
if (!key) return null;
const node = root.querySelector('[data-focus-key="' + key + '"]');
return node && !node.disabled ? node :null;
}
function uiRestoreFocus(root,key,fallback) {
const node = uiFindByFocusKey(root,key) || fallback || root;
if (node && typeof node.focus === 'function') node.focus();
}
function uiLeetcodeLink(slug,text) {
return uiEl('a',{
className:'solve-link',
text:text,
attrs:{ href:'https://leetcode.com/problems/' + slug + '/',target:'_blank',rel:'noopener noreferrer' },
});
}
function uiPointerIsCoarse() {
return window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
}
function uiPrefersReducedMotion() {
return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export { UI_ROOT_ID, UI_BADGE_ID, uiEl, uiQs, uiMount, uiAnnounce, uiFindByFocusKey, uiRestoreFocus, uiLeetcodeLink, uiPointerIsCoarse, uiPrefersReducedMotion };

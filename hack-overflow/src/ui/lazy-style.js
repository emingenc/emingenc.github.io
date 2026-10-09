const UI_LINKED = new Map();

function uiHasDom() {
return typeof document !== 'undefined' && !!document.head;
}
function uiAddLink(href,done) {
const link = document.createElement('link');
link.rel = 'stylesheet';
link.href = href;
link.addEventListener('load',done);
link.addEventListener('error',done);
document.head.appendChild(link);
}
function uiLinkStyle(href) {
if (!uiHasDom()) return Promise.resolve();
if (!UI_LINKED.has(href)) UI_LINKED.set(href,new Promise(function (resolve) { uiAddLink(href,resolve); }));
return UI_LINKED.get(href);
}

export { uiLinkStyle };

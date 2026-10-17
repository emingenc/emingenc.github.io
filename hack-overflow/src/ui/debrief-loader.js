import { uiEl } from './dom.js';

const DEBRIEF_ID = 'debrief';
const FALLBACKS = { applyAction:false,sync:undefined };
let uiDebriefModule = null;
let uiDebriefDelegate = null;
let uiDebriefLoading = null;

function uiDebriefCall(hook,args) {
const real = uiDebriefDelegate && uiDebriefDelegate[hook];
return real ? real(...args) :FALLBACKS[hook];
}
function uiDebriefStubScreen() {
const stub = {
id:DEBRIEF_ID,
render:(app) => (uiDebriefDelegate ? uiDebriefDelegate.render(app) :uiEl('section',{ className:'screen screen-card debrief-screen',attrs:{ 'data-screen':DEBRIEF_ID } })),
focusKey:() => 'debrief-continue',
announce:(app) => (uiDebriefDelegate ? uiDebriefDelegate.announce(app) :'Debrief loading.'),
};
Object.keys(FALLBACKS).forEach(function (hook) {
stub[hook] = function (...args) { return uiDebriefCall(hook,args); };
});
return stub;
}
function uiPrefetchDebrief() {
uiDebriefLoading ||= import('./screen-debrief.js').then(function (mod) {
uiDebriefModule = mod;
uiDebriefDelegate = mod.uiDebriefScreen();
return mod;
},function (error) {
uiDebriefLoading = null;
throw error;
});
return uiDebriefLoading;
}
function uiOpenDebriefLoaded(app) {
if (uiDebriefModule) return uiDebriefModule.uiOpenDebrief(app);
return uiPrefetchDebrief().then(function (mod) { mod.uiOpenDebrief(app); });
}

export { uiDebriefStubScreen,uiPrefetchDebrief,uiOpenDebriefLoaded };

import { uiEl } from './dom.js';

const REVIEW_ID = 'review';
const FALLBACKS = { keyAction:null,keyUp:false,applyAction:false,sync:undefined,pointerDown:false,pointerUp:false,pointerCancel:false,release:undefined };
let uiReviewDelegate = null;
let uiReviewLoading = null;

function uiReviewCall(hook,args) {
const real = uiReviewDelegate && uiReviewDelegate[hook];
return real ? real(...args) :FALLBACKS[hook];
}
function uiReviewStubScreen() {
const stub = {
id:REVIEW_ID,
render:(app) => (uiReviewDelegate ? uiReviewDelegate.render(app) :uiEl('section',{ className:'screen screen-card review-screen',attrs:{ 'data-screen':REVIEW_ID } })),
focusKey:(app) => (uiReviewDelegate ? uiReviewDelegate.focusKey(app) :'review-back'),
announce:(app) => (uiReviewDelegate ? uiReviewDelegate.announce(app) :'REVIEW loading.'),
};
Object.keys(FALLBACKS).forEach(function (hook) {
stub[hook] = function (...args) { return uiReviewCall(hook,args); };
});
return stub;
}
async function uiLoadReview() {
try {
uiReviewLoading ||= import('./screen-review.js');
return await uiReviewLoading;
} catch (error) {
uiReviewLoading = null;
throw error;
}
}
async function uiOpenReview(app,spec) {
const mod = await uiLoadReview();
uiReviewDelegate = mod.uiReviewScreen();
await mod.uiReviewEnter(app,spec);
}

export { uiReviewStubScreen,uiOpenReview };

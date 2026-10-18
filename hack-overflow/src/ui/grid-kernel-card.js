import { uiRenderKeepingFocus } from './app.js';
import { UI_ROOT_ID,uiFindByFocusKey,uiQs } from './dom.js';
import { uiSeams } from './grid-kernel-common.js';
import { uiParked } from './grid-scene-strip.js';

const CONTINUE_ID = 'card-continue';
const FOCUS_KEY = 'kernel-chip-' + CONTINUE_ID;
const RESET_POLL_MS = 250;

function uiCardNumber(card) {
return Number.parseInt(card.head.slice(1),10);
}
function uiKernelCardView(card,onContinue) {
const [ask,tele,note] = card.lines;
return {
n:uiCardNumber(card),head:card.head,count:'',ask,tele,note,fiction:'',
chips:[{ id:CONTINUE_ID,label:'CONTINUE',aria:'Continue',run:onContinue }],
};
}
function uiCardGone(wait) {
return wait.app.game !== wait.game || wait.game.gen !== wait.gen;
}
function uiFocusContinue(app) {
const node = uiFindByFocusKey(uiQs(UI_ROOT_ID),FOCUS_KEY);
app.lastFocusKey = FOCUS_KEY;
if (node) node.focus({ preventScroll:true });
}
function uiCardFinish(wait) {
window.clearTimeout(wait.poll);
if (!uiCardGone(wait)) {
wait.ui.view = null;
uiRenderKeepingFocus(wait.app);
}
wait.resolve();
}
function uiCardTap(wait) {
if (uiCardGone(wait) || !uiParked(wait.app)) uiCardFinish(wait);
}
function uiCardWatch(wait) {
if (uiCardGone(wait)) uiCardFinish(wait);
else wait.poll = window.setTimeout(function () { uiCardWatch(wait); },RESET_POLL_MS);
}
function uiShowPhaseCard(app,card) {
const game = app.game;
const ui = game.kernelUi ?? uiSeams(app);
return new Promise(function (resolve) {
const wait = { app,game,gen:game.gen,ui,resolve,poll:0 };
const view = uiKernelCardView(card,function () { uiCardTap(wait); });
ui.view = () => view;
uiRenderKeepingFocus(app);
uiFocusContinue(app);
uiCardWatch(wait);
});
}

export { uiKernelCardView,uiShowPhaseCard };

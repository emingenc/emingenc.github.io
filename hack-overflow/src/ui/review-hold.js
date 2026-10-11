import { HOLD_MS } from '../game/finale/review.js';

const HOLDING = ' is-holding';

function createHold() {
return { timer:0,node:null };
}
function uiMarkHold(node,on) {
if (!node) return;
node.className = on ? node.className + HOLDING :node.className.replace(HOLDING,'');
}
function uiHoldEnd(hold) {
if (hold.timer) window.clearTimeout(hold.timer);
uiMarkHold(hold.node,false);
hold.timer = 0;
hold.node = null;
}
function uiHoldBegin(hold,node,done) {
if (hold.timer) return;
hold.node = node;
uiMarkHold(node,true);
hold.timer = window.setTimeout(function () {
uiHoldEnd(hold);
done();
},HOLD_MS);
}

export { createHold,uiHoldBegin,uiHoldEnd };

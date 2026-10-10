import { GAME_EVENT } from '../game/game-events.js';
import { isOpen } from '../game/world.js';
import { markSeen } from '../game/save.js';
import { drawnOpenness, isRevealing, newlyOpened, revealDone, revealText, revealableOnCamera, startBatch, wholeCellsOnCamera } from '../game/doors.js';
import { uiAnnounce, uiPrefersReducedMotion } from './dom.js';
import { uiEmit } from './bus.js';
import { uiCommitSave } from './game-state.js';
import { uiShowToast } from './grid-toast.js';

function uiEmitOpened(app,item) {
uiEmit(GAME_EVENT.GATE_OPEN,{ id:item.id,kind:item.kind,cells:item.cells });
if (item.kind === 'barrier') uiShowToast(app,{ text:revealText(item),kind:'reward',announced:true });
if (item.kind === 'kernel-door') uiEmit(GAME_EVENT.KERNEL_OPEN,{});
}
function uiDropReveal(game,id) {
if (!isRevealing(game.doorReveal,id)) return;
const starts = { ...game.doorReveal.starts };
delete starts[id];
game.doorReveal = { ...game.doorReveal,starts };
}
function uiSettleReveal(app,step) {
const game = app.game;
if (!isOpen(game.world,game.progress,step.item.id)) return;
if (app.screen !== 'grid') {
uiDropReveal(game,step.item.id);
return;
}
uiEmitOpened(app,step.item);
if (step.announce) uiAnnounce(step.announce);
uiCommitSave(app,markSeen(game.save,[step.item.id]));
}
function uiStartBatch(app,items,now) {
const batch = startBatch(app.game.doorReveal,items,now);
if (uiPrefersReducedMotion()) {
batch.steps.forEach((step) => uiSettleReveal(app,step));
return;
}
app.game.doorReveal = batch.reveal;
batch.steps.forEach((step) => window.setTimeout(() => uiSettleReveal(app,step),Math.max(0,step.startAt - now)));
}
function uiRevealOnCamera(app,now) {
const game = app.game;
if (!game.view) return;
const range = wholeCellsOnCamera(game.view.camera,game.view);
const items = revealableOnCamera(newlyOpened(game.world,game.progress,game.save.seenOpen),range,game.doorReveal);
if (items.length > 0) uiStartBatch(app,items,now);
}
function uiDoorOpenness(app,id) {
const game = app.game;
const now = performance.now();
if (game.doorReveal && revealDone(game.doorReveal,now)) game.doorReveal = null;
const open = isOpen(game.world,game.progress,id);
if (open && !game.save.seenOpen.includes(id) && !isRevealing(game.doorReveal,id)) uiRevealOnCamera(app,now);
return drawnOpenness({ open,seen:game.save.seenOpen.includes(id),reveal:game.doorReveal,now },id);
}

export { uiDoorOpenness };

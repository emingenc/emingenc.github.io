import { trailAt } from '../game/cast/patch.js';
import { tapCellFor,tapIntent } from '../game/tap.js';
import { BEATS,withBeats } from '../game/finale/contract.js';
import { scanLabel } from '../game/finale/roadback-scan.js';
import {
  CHASE_REPEAT_MS,KERNEL_FRONT,REPLY_TOASTS,ROAD_TOASTS,TICK_MS,bruteGate,catcherOf,chaseIdle,chaseStep,createChase,createLookup,ghostTap,ghostToast,inRing,
  repeatDue,reunionSheet,
} from '../game/finale/roadback.js';
import { uiRenderKeepingFocus } from './app.js';
import { uiGridHook } from './bus.js';
import { uiCommitExt } from './ext-storage.js';
import { uiCastSay,uiCastSleep } from './grid-cast-act.js';
import { uiCastSync } from './grid-cast-sync.js';
import { uiKernelHurt,uiSetRevive } from './grid-kernel-hurt.js';
import { uiDropKernel } from './grid-kernel-chips.js';
import { uiCarryToFront,uiSay,uiSeams } from './grid-kernel-common.js';
import { uiScanHold,uiScanPainter } from './grid-roadback-scan.js';
import { uiStoryChoice } from './story-dialogue.js';

const SHEET_KIND = 'info';
const SEPARATOR = ' . ';
const CAUGHT_TOAST = 'ROOT: caught you. -1';

function uiParked(app) {
return Boolean(app.story) || app.screen !== 'grid' || Boolean(app.game.travelOpen);
}
function uiNotice(app,text) {
uiSay(app,text,'warn');
}
function uiEndChase(app) {
const road = app.game.roadback;
if (!road || !road.over) return;
const over = road.over;
road.over = null;
road.chase = null;
over();
}
function uiTrail(app,cell) {
const road = app.game.roadback;
const last = road.chase.trail.at(-1);
if (last.col !== cell.col || last.row !== cell.row) road.chase = chaseStep(road.chase,cell);
}
function uiOnStep(app,info) {
const road = app.game.roadback;
if (!road || !road.chase || info.app !== app) return;
road.moved = true;
road.ghost = null;
uiTrail(app,info.pos);
if (inRing(info.pos)) uiEndChase(app);
}
function uiCaught(app) {
const road = app.game.roadback;
uiNotice(app,CAUGHT_TOAST);
const blow = uiKernelHurt(app,catcherOf(road.chase));
if (blow.revived || inRing(app.game.avatar.pos)) return uiEndChase(app);
uiTrail(app,app.game.avatar.pos);
uiRenderKeepingFocus(app);
}
function uiClock(app) {
const road = app.game.roadback;
if (uiParked(app)) return;
if (road.moved) { road.moved = false; return; }
const idle = chaseIdle(road.chase);
road.chase = idle.chase;
if (idle.caught) uiCaught(app);
uiRenderKeepingFocus(app);
}
async function uiRunClock(app) {
const road = app.game.roadback;
while (road.over) {
await uiCastSleep(app,TICK_MS);
if (road.over) uiClock(app);
}
}
function uiChaseTaking(app,event) {
const road = app.game.roadback;
const state = app.game.touch;
if (!road || !road.chase || uiParked(app) || app.menuOpen || event.button > 0) return false;
return Boolean(state && app.game.view && state.node.contains(event.target));
}
function uiTappedCell(app,event) {
const canvas = app.game.stage ? app.game.stage.canvas :null;
const rect = (canvas || app.game.touch.node).getBoundingClientRect();
return tapCellFor(app.game.world,app.game.view,{ left:event.clientX - rect.left,top:event.clientY - rect.top });
}
function uiGhostTap(app,event) {
if (!uiChaseTaking(app,event)) return false;
const road = app.game.roadback;
const cell = uiTappedCell(app,event);
const from = app.game.avatar.pos;
const turn = ghostTap(road.ghost,{ from,cell,intent:tapIntent(app.game.world,app.game.progress,{ from,cell }) });
road.ghost = turn.ghost;
if (turn.action === 'walk') return false;
event.stopPropagation();
app.game.toast = null;
uiSay(app,ghostToast(turn.ghost.steps),'info');
uiRenderKeepingFocus(app);
return true;
}
function uiChase(app) {
const game = app.game;
if (inRing(game.avatar.pos)) return Promise.resolve();
return new Promise(function (resolve) {
const off = uiGridHook('enter-cell',(info) => uiOnStep(app,info));
const gen = game.gen;
const onTap = (event) => {
if (app.game !== game || game.gen !== gen) { document.removeEventListener('pointerup',onTap,true); return; }
uiGhostTap(app,event);
};
document.addEventListener('pointerup',onTap,true);
game.roadback = {
chase:createChase(game.avatar.pos),moved:false,ghost:null,repeatMs:CHASE_REPEAT_MS,repeatDue,keyAt:-Infinity,
over:() => { off(); document.removeEventListener('pointerup',onTap,true); resolve(); },
};
uiRunClock(app).catch(console.error);
});
}
function uiLookupView(chip) {
return { n:0,head:'ROAD BACK',count:'ROOT 0' + SEPARATOR + 'YOU 0',ask:'FIND patch-0',tele:'',note:'',fiction:'',chips:[chip] };
}
function uiLookupChip(scan) {
const label = scanLabel(scan);
return { id:'patch-0',label,aria:label };
}
function uiTap(app,ui,lookup,shown) {
const show = (scan,run) => {
shown.scan = scan;
ui.view = () => uiLookupView({ ...uiLookupChip(scan),run });
};
return uiScanHold(app,{ lookup,show,parked:() => uiParked(app) });
}
function uiHangFront(app,ui,shown) {
const base = ui.paint;
const paint = uiScanPainter(app,shown);
ui.paint = (ctx,frame) => { base(ctx,frame); paint(ctx,frame); };
}
async function uiFindPatch(app) {
const ui = uiSeams(app);
const shown = { scan:null };
uiHangFront(app,ui,shown);
uiSay(app,ROAD_TOASTS.door,'info');
const found = await uiTap(app,ui,createLookup(app.game.ext),shown);
uiSay(app,found.text,'reward');
uiDropKernel(app);
}
function uiPatchOnline(app) {
const game = app.game;
uiCommitExt(app,withBeats(game.ext,[BEATS.roadback]));
if (game.cast) uiCastSync(app);
if (game.cast && game.cast.role === 'follow') game.cast.trail = trailAt(game.avatar.pos);
uiRenderKeepingFocus(app);
}
async function uiReunion(app) {
const pick = await uiStoryChoice(app,reunionSheet());
await uiCastSay(app,{ text:REPLY_TOASTS[pick],kind:SHEET_KIND });
await uiCastSay(app,{ text:bruteGate(app.game.ext),kind:SHEET_KIND });
}
async function uiRoadBack(app) {
const game = app.game;
uiSetRevive(app,KERNEL_FRONT);
uiNotice(app,ROAD_TOASTS.system);
uiSeams(app);
await uiChase(app);
if (app.game !== game) return;
if (!inRing(game.avatar.pos)) uiCarryToFront(app);
await uiFindPatch(app);
uiPatchOnline(app);
await uiReunion(app);
uiSetRevive(app,null);
}

export { uiRoadBack,uiGhostTap };

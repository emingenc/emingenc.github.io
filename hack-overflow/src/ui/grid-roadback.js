import { trailAt } from '../game/cast/patch.js';
import { BEATS,withBeats } from '../game/finale/contract.js';
import {
  KERNEL_FRONT,REPLY_TOASTS,ROAD_TOASTS,TICK_MS,bruteGate,catcherOf,chaseIdle,chaseStep,createChase,createLookup,inRing,lookupStep,reunionSheet,
} from '../game/finale/roadback.js';
import { uiRenderKeepingFocus } from './app.js';
import { uiGridHook } from './bus.js';
import { uiCommitExt } from './ext-storage.js';
import { uiCastSay,uiCastSleep } from './grid-cast-act.js';
import { uiCastSync } from './grid-cast-sync.js';
import { uiKernelHurt,uiSetRevive } from './grid-kernel-hurt.js';
import { uiDropKernel } from './grid-kernel-chips.js';
import { uiCarryToFront,uiSay,uiSeams } from './grid-kernel-common.js';
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
function uiChase(app) {
const game = app.game;
if (inRing(game.avatar.pos)) return Promise.resolve();
return new Promise(function (resolve) {
const off = uiGridHook('enter-cell',(info) => uiOnStep(app,info));
game.roadback = { chase:createChase(game.avatar.pos),moved:false,over:() => { off(); resolve(); } };
uiRunClock(app).catch(console.error);
});
}
function uiLookupView(chip) {
return { n:0,head:'ROAD BACK',count:'ROOT 0' + SEPARATOR + 'YOU 0',ask:'FIND patch-0',tele:'',note:'',fiction:'',chips:[chip] };
}
function uiLookupChip(lookup) {
const label = lookup.tagged ? 'RECALL patch-0' : 'SCAN ' + (lookup.step + 1) + '/' + lookup.steps;
return { id:'patch-0',label,aria:label };
}
function uiTap(app,ui,chip) {
return new Promise(function (resolve) {
ui.view = () => uiLookupView({ ...chip,run:() => { if (!uiParked(app)) resolve(); } });
uiRenderKeepingFocus(app);
});
}
async function uiFindPatch(app) {
const ui = uiSeams(app);
let lookup = createLookup(app.game.ext);
uiSay(app,ROAD_TOASTS.door,'info');
for (let found = false; !found;) {
await uiTap(app,ui,uiLookupChip(lookup));
const step = lookupStep(lookup);
lookup = step.lookup;
found = step.found;
uiSay(app,step.text,found ? 'reward' :'info');
}
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
await uiChase(app);
if (app.game !== game) return;
if (!inRing(game.avatar.pos)) uiCarryToFront(app);
await uiFindPatch(app);
uiPatchOnline(app);
await uiReunion(app);
uiSetRevive(app,null);
}

export { uiRoadBack };

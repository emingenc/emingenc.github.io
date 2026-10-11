import { CHECKED_TOAST,DRAG_TOAST,SCAN_TOAST } from '../game/cast/bit.js';
import { WARP_CELL } from '../game/cast/patch.js';
import { PICKS,REFUSAL_BEAT,REACH,SENTINEL_CELL,SHEET,nearSentinel,refusalDue,withFirstPick } from '../game/cast/refusal.js';
import { withBeat } from '../game/ext/ops.js';
import { knockbackCell } from '../game/actors.js';
import { uiCommitExt } from './ext-storage.js';
import { uiActorsTick,uiIsFreeFloor } from './grid-actors.js';
import { uiCastCarry,uiCastSay,uiCastSleep,uiCastStill } from './grid-cast-act.js';
import { uiSentinelOf,uiTelegraph } from './grid-cast-actors.js';
import { uiCastFacts,uiCastSync } from './grid-cast-sync.js';
import { uiPatchTalk } from './grid-cast-patch.js';
import { uiStoryChoice } from './story-dialogue.js';
import { uiWalkReleaseAll } from './grid-walk.js';

const WINDUP_SHOWN = 2;
const READ_MS = 700;
const HIT_TICK_MS = 450;
const HIT_TICKS_MAX = 6;
const BEFORE_WARP_MS = 500;
const WARP_FACING = 'up';
const FACING_SENTINEL = 'right';

function uiRefusalDue(app) {
const game = app.game;
const sentinel = uiSentinelOf(game);
const asking = Boolean(game.fork && game.fork.busy);
const free = !app.story && !game.opening && !game.cast.run && !game.travelOpen && !asking;
return free && Boolean(sentinel) && sentinel.hp > 0 && refusalDue(game.ext,uiCastFacts(app)) && nearSentinel(game.avatar.pos,REACH);
}
async function uiCheck(app) {
const game = app.game;
await uiCastSay(app,{ text:SCAN_TOAST,kind:'info' });
await uiCastSleep(app,READ_MS);
await uiCastSay(app,{ text:CHECKED_TOAST,kind:'reward' });
uiTelegraph(game,WINDUP_SHOWN);
const from = game.avatar.pos;
const back = knockbackCell((cell) => uiIsFreeFloor(game,cell),from,SENTINEL_CELL);
uiCastCarry(app,{ cell:back,facing:FACING_SENTINEL });
await uiCastStill(app);
await uiCastSleep(app,READ_MS);
}
async function uiGo(app) {
const game = app.game;
const sentinel = uiSentinelOf(game);
const beside = { col:sentinel.col - 1,row:sentinel.row };
if (game.avatar.pos.col !== beside.col || game.avatar.pos.row !== beside.row) uiCastCarry(app,{ cell:beside,facing:FACING_SENTINEL });
await uiCastStill(app);
for (let ticks = 0; ticks < HIT_TICKS_MAX; ticks += 1) {
await uiCastSleep(app,HIT_TICK_MS);
if (uiActorsTick(app)) return;
}
}
async function uiDrag(app) {
const game = app.game;
await uiCastSay(app,{ text:DRAG_TOAST,kind:'warn' });
await uiCastSleep(app,BEFORE_WARP_MS);
const fight = game.fight;
fight.hp = { ...fight.hp,hearts:fight.hp.max };
uiTelegraph(game,0);
uiCastCarry(app,{ cell:WARP_CELL,facing:WARP_FACING });
uiCommitExt(app,withBeat(game.ext,REFUSAL_BEAT));
uiCastSync(app);
await uiCastStill(app);
}
async function uiRunRefusal(app) {
const game = app.game;
if (!uiRefusalDue(app)) return;
game.cast.run = 'refusal';
try {
uiWalkReleaseAll(app);
game.walk.plan = null;
await uiCastStill(app);
const pick = await uiStoryChoice(app,SHEET);
uiCommitExt(app,withFirstPick(game.ext,pick));
if (pick === PICKS.check) await uiCheck(app);
else await uiGo(app);
await uiDrag(app);
} finally {
game.cast.run = null;
}
await uiPatchTalk(app);
}

export { uiRunRefusal,uiRefusalDue };

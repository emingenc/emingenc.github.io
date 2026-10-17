import { BOLT_BEAT,QUEST_ID,boltOwed,crateCellsOf,patchRole,propAt,solidProps } from '../game/cast/patch.js';
import { REFUSAL_BEAT } from '../game/cast/refusal.js';
import { STAGE } from '../game/quest/quests.js';
import { hasBeat,questState,withBeat } from '../game/ext/ops.js';
import { cellToward } from '../game/move.js';
import { isOpen } from '../game/world.js';
import { uiCommitExt } from './ext-storage.js';
import { uiSentinelOf,uiStandingCrates,uiSyncCrates,uiSyncSentinel,uiTeachKinds } from './grid-cast-actors.js';
import { uiDrawCast } from './grid-cast-draw.js';
import { uiDrawActors } from './grid-draw-actors.js';
import { uiPinQuest } from './quest-run.js';


function uiNewCast(world) {
return { inert:!world.barriers.sentry,role:'none',trail:null,broken:[],run:null };
}
function uiCastFacts(app) {
const game = app.game;
return { breached:game.progress.breached.size,barrierOpen:isOpen(game.world,game.progress,game.world.barriers.sentry.id) };
}
function uiSolids(game) {
const props = solidProps(game.cast.role,uiStandingCrates(game),crateCellsOf(game.ext));
const sentinel = uiSentinelOf(game);
return sentinel && sentinel.hp > 0 ? [...props,{ id:sentinel.id,col:sentinel.col,row:sentinel.row }] :props;
}
function uiCastGuard(app,dir) {
const game = app.game;
const prop = propAt(uiSolids(game),cellToward(game.avatar.pos,dir));
return prop ? { pos:{ ...game.avatar.pos },facing:dir,event:{ type:'bump',prop:prop.id } } :null;
}
function uiGiveBolt(app) {
const ext = app.game.ext;
const unpinned = hasBeat(ext,REFUSAL_BEAT) && questState(ext,QUEST_ID) === STAGE.unseen;
uiCommitExt(app,withBeat(ext,BOLT_BEAT));
if (unpinned) uiPinQuest(app,QUEST_ID).then(function () { uiCastSync(app); }).catch(console.error);
}
function uiCastSync(app) {
const game = app.game;
if (game.cast.inert) return;
const facts = uiCastFacts(app);
if (boltOwed(game.ext,facts)) uiGiveBolt(app);
game.cast.role = patchRole(game.ext,facts);
uiSyncSentinel(app,facts);
uiSyncCrates(app,game.cast.role === 'follow');
}
function uiStartCast(app) {
const game = app.game;
if (game.cast) return;
game.cast = uiNewCast(game.world);
if (game.cast.inert) return;
uiTeachKinds();
game.drawCast = uiDrawCast;
game.castGuard = uiCastGuard;
if (!game.drawActors) game.drawActors = uiDrawActors;
}

export { uiStartCast,uiCastSync,uiCastFacts };

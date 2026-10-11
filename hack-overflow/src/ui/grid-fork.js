import {
BEATS,SIGN,forkActors,forkVerdict,inNear,inPocket,isCleared,isFindCell,holdsReceipt,isForkActor,sameCell,
} from '../game/cast/fork.js';
import { TALLY_CELL } from '../game/cast/tally.js';
import { withBeat } from '../game/ext/ops.js';
import { cellToward } from '../game/move.js';
import { uiGridHook } from './bus.js';
import { uiCommitExt } from './ext-storage.js';
import { ensureFight } from './grid-actors.js';

let uiHooked = false;

function uiTalk() {
return import('./grid-fork-talk.js');
}
function uiForkPaint(game,hero) {
if (game.fork.paint || !inNear(hero)) return;
game.fork.paint = true;
import('./grid-fork-draw.js').then(function (draw) { game.drawFork = draw.uiDrawFork; });
}
function uiForkTell(app,verdict) {
if (verdict.pair) uiCommitExt(app,withBeat(app.game.ext,BEATS.pair));
const word = verdict.pair ? 'uiPairFound' :'uiPairMiss';
if (verdict.pair || verdict.miss) uiTalk().then(function (talk) { return talk[word](app); });
}
function uiForkDrones(app,hero) {
const game = app.game;
const fork = game.fork;
const actors = game.fight ? game.fight.actors :[];
const verdict = forkVerdict(actors,fork.seen);
fork.seen = [...fork.seen,...verdict.fresh];
uiForkTell(app,verdict);
const next = forkActors(actors,hero,isCleared(game.ext) || verdict.pair);
if (next !== actors) ensureFight(game).actors = next;
if (!next.some(isForkActor)) fork.seen = [];
}
function uiForkPlace(app,hero) {
const fork = app.game.fork;
const inside = inPocket(hero);
if (inside && !fork.inside) {
uiTalk().then(function (talk) { return talk.uiForkEnter(app); }).then(function (entered) { if (!entered) fork.inside = false; });
}
fork.inside = inside;
if (isFindCell(hero) && !holdsReceipt(app.game.ext)) uiTalk().then(function (talk) { talk.uiTakeReceipt(app); });
}
function uiForkSync(app) {
const game = app.game;
if (!game.fork || game.fork.inert) return;
const hero = game.avatar.pos;
uiForkPaint(game,hero);
uiForkDrones(app,hero);
uiForkPlace(app,hero);
}
function uiForkBump(payload) {
const game = payload.app.game;
if (!game.fork || game.fork.inert) return;
const target = cellToward(payload.pos,game.avatar.facing);
if (sameCell(target,SIGN)) uiTalk().then(function (talk) { return talk.uiSignBump(payload.app); });
else if (sameCell(target,TALLY_CELL)) uiTalk().then(function (talk) { return talk.uiTallyBump(payload.app); });
}
function uiHookFork() {
if (uiHooked) return;
uiHooked = true;
['step','tick','enter-cell'].forEach(function (name) { uiGridHook(name,function (payload) { uiForkSync(payload.app); }); });
uiGridHook('bump',uiForkBump);
}

function uiInstallFork(app) {
const game = app.game;
game.fork = game.fork ? { ...game.fork,busy:false } :{ inert:!game.world.barriers.sentry,busy:false,seen:[],inside:false,paint:false };
if (game.fork.inert) return app;
uiHookFork();
uiForkSync(app);
return app;
}

export { uiInstallFork,uiForkSync };

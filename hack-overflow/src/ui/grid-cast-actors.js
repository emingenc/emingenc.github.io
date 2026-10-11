import { registerActorKind } from '../game/actors.js';
import { CRATE_TOASTS,crateActors,commitActive } from '../game/cast/patch.js';
import { SENTINEL_CELL,SENTINEL_ID,SHOT_TOASTS,SHOW_RANGE,nearSentinel,sentinelDue } from '../game/cast/refusal.js';
import { createSentinel } from '../game/sentinel.js';
import { ensureFight,uiRegisterShotToasts } from './grid-actors.js';
import { uiRegisterCastPainters } from './grid-cast-draw.js';

const MITE_B = 'mite-b';
let uiKindsTaught = false;

function uiTeachKinds() {
if (uiKindsTaught) return;
uiKindsTaught = true;
registerActorKind('crate',{});
uiRegisterShotToasts('sentinel',SHOT_TOASTS);
uiRegisterShotToasts('crate',CRATE_TOASTS);
uiRegisterCastPainters();
}
function uiActorsOf(game) {
return game.fight ? game.fight.actors :[];
}
function uiKept(game,keep) {
game.fight.actors = uiActorsOf(game).filter(keep);
}
function uiHas(game,id) {
return uiActorsOf(game).some((actor) => actor.id === id);
}
function uiSentinelOf(game) {
return uiActorsOf(game).find((actor) => actor.id === SENTINEL_ID) || null;
}
function uiTakeMiteB(game) {
const fight = game.fight;
if (fight.mites) fight.mites = fight.mites.filter((mite) => mite.id !== MITE_B);
}
function uiSentinelWanted(app,facts) {
const game = app.game;
return sentinelDue(game.ext,facts) && Boolean(game.sentry) && !game.opening && nearSentinel(game.avatar.pos,SHOW_RANGE);
}
function uiStandSentinel(game) {
ensureFight(game);
if (!uiHas(game,SENTINEL_ID)) game.fight.actors = [...game.fight.actors,createSentinel({ id:SENTINEL_ID,...SENTINEL_CELL })];
uiTakeMiteB(game);
}
function uiClearSentinel(game) {
const here = uiSentinelOf(game);
if (here && here.hp > 0) uiKept(game,(actor) => actor.id !== SENTINEL_ID);
}
function uiSyncSentinel(app,facts) {
if (uiSentinelWanted(app,facts)) uiStandSentinel(app.game);
else uiClearSentinel(app.game);
}
function uiTelegraph(game,windup) {
game.fight.actors = uiActorsOf(game).map((actor) => (actor.id === SENTINEL_ID ? { ...actor,windup } :actor));
}
function uiStandCrates(game) {
ensureFight(game);
const missing = crateActors(game.cast.broken).filter((crate) => !uiHas(game,crate.id));
game.fight.actors = [...game.fight.actors,...missing];
}
function uiSyncCrates(app,follows) {
const game = app.game;
if (follows && commitActive(game.ext) && !game.opening) uiStandCrates(game);
else if (game.fight) uiKept(game,(actor) => actor.kind !== 'crate' || actor.hp <= 0);
}
function uiFreshBroken(game) {
const seen = game.cast.broken;
return uiActorsOf(game).filter((actor) => actor.kind === 'crate' && actor.hp <= 0 && !seen.includes(actor.id)).map((actor) => actor.id);
}
function uiStandingCrates(game) {
return uiActorsOf(game).filter((actor) => actor.kind === 'crate' && actor.hp > 0).map((actor) => actor.id);
}

export { uiTeachKinds,uiSentinelOf,uiSyncSentinel,uiTelegraph,uiSyncCrates,uiFreshBroken,uiStandingCrates };

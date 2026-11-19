import { actorIntent } from '../game/actors.js';
import { TRACER_FLIGHT_MS,awayUnit,headingOf,killEmissions,tierOf } from '../game/foe-motion.js';
import { mitesView } from '../game/mites.js';
import { uiDroneClock,uiNoteStrike,uiNotesOf } from './grid-drone-fx.js';
import { uiFloat } from './grid-floaters.js';
import { uiGridBurst } from './grid-draw-fx.js';
import { uiTrackFight } from './grid-foe-fx.js';
import { uiKickStage } from './grid-stage-shake.js';
import { uiSpeechTap } from './grid-speech.js';
import { uiStartReboot } from './grid-reboot.js';
import { uiFoeShot } from './shot-fx.js';

const FOE_KINDS = new Set(['drone','sentinel','crate','armored','mite']);
const DRONE = 'drone';
const MITE = 'mite';
const SENTINEL = 'sentinel';
const KILL_WORDS = { crate:'BROKEN' };
const KILL_WORD = 'DOWN';
const ZAP_WORD = '+1 ZAP';
const HEAL_WORD = 'HEALS +';
const MINUS = '−';
const CELL_CENTRE = 0.5;
const IMMINENT_TICKS = 1;
const COMBAT_LINES = [
/^(DRONE|MITE|ARMORED MITE|SENTINEL) DOWN$/,
/^CRATE BROKEN$/,
/^Drone hit\.$/,
/^ZAP! Armour cracked$/,
/^Hit\. It heals 1 per tick\.$/,
/^Hit\.$/,
/^(Drone hit|OUCH! A mite stung you|OUCH! You were hit)\. Hearts \d+ of \d+\.$/,
/^Rebooted at the last doorway\.$/,
];

const uiSeen = new WeakMap();
let uiSeed = 0;

function uiKindOf(actor) {
return actor.kind ?? DRONE;
}
function uiFoesOf(fight) {
const actors = fight.actors.filter(function (actor) { return FOE_KINDS.has(uiKindOf(actor)); });
return [...actors,...(fight.mites ? mitesView(fight.mites) :[])];
}
function uiImminent(foe,hero) {
if (foe.kind === MITE) return foe.hp > 0 && foe.next.col === hero.col && foe.next.row === hero.row;
const intent = actorIntent(foe);
return Boolean(intent) && intent.inTicks === IMMINENT_TICKS;
}
function uiThreats(foes,hero) {
return foes.filter(function (foe) { return uiImminent({ ...foe,kind:uiKindOf(foe) },hero); });
}
function uiHeroCell(app,frame) {
const pose = frame.avatar || app.game.avatar.pos;
return { col:pose.col,row:pose.row };
}
function uiSnapshot(app,view) {
const hero = app.game.avatar.pos;
const fight = view.fight;
const threats = uiThreats(view.foes,hero).map(function (foe) { return { id:foe.id,col:foe.col,row:foe.row,kind:uiKindOf(foe) }; });
return {
hearts:fight.hp.hearts,max:fight.hp.max,revives:fight.revives || 0,hero:{ col:hero.col,row:hero.row },
foes:new Map(view.foes.map(function (foe) { return [foe.id,{ kind:uiKindOf(foe),hp:foe.hp,col:foe.col,row:foe.row }]; })),
threats:threats.map(function (foe) { return foe.kind; }),strikers:threats,
};
}
function uiRaise(frame,cell,float) {
uiFloat(cell,{ atMs:frame.now,...float });
}
function uiBurstAt(frame,cell,emission) {
uiSeed += 1;
uiGridBurst({ seed:uiSeed,atMs:frame.now,origin:{ col:cell.col + CELL_CENTRE,row:cell.row + CELL_CENTRE },...emission });
}
function uiImpactAt(frame) {
return frame.now + TRACER_FLIGHT_MS;
}
function uiEmissionOf(spec,aim) {
const emission = { kind:spec.kind,count:spec.count,colors:spec.colors,atMs:aim.atMs + spec.afterMs,arc:spec.arc };
if (spec.aimed) emission.heading = headingOf(aim.away);
return emission;
}
function uiKillSparks(world,foe) {
const aim = { atMs:uiImpactAt(world.frame),away:awayUnit(foe,world.hero) };
killEmissions(foe.kind).forEach(function (spec) { uiBurstAt(world.frame,foe,uiEmissionOf(spec,aim)); });
const shake = tierOf(foe.kind).shake;
if (shake) uiKickStage(shake,aim.atMs);
}
function uiKillFx(world,foe) {
const frame = world.frame;
const atMs = uiImpactAt(frame);
uiDroneClock(world.notes,foe,frame.now).impactAt = atMs;
uiRaise(frame,foe,{ text:KILL_WORDS[foe.kind] || KILL_WORD,tone:'amber',atMs });
if (foe.kind === MITE) uiRaise(frame,foe,{ text:ZAP_WORD,tone:'cyan',atMs });
if (!frame.reducedMotion) uiKillSparks(world,foe);
}
function uiHurtFx(world,before,foe) {
const atMs = uiImpactAt(world.frame);
uiDroneClock(world.notes,foe,world.frame.now).hurtAt = atMs;
uiRaise(world.frame,foe,{ text:MINUS + (before.hp - foe.hp),tone:'bright',atMs });
}
function uiFoeFx(world,before,foe) {
if (foe.hp < before.hp) {
if (foe.hp === 0) uiKillFx(world,foe);
else uiHurtFx(world,before,foe);
} else if (foe.hp > before.hp && foe.kind === SENTINEL && foe.regen !== 0) {
uiRaise(world.frame,foe,{ text:HEAL_WORD + (foe.hp - before.hp),tone:'primary' });
}
}
function uiStruckBy(frame,change) {
const strikers = change.before.strikers;
uiNoteStrike(strikers.length === 0 ? null :awayUnit(strikers[0],change.hero));
strikers.forEach(function (foe) {
uiDroneClock(change.notes,foe,frame.now).struckAt = frame.now;
if (foe.kind !== MITE && !frame.reducedMotion) uiFoeShot(foe,change.hero);
});
}
function uiHeroFx(frame,change) {
const { before,fight } = change;
if ((fight.revives || 0) > before.revives) {
uiRaise(frame,before.hero,{ text:KILL_WORD,tone:'red' });
uiStartReboot(frame.now,before.threats[0] || null);
uiStruckBy(frame,change);
} else if (fight.hp.hearts < before.hearts) {
uiRaise(frame,change.hero,{ text:MINUS + (before.hearts - fight.hp.hearts),tone:'red' });
uiStruckBy(frame,change);
}
}
function uiWatchCombat(app,frame) {
if (!app.game.toastTap) app.game.toastTap = function (toast) { return uiCombatTap(app,toast) || uiSpeechTap(app,toast); };
const fight = app.game.fight;
if (!fight) return;
const view = { fight,foes:uiFoesOf(fight),notes:uiNotesOf(fight) };
view.foes.forEach(function (foe) { uiDroneClock(view.notes,foe,frame.now); });
uiTrackFight(fight,{ notes:view.notes,hero:app.game.avatar.pos });
const before = uiSeen.get(fight);
uiSeen.set(fight,uiSnapshot(app,view));
if (!before) return;
uiHeroFx(frame,{ before,fight,notes:view.notes,hero:uiHeroCell(app,frame) });
if ((fight.revives || 0) > before.revives) return;
const world = { frame,notes:view.notes,hero:app.game.avatar.pos };
view.foes.forEach(function (foe) {
const seen = before.foes.get(foe.id);
if (seen) uiFoeFx(world,seen,{ ...foe,kind:uiKindOf(foe) });
});
}
function uiCombatTap(app,toast) {
return app.screen === 'grid' && Boolean(app.game.drawActors) && COMBAT_LINES.some(function (line) { return line.test(toast.text); });
}

export { uiWatchCombat,uiCombatTap,COMBAT_LINES };

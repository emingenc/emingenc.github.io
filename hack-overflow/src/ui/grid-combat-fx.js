import { actorIntent } from '../game/actors.js';
import { mitesView } from '../game/mites.js';
import { uiFloat } from './grid-floaters.js';
import { uiGridBurst } from './grid-draw-fx.js';
import { uiSpeechTap } from './grid-speech.js';
import { uiStartReboot } from './grid-reboot.js';

const FOE_KINDS = new Set(['drone','sentinel','crate','armored','mite']);
const DRONE = 'drone';
const MITE = 'mite';
const SENTINEL = 'sentinel';
const KILL_WORDS = { crate:'BROKEN' };
const KILL_WORD = 'DOWN';
const ZAP_WORD = '+1 ZAP';
const HEAL_WORD = 'HEALS +';
const MINUS = '−';
const SPARKS = { kind:'spark',count:12,colors:['amber','bright'] };
const RING = { kind:'pop',colors:['amber'] };
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
return foes.filter(function (foe) { return uiImminent({ ...foe,kind:uiKindOf(foe) },hero); }).map(uiKindOf);
}
function uiHeroCell(app,frame) {
const pose = frame.avatar || app.game.avatar.pos;
return { col:pose.col,row:pose.row };
}
function uiSnapshot(app,fight) {
const foes = uiFoesOf(fight);
const hero = app.game.avatar.pos;
return {
hearts:fight.hp.hearts,max:fight.hp.max,revives:fight.revives || 0,hero:{ col:hero.col,row:hero.row },
foes:new Map(foes.map(function (foe) { return [foe.id,{ kind:uiKindOf(foe),hp:foe.hp,col:foe.col,row:foe.row }]; })),
threats:uiThreats(foes,hero),
};
}
function uiRaise(frame,cell,float) {
uiFloat(cell,{ atMs:frame.now,...float });
}
function uiBurstAt(frame,cell,emission) {
uiSeed += 1;
uiGridBurst({ seed:uiSeed,atMs:frame.now,origin:{ col:cell.col + CELL_CENTRE,row:cell.row + CELL_CENTRE },...emission });
}
function uiKillFx(frame,foe) {
uiRaise(frame,foe,{ text:KILL_WORDS[foe.kind] || KILL_WORD,tone:'amber' });
if (foe.kind === MITE) uiRaise(frame,foe,{ text:ZAP_WORD,tone:'cyan' });
if (frame.reducedMotion) return;
uiBurstAt(frame,foe,RING);
if (foe.kind === MITE) uiBurstAt(frame,foe,SPARKS);
}
function uiFoeFx(frame,before,foe) {
if (foe.hp < before.hp) {
if (foe.hp === 0) uiKillFx(frame,foe);
else uiRaise(frame,foe,{ text:MINUS + (before.hp - foe.hp),tone:'bright' });
} else if (foe.hp > before.hp && foe.kind === SENTINEL && foe.regen !== 0) {
uiRaise(frame,foe,{ text:HEAL_WORD + (foe.hp - before.hp),tone:'primary' });
}
}
function uiHeroFx(frame,change) {
const { before,fight } = change;
if ((fight.revives || 0) > before.revives) {
uiRaise(frame,before.hero,{ text:KILL_WORD,tone:'red' });
uiStartReboot(frame.now,before.threats[0] || null);
} else if (fight.hp.hearts < before.hearts) {
uiRaise(frame,change.hero,{ text:MINUS + (before.hearts - fight.hp.hearts),tone:'red' });
}
}
function uiWatchCombat(app,frame) {
if (!app.game.toastTap) app.game.toastTap = function (toast) { return uiCombatTap(app,toast) || uiSpeechTap(app,toast); };
const fight = app.game.fight;
if (!fight) return;
const before = uiSeen.get(fight);
uiSeen.set(fight,uiSnapshot(app,fight));
if (!before) return;
uiHeroFx(frame,{ before,fight,hero:uiHeroCell(app,frame) });
if ((fight.revives || 0) > before.revives) return;
uiFoesOf(fight).forEach(function (foe) {
const seen = before.foes.get(foe.id);
if (seen) uiFoeFx(frame,seen,{ ...foe,kind:uiKindOf(foe) });
});
}
function uiCombatTap(app,toast) {
return app.screen === 'grid' && Boolean(app.game.drawActors) && COMBAT_LINES.some(function (line) { return line.test(toast.text); });
}

export { uiWatchCombat,uiCombatTap,COMBAT_LINES };

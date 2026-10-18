import { trialsOf,tagsOf } from '../game/ext/power-ops.js';
import { ownedPowers,usablePowers } from '../game/power/powers.js';
import { createExt } from '../game/save-ext.js';
import { uiRenderKeepingFocus } from './app.js';
import { uiBootHeroAudio,uiCue } from './audio-wire.js';
import { uiGridHook } from './bus.js';
import { uiPowerStrip } from './grid-power-strip.js';
import { uiShowToast } from './grid-toast.js';
import { uiLinkStyle } from './lazy-style.js';

const STYLE_HREF = 'styles/lazy/grid-power.css';
const STRIP_HOLD_CELLS = 3;
const INTRO_TOAST = 'LOOKUP: tag it, then RECALL it. A tag is a key. Keys find things fast.';
const MODES = {
lookup:() => import('./grid-power-lookup.js'),
pincer:() => import('./grid-power-pincer.js'),
plate:() => import('./grid-power-plate.js'),
net:() => import('./grid-power-net.js'),
};
const LENT_IDS = ['pincer','plate','net'];
const MODE_EXPORTS = { lookup:'uiModeLookup',pincer:'uiModePincer',plate:'uiModePlate',net:'uiModeNet' };
const ENCOUNTERS = [
() => import('./grid-power-ambush.js'),
() => import('./grid-power-rift.js'),
() => import('./grid-power-bridge.js'),
() => import('./grid-power-lane.js'),
() => import('./grid-power-volley.js'),
() => import('./grid-ammo.js'),
() => import('./grid-locker.js'),
() => import('./grid-shield.js'),
() => import('./grid-power-pads.js'),
() => import('./grid-power-aim.js'),
() => import('./grid-flood.js'),
() => import('./grid-siege.js'),
() => import('./grid-chain.js'),
() => import('./grid-reward.js'),
() => import('./grid-loop-pinch.js'),
() => import('./grid-window-map.js'),
() => import('./grid-mono-deque.js'),
() => import('./grid-quests.js'),
];

function uiNewPower(game) {
return {
gen:game.gen,installed:false,aim:false,mode:'',tags:{},selected:null,pick:null,told:new Set(),modes:{},loading:{},spots:[],chips:[],taps:[],stripAt:null,
badge:(powerId) => uiBadge(game,powerId),
};
}
function uiPowerOf(game) {
if (!game.power || game.power.gen !== game.gen) game.power = uiNewPower(game);
return game.power;
}
function uiExtOf(game) {
return game.ext || createExt();
}
function uiBadge(game,powerId) {
const left = trialsOf(uiExtOf(game),powerId);
return !ownedPowers(game.progress.won).includes(powerId) && left > 0 ? left + ' left' :'';
}
function uiTrialsNote(game,activeId) {
const ids = LENT_IDS.filter((id) => id !== activeId && uiBadge(game,id));
return ids.map((id) => id.toUpperCase() + ' ' + uiBadge(game,id)).join(' . ');
}
function uiUsableIds(game) {
return usablePowers(game.progress.won,uiExtOf(game));
}
function uiReadyIds(game) {
const power = uiPowerOf(game);
return uiUsableIds(game).filter((id) => power.modes[id]);
}
function uiActiveMode(game) {
const power = uiPowerOf(game);
return power.mode && uiReadyIds(game).includes(power.mode) ? power.modes[power.mode] :null;
}
function uiPowerRefresh(app) {
if (app.screen === 'grid') uiRenderKeepingFocus(app);
}
function uiAddTagSpot(game,spots) {
uiPowerOf(game).spots.push(spots);
}
function uiAddChips(game,chips) {
uiPowerOf(game).chips.push(chips);
}
function uiAddTap(game,tap) {
uiPowerOf(game).taps.push(tap);
}
function uiAddGuard(game,guard) {
const inner = game.castGuard;
game.castGuard = (app,dir) => guard(app,dir) || (inner ? inner(app,dir) :null);
}
function uiTagSpots(app) {
return uiPowerOf(app.game).spots.flatMap((spots) => spots(app));
}
function uiTagIds(game) {
return Object.keys(uiPowerOf(game).tags);
}
function uiCellOf(text) {
const [col,row] = text.split(',').map(Number);
return { col,row };
}
function uiSyncTags(game) {
const power = uiPowerOf(game);
Object.entries(tagsOf(uiExtOf(game))).forEach(([id,text]) => {
if (!power.tags[id]) power.tags[id] = { kind:'tile',...uiCellOf(text) };
});
}
function uiPrune(game) {
const power = uiPowerOf(game);
const live = new Set((game.fight ? game.fight.actors :[]).filter((actor) => actor.hp > 0).map((actor) => actor.id));
Object.keys(power.tags).filter((id) => power.tags[id].kind === 'foe' && !live.has(id)).forEach((id) => { delete power.tags[id]; });
if (!power.tags[power.selected]) power.selected = Object.keys(power.tags).pop() || null;
}
function uiModeOff(game) {
Object.assign(uiPowerOf(game),{ mode:'',aim:false,pick:null });
}
function uiModeOn(game,powerId) {
const power = uiPowerOf(game);
Object.assign(power,{ mode:powerId,aim:Boolean(power.modes[powerId].aim),pick:null });
}
function uiPowerPress(app) {
const game = app.game;
const power = uiPowerOf(game);
const ready = uiReadyIds(game);
const at = ready.indexOf(power.mode);
const next = ready[at + 1];
if (next) uiModeOn(game,next);
else uiModeOff(game);
uiPowerRefresh(app);
}
function uiPowerAct(app,run) {
if (app.story || app.game.travelOpen) return;
run(app);
}
const CHIP_RANK_RECALL = 1;
const CHIP_RANK_TAG = 2;
const CHIP_RANK_LAST = 3;
function uiChipRank(chip) {
return chip.rank || 0;
}
function uiStripChips(app) {
const game = app.game;
const mode = uiActiveMode(game) || uiPowerOf(game).modes[uiReadyIds(game)[0]];
const own = mode.chips ? mode.chips(app) :[];
return [...own,...uiPowerOf(game).chips.flatMap((chips) => chips(app) || [])].sort((first,second) => uiChipRank(first) - uiChipRank(second));
}
function uiStripPressable(app,mode) {
const game = app.game;
const power = uiPowerOf(game);
if (mode && mode.aim) return true;
if (Object.keys(power.tags).length > 0) return true;
if (power.chips.some((chips) => (chips(app) || []).length > 0)) return true;
return uiReadyIds(game).some((id) => power.modes[id].ready && power.modes[id].ready(app));
}
function uiStripWanted(app,mode) {
const power = uiPowerOf(app.game);
const pos = app.game.avatar && app.game.avatar.pos;
if (uiStripPressable(app,mode)) {
power.stripAt = pos ? { col:pos.col,row:pos.row } :null;
return true;
}
if (!power.stripAt || !pos) return false;
if (Math.max(Math.abs(pos.col - power.stripAt.col),Math.abs(pos.row - power.stripAt.row)) <= STRIP_HOLD_CELLS) return true;
power.stripAt = null;
return false;
}
function uiDrawPower(app) {
const game = app.game;
uiSyncModes(app);
const ready = uiReadyIds(game);
if (ready.length === 0) return null;
uiLinkStyle(STYLE_HREF);
uiSyncTags(game);
uiPrune(game);
const mode = uiActiveMode(game);
if (!mode) uiModeOff(game);
if (!uiStripWanted(app,mode)) return null;
return uiPowerStrip({
mode:mode ? mode.name :'',badge:mode ? uiPowerOf(game).badge(mode.id) :'',trials:uiTrialsNote(game,mode ? mode.id :''),chips:uiStripChips(app),
onPower:() => uiPowerAct(app,uiPowerPress),onChip:(chip) => uiPowerAct(app,chip.run),
});
}
function uiAimFire(app,dmg) {
const mode = uiActiveMode(app.game);
return Boolean(mode && mode.fire && mode.fire(app,dmg));
}
function uiAimTap(app,cell) {
if (uiPowerOf(app.game).taps.some((tap) => tap(app,cell))) return true;
const mode = uiActiveMode(app.game);
return Boolean(mode && mode.tap && mode.tap(app,cell));
}
function uiAimLabel(app) {
const mode = uiActiveMode(app.game);
return (mode && mode.aimLabel ? mode.aimLabel(app) :'') || '';
}
function uiHangSeams(app) {
const game = app.game;
game.drawPower = uiDrawPower;
game.aimFire = uiAimFire;
game.aimTap = uiAimTap;
Object.defineProperty(game,'aimLabel',{ configurable:true,enumerable:false,get:() => uiAimLabel(app) });
}
function uiTellIntro(app,powerId) {
const power = uiPowerOf(app.game);
if (powerId !== 'lookup' || power.told.has('intro')) return;
power.told.add('intro');
uiShowToast(app,{ text:INTRO_TOAST,kind:'info' });
}
function uiModeLoaded(app,powerId,module) {
const game = app.game;
const power = uiPowerOf(game);
power.modes[powerId] = module[MODE_EXPORTS[powerId]](app) || false;
if (power.modes[powerId]) uiTellIntro(app,powerId);
uiPowerRefresh(app);
}
function uiSyncModes(app) {
const game = app.game;
const power = uiPowerOf(game);
const wanted = uiUsableIds(game).filter((id) => !(id in power.modes) && !power.loading[id]);
return Promise.all(wanted.map((id) => {
power.loading[id] = true;
return MODES[id]().then((module) => { if (uiPowerOf(game) === power) uiModeLoaded(app,id,module); }).catch(function () {});
}));
}
function uiRunInstallers(app,module) {
return Promise.all(Object.keys(module).filter((name) => name.startsWith('uiInstall')).map((name) => module[name](app)));
}
function uiInstallEncounters(app) {
return Promise.all(ENCOUNTERS.map((load) => load().then((module) => uiRunInstallers(app,module)).catch(console.error)));
}
function uiPowerEnter(game) {
const power = uiPowerOf(game);
uiModeOff(game);
Object.keys(power.tags).filter((id) => power.tags[id].kind === 'foe').forEach((id) => { delete power.tags[id]; });
}
async function uiEnterEncounters(app) {
const modules = await Promise.all(ENCOUNTERS.map((load) => load().catch(() => ({}))));
const calls = modules.flatMap((module) => Object.keys(module).filter((name) => /^ui\w*Enter\w*$/.test(name)).map((name) => module[name](app)));
await Promise.all(calls.map((call) => Promise.resolve(call).catch(console.error)));
}
function uiCueNewPower(app,power) {
const owned = ownedPowers(app.game.progress.won);
if (power.owned && owned.length > power.owned.length) uiCue(app,'POWER');
power.owned = owned;
}
async function uiInstallPower(app) {
const game = app.game;
const power = uiPowerOf(game);
uiCueNewPower(app,power);
uiBootHeroAudio(app);
if (uiUsableIds(game).length > 0) uiLinkStyle(STYLE_HREF);
uiHangSeams(app);
const first = !power.installed;
power.installed = true;
if (!first) uiPowerEnter(game);
uiSyncTags(game);
await import('./grid-cast.js');
if (first) await uiInstallEncounters(app);
await uiSyncModes(app);
await uiEnterEncounters(app);
}

function uiPowerSay(app,toast) {
uiShowToast(app,{ kind:'info',replace:true,...toast });
}
function uiHooksOnce(hooks) {
let hung = false;
return function () {
if (hung) return;
hung = true;
Object.entries(hooks).forEach(([name,fn]) => uiGridHook(name,fn));
};
}

export { CHIP_RANK_LAST,CHIP_RANK_RECALL,CHIP_RANK_TAG,uiActiveMode,uiAddTap,uiInstallPower,uiModeOff,uiPowerOf,uiPowerSay,uiHooksOnce,uiAddGuard,uiAddTagSpot,uiAddChips,uiTagSpots,uiTagIds,uiPowerRefresh,uiPrune };

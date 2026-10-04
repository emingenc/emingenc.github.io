import { hashStr } from '../logic/tray.js';
import { coreState, sectorLocksLeft } from './progress.js';
import { rigOf, rigStars } from './rig-catalog.js';
import { encryptedHook } from './story/story.js';

const LOCK_SEED_SUFFIX = ':0:0';
const LOCK_ID_MASK = 0xffff;
const LOCK_ID_DIGITS = 4;
const HEX_RADIX = 16;
function lockName(key) {
const id = (hashStr(key + LOCK_SEED_SUFFIX) & LOCK_ID_MASK).toString(HEX_RADIX).toUpperCase();
return 'LOCK 0x' + id.padStart(LOCK_ID_DIGITS,'0');
}
function lockLabel(world,progress,key) {
if (!progress || !progress.breached.has(key)) return lockName(key);
const problem = world.problems[key];
return lockName(key) + ' · ' + problem.number + '. ' + problem.name;
}
function plural(count,word) {
return count + ' ' + word + (count === 1 ? '' :'s');
}
const PLACE_NAMES = { safehouse:'SAFEHOUSE',hall:'ENTRY HALL' };
function isPlace(family) {
return Object.hasOwn(PLACE_NAMES,family);
}
function sectorName(world,family) {
if (Object.hasOwn(world.sectors,family)) return world.sectors[family].name;
const encrypted = world.encrypted.find((entry) => entry.family === family);
if (encrypted) return encrypted.name;
return isPlace(family) ? PLACE_NAMES[family] :family;
}
function placePhrase(world,family) {
return (isPlace(family) ? 'the ' :'') + sectorName(world,family);
}
const NEED_TEXTS = {
breach:(world,need) => 'Breach ' + lockName(need.key),
level:(world,need) => 'Needs LV ' + need.level + ' (' + need.xpToGo + ' XP to go)',
all:(world,need) => 'Breach all ' + plural(world.placed.length,'lock') + ' (' + need.left + ' left)',
};
const BLOCKING_TEXTS = {
blocked:(world,event) => NEED_TEXTS[event.need.kind](world,event.need),
core:(world,event) => (event.ready ? '' :'CORE LOCKED: ' + plural(event.left,'lock') + ' left'),
encrypted:(world,event) => 'ENCRYPTED: ' + event.name + ' — ' + encryptedHook(event.family),
};
function blockedText(world,event) {
return Object.hasOwn(BLOCKING_TEXTS,event.type) ? BLOCKING_TEXTS[event.type](world,event) :'';
}
const CORE_NEAR_TEXTS = {
ready:(world,core,near) => near.actWord + ' claims it.',
sealed:(world,core,near) => 'Breach ' + plural(sectorLocksLeft(world,near.progress,core.family),'more lock') + ' to claim it.',
claimed:() => 'Already claimed.',
};
function coreNearText(world,core,near) {
const state = near.progress ? coreState(world,near.progress,core.family) :'ready';
return sectorName(world,core.family) + ' CORE ahead. ' + CORE_NEAR_TEXTS[state](world,core,near);
}
function rigNearText(world,thing,near) {
const rig = rigOf(thing.rig);
if (!rig) return '';
const done = near.save ? rigStars(near.save,rig.id) :null;
if (done && done.cleared > 0) return rig.title + ': ' + done.cleared + '/' + done.levels + ' cleared, ' + done.stars + '/' + done.maxStars + ' stars. ' + near.actWord + ' to replay.';
return rig.title + ': ' + rig.pitch + '. ' + near.actWord + ' plays it.';
}
function asSentence(clause) {
return clause.charAt(0).toUpperCase() + clause.slice(1) + '.';
}
function rigPlate(world,id,save = null) {
const thing = Object.hasOwn(world.things,id) ? world.things[id] :null;
const rig = thing && thing.kind === 'rig' ? rigOf(thing.rig) :null;
if (!rig) return null;
const done = save && save.labs ? rigStars(save,rig.id) :null;
if (!done || done.cleared === 0) return { rigId:rig.id,title:rig.title,line:asSentence(rig.pitch),verb:'PLAY' };
const line = done.cleared + '/' + done.levels + ' cleared · ' + done.stars + '/' + done.maxStars + ' stars';
return { rigId:rig.id,title:rig.title,line,verb:'REPLAY' };
}
const NEAR_TEXTS = {
terminal:(world,terminal,near) => lockLabel(world,near.progress,terminal.key) + ' ahead. ' + near.actWord + ' jacks in.',
core:coreNearText,
kernel:(world,kernel,near) => 'KERNEL ahead. ' + near.actWord + ' jacks in.',
rig:rigNearText,
};
function nearText(world,id,{ progress = null,actWord = 'Enter',save = null } = {}) {
const thing = Object.hasOwn(world.things,id) ? world.things[id] :null;
return thing && Object.hasOwn(NEAR_TEXTS,thing.kind) ? NEAR_TEXTS[thing.kind](world,thing,{ progress,actWord,save }) :'';
}
function listText(names) {
return names.length > 1 ? names.slice(0,-1).join(', ') + ' and ' + names.at(-1) :names.join('');
}
function unlockText(world,unlock) {
if (unlock.kind !== 'gates') return unlock.label + ': ' + unlock.detail;
return unlock.label + ': ' + listText(unlock.families.map((family) => sectorName(world,family))) + ' open';
}
function unlockHint(world,unlock) {
if (unlock.kind === 'gates') return unlock.families.map((family) => sectorName(world,family)).join(' + ') + ' gates';
if (unlock.kind === 'trace') return 'TRACE ' + unlock.capacity;
return unlock.label;
}
function nextUnlockText(world,next) {
if (!next) return '';
const label = next.unlocks.map((unlock) => unlockHint(world,unlock)).join(', ');
return 'LV' + next.level + ' · ' + label + ' in ' + next.xpToGo + ' XP';
}

export { lockName, lockLabel, sectorName, isPlace, placePhrase, blockedText, nearText, rigPlate, unlockText, nextUnlockText };

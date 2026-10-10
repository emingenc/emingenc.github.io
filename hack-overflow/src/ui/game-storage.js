import { MAP_REV,shiftLegacyPos } from '../game/map-rev.js';
import { barrierOpen,progressOf } from '../game/progress.js';
import { migrateV1, migrationNotice } from '../game/save-migrate.js';
import { createSave, markSeen, parseSave } from '../game/save.js';
import { uiClearExt } from './ext-storage.js';
import { uiLoadProfile, uiResetProgress } from './storage.js';

const UI_GRID_SAVE_KEY = 'ho-grid-v1';
function uiReadGameRaw() {
try {
return window.localStorage.getItem(UI_GRID_SAVE_KEY);
} catch (error) {
return null;
}
}
function uiLoadFreshGame(world) {
const { save,imported } = migrateV1(uiLoadProfile(),world);
return { save,notice:migrationNotice(imported) };
}
function uiParsedRaw(raw) {
try {
return JSON.parse(raw);
} catch (error) {
return null;
}
}
function uiLoadGame(world,{ mapRev = MAP_REV } = {}) {
const raw = uiReadGameRaw();
if (raw === null) return { ...uiLoadFreshGame(world),stored:false,shifted:false };
const record = uiParsedRaw(raw);
const moved = shiftLegacyPos(record,mapRev);
return { save:parseSave(moved,world),notice:null,stored:true,shifted:moved !== record };
}
function uiStoreGame(save) {
try {
window.localStorage.setItem(UI_GRID_SAVE_KEY,JSON.stringify(save));
} catch (error) {
return;
}
}
function uiCountKeys(record) {
return record && typeof record === 'object' ? Object.keys(record).length :0;
}
function uiHasGame() {
const data = uiParsedRaw(uiReadGameRaw());
if (!data || typeof data !== 'object') return false;
return data.xp > 0 || uiCountKeys(data.locks) > 0 || uiCountKeys(data.pending) > 0 || uiCountKeys(data.entries) > 0 || uiCountKeys(data.labs) > 0 || (Array.isArray(data.met) && data.met.length > 0);
}
function uiOpenBarrierIds(world,save) {
const progress = progressOf(world,save);
return Object.values(world.barriers).map((barrier) => barrier.id).filter((id) => barrierOpen(world,progress,world.things[id]));
}
function uiMigratedSave(world,loaded) {
const save = markSeen(loaded.save,uiOpenBarrierIds(world,loaded.save));
if (loaded.shifted || save.seenOpen.length > loaded.save.seenOpen.length) uiStoreGame(save);
return save;
}
function uiResetGame(world) {
const save = createSave(world);
uiStoreGame(save);
uiClearExt();
uiResetProgress();
return save;
}

export { uiLoadGame, uiMigratedSave, uiStoreGame, uiHasGame, uiResetGame };

import { migrateV1, migrationNotice } from '../game/save-migrate.js';
import { createSave, parseSave } from '../game/save.js';
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
function uiLoadGame(world) {
const raw = uiReadGameRaw();
return raw === null ? uiLoadFreshGame(world) :{ save:parseSave(raw,world),notice:null };
}
function uiStoreGame(save) {
try {
window.localStorage.setItem(UI_GRID_SAVE_KEY,JSON.stringify(save));
} catch (error) {
return;
}
}
function uiParsedRaw(raw) {
try {
return JSON.parse(raw);
} catch (error) {
return null;
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
function uiResetGame(world) {
const save = createSave(world);
uiStoreGame(save);
uiResetProgress();
return save;
}

export { uiLoadGame, uiStoreGame, uiHasGame, uiResetGame };

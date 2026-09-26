import { BUILD_PHASE, RESULT_PHASE } from '../logic/run-phase.js';

// Profile v1: every saved field lives in one JSON record under this key,
// replacing the prototype's four separate ho-proto-e-* keys. A record from
// any other key or version is ignored outright rather than migrated: losing
// the prototype's saves on upgrade is an accepted, deliberate trade-off.
const STORAGE_KEY = 'ho-oneliner-v1';
const STORAGE_VERSION = 1;
function emptyRecord() {
return { version:STORAGE_VERSION,profile:null,run:null,soundOn:true,onboarded:false };
}
function isCurrentRecord(record) {
return Boolean(record) && record.version === STORAGE_VERSION;
}
function loadRecord() {
try {
const raw = window.localStorage.getItem(STORAGE_KEY);
if (raw === null) return emptyRecord();
const parsed = JSON.parse(raw);
return isCurrentRecord(parsed) ? parsed :emptyRecord();
} catch (error) {
return emptyRecord();
}
}
function saveRecord(record) {
try {
window.localStorage.setItem(STORAGE_KEY,JSON.stringify(record));
} catch (error) {
return;
}
}
function withField(field,value) {
saveRecord({ ...loadRecord(),[field]:value });
}
function uiLoadProfile() {
return loadRecord().profile;
}
// The result screen reads the accepted SUBMIT's max-test numbers, so a run
// saved on that screen keeps lastSubmit; mid-build it is display-only.
function uiStripLockDisplay(lock,phase) {
const copy = Object.assign({},lock);
copy.lastRun = null;
if (phase !== RESULT_PHASE) copy.lastSubmit = null;
return copy;
}
function uiRunSnapshot(run) {
return Object.assign({},run,{ lock:run.lock ? uiStripLockDisplay(run.lock,run.phase) :null });
}
function uiSaveRun(run) {
saveRecord({ ...loadRecord(),run:uiRunSnapshot(run),profile:run.profile });
}
function uiLoadRun() {
return loadRecord().run;
}
function uiIsResumable(snapshot) {
return !!snapshot && (snapshot.phase === BUILD_PHASE || snapshot.phase === RESULT_PHASE);
}
function uiLoadSoundOn() {
return loadRecord().soundOn;
}
function uiSaveSoundOn(soundOn) {
withField('soundOn',soundOn);
}
function uiLoadOnboarded() {
return loadRecord().onboarded === true;
}
function uiMarkOnboarded() {
withField('onboarded',true);
}
function uiResetProgress() {
saveRecord({ ...emptyRecord(),soundOn:loadRecord().soundOn });
}

export { uiLoadProfile, uiSaveRun, uiLoadRun, uiIsResumable, uiLoadSoundOn, uiSaveSoundOn, uiLoadOnboarded, uiMarkOnboarded, uiResetProgress };

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

export { uiLoadProfile, uiLoadSoundOn, uiSaveSoundOn, uiLoadOnboarded, uiMarkOnboarded, uiResetProgress };

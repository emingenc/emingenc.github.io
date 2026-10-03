import { MAX_STARS_PER_LOCK } from '../logic/index.js';
import { uiAnnounce } from './dom.js';

const UI_ANNOUNCE_TEXT = {
BLOCKED:(payload) => payload.text,
NEAR:(payload) => payload.label,
TRACE:(payload) => 'TRACE ' + payload.filled + ' of ' + payload.capacity + '.',
TRACED:() => 'TRACED. Connection dropped.',
ACCEPTED:(payload) => 'ACCEPTED. ' + payload.stars + ' of ' + MAX_STARS_PER_LOCK + ' stars.',
LEVEL_UP:(payload) => 'Level up: LV ' + payload.after + '.',
CACHE:(payload) => 'Data cache: plus ' + payload.xp + ' XP.',
SECTOR_CLEAR:(payload) => 'Sector clear: ' + payload.name + '. Plus ' + payload.xp + ' XP.',
SHOW_LINE:() => 'Answer shown. This breach now pays 0 stars.',
};
function uiWireAnnounce(bus) {
Object.keys(UI_ANNOUNCE_TEXT).forEach(function (type) {
bus.on(type,function (payload) { uiAnnounce(UI_ANNOUNCE_TEXT[type](payload)); });
});
}

export { uiWireAnnounce };

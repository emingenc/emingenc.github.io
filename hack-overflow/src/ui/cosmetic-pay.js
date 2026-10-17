import { hasCosmetic,withCosmetic } from '../game/ext/badge-ops.js';
import { FIND_MARKS,cosmeticsDue } from '../game/cosmetics.js';
import { uiCommitExt } from './ext-storage.js';
import { uiShowToast } from './grid-toast.js';

const NAMES = Object.fromEntries(FIND_MARKS.map((mark) => [mark.id,mark.name]));

function uiWearLine(ids) {
return 'BIT wears the ' + ids.map((id) => NAMES[id]).join(' and the ');
}
function uiPayCosmetics(app) {
const due = cosmeticsDue(app.game.ext);
if (due.length === 0) return [];
const next = due.reduce(withCosmetic,app.game.ext);
uiCommitExt(app,next);
const worn = due.filter((id) => hasCosmetic(app.game.ext,id));
if (worn.length > 0) uiShowToast(app,{ text:uiWearLine(worn),kind:'reward' });
return worn;
}
function uiCosmeticEnter(app) {
uiPayCosmetics(app);
}
function uiCosmeticWatch(app) {
const game = app.game;
if (game.cosmeticTried === game.ext) return;
game.cosmeticTried = game.ext;
uiPayCosmetics(app);
}

export { uiCosmeticEnter,uiCosmeticWatch,uiPayCosmetics };

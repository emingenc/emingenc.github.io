import { GAME_EVENT } from '../game/game-events.js';
import { healHp } from '../game/heal.js';
import { uiRenderKeepingFocus } from './app.js';
import { uiGameBus } from './bus.js';
import { uiAnnounce } from './dom.js';
import { uiFloat } from './grid-floaters.js';

const HEALED_WORD = 'HEALED';
const HEALED_LINE = 'Healed. Hearts are full.';
const BED_REACH = 1;
let uiBound = null;
let uiHooked = false;

function uiHurt(game) {
return Boolean(game.fight) && game.fight.hp.hearts < game.fight.hp.max;
}
function uiAtBed(game,pos) {
const bed = game.world.spawn;
return Math.max(Math.abs(pos.col - bed.col),Math.abs(pos.row - bed.row)) <= BED_REACH;
}
function uiHeal(app) {
const game = app.game;
if (!uiHurt(game)) return;
game.fight.hp = healHp(game.fight.hp);
const pos = game.avatar.pos;
uiFloat({ col:pos.col,row:pos.row },{ text:HEALED_WORD,tone:'primary',atMs:performance.now() });
uiAnnounce(HEALED_LINE);
if (app.screen) uiRenderKeepingFocus(app);
}
function uiOnStep(payload) {
if (uiBound && uiAtBed(uiBound.game,payload.pos)) uiHeal(uiBound);
}
function uiOnSectorClear() {
if (uiBound) uiHeal(uiBound);
}
function uiInstallHeal(app) {
uiBound = app;
if (uiHooked) return;
uiHooked = true;
uiGameBus().on(GAME_EVENT.STEP,uiOnStep);
uiGameBus().on(GAME_EVENT.SECTOR_CLEAR,uiOnSectorClear);
}

export { uiInstallHeal };

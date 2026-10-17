import { EAST_BEAT } from '../game/cast/patch.js';
import { hasBeat } from '../game/ext/ops.js';
import { xpForBreach } from '../game/progress.js';
import { pillWanted } from '../game/quest/case-pill.js';
import { GATE_FAMILY,gatePillText,joinPills } from '../game/quest/gate-pill.js';
import { rankLevel } from '../game/rank.js';
import { isOpen } from '../game/world.js';
import { uiRenderKeepingFocus } from './app.js';
import { uiShowToast } from './grid-toast.js';


function uiRankText(ext) {
const points = ext && ext.rank ? ext.rank.r :0;
return points > 0 ? 'RANK ' + rankLevel(points) + ' · ' + points + ' R' :null;
}
function uiUnsolvedXp(game) {
return game.world.placed.filter((key) => !game.progress.breached.has(key)).map((key) => xpForBreach(game.world.problems[key].difficulty,0));
}
function uiGatePillText(game) {
const gate = Object.hasOwn(game.world.gates || {},GATE_FAMILY) ? game.world.gates[GATE_FAMILY] :null;
if (!gate || !game.ext) return null;
const open = isOpen(game.world,game.progress,gate.id);
return gatePillText({ told:hasBeat(game.ext,EAST_BEAT),level:game.progress.level,xp:game.progress.xp,open,unsolved:uiUnsolvedXp(game) });
}
async function uiLeadOf(app,quest) {
if (!quest || app.game.ext.pin) return null;
const lead = (await import('./grid-chain.js')).uiChainOwed(app.game)[0];
return lead ? lead.name :null;
}
async function uiPillOf(app) {
const quest = pillWanted(app.game.ext) ? (await import('./quest-run.js')).uiQuestPillText(app) :null;
app.game.hudLead = await uiLeadOf(app,quest);
return joinPills(quest,uiGatePillText(app.game));
}
async function uiRefreshHud(app) {
const game = app.game;
game.hudRank = uiRankText(game.ext);
game.hudPill = await uiPillOf(app);
if (app.screen) uiRenderKeepingFocus(app);
}
async function uiRefreshPill(app) {
const pill = await uiPillOf(app);
if (pill === app.game.hudPill) return;
app.game.hudPill = pill;
if (app.screen) uiRenderKeepingFocus(app);
}
function uiSayOnGrid(app,text) {
if (text && app.screen === 'grid') uiShowToast(app,{ text,kind:'reward' });
}

export { uiRankText,uiGatePillText,uiRefreshHud,uiRefreshPill,uiSayOnGrid };

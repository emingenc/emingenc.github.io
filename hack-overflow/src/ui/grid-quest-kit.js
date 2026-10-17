import { propAt } from '../game/cast/patch.js';
import { questState,withQuest } from '../game/ext/ops.js';
import { cellToward } from '../game/move.js';
import { cellKey } from '../game/path.js';
import { QUESTS,STAGE } from '../game/quest/quests.js';
import { uiCommitExt } from './ext-storage.js';
import { uiCastSay } from './grid-cast-act.js';
import { uiInstallCast } from './grid-cast.js';
import { uiAddGuard,uiPowerOf } from './grid-power.js';
import { uiPaintMarks } from './grid-quest-marks.js';
import { uiPinQuest } from './quest-run.js';
import { uiStoryChoice } from './story-dialogue.js';

function uiNewKit() {
return { props:[],paints:[],guarded:false,painted:false,busy:false };
}
function uiQuestKit(game) {
const power = uiPowerOf(game);
if (!power.quests) power.quests = uiNewKit();
return power.quests;
}
function uiQuestLive(app) {
const power = app.game && app.game.power;
return app.screen === 'grid' && Boolean(power) && power.gen === app.game.gen && Boolean(power.quests);
}
async function uiBeginQuest(app,questId) {
const game = app.game;
if (!Object.hasOwn(QUESTS,questId) || questState(game.ext,questId) >= STAGE.active) return false;
if (game.ext.pin) uiCommitExt(app,withQuest(game.ext,questId,STAGE.active));
else await uiPinQuest(app,questId);
return questState(app.game.ext,questId) === STAGE.active;
}
function uiPropBump(game,dir,prop) {
return { pos:{ ...game.avatar.pos },facing:dir,event:{ type:'bump',prop:prop.id } };
}
function uiKitSolids(app) {
return uiQuestKit(app.game).props.flatMap(function (props) { return props(app) || []; });
}
function uiKitAvoid(app) {
return new Set(uiKitSolids(app).map(cellKey));
}
function uiKitGuard(app,dir) {
const game = app.game;
const solids = uiKitSolids(app);
const prop = propAt(solids,cellToward(game.avatar.pos,dir));
return prop ? uiPropBump(game,dir,prop) :null;
}
function uiPropGuard(app,props) {
uiInstallCast(app);
const kit = uiQuestKit(app.game);
kit.props.push(props);
if (kit.guarded) return;
kit.guarded = true;
uiAddGuard(app.game,uiKitGuard);
app.game.tapAvoid = uiKitAvoid;
}
function uiWrapPaint(game) {
const inner = game.drawCast;
game.drawCast = function (ctx,app,frame) {
if (inner) inner(ctx,app,frame);
uiQuestKit(app.game).paints.forEach(function (paint) { paint(ctx,app,frame); });
};
}
function uiQuestPaint(app,paint) {
uiInstallCast(app);
const kit = uiQuestKit(app.game);
kit.paints.push(paint);
if (kit.painted) return;
kit.painted = true;
uiWrapPaint(app.game);
}
function uiQuestMarks(app,marks) {
uiQuestPaint(app,function (ctx,gameApp,frame) { uiPaintMarks(ctx,frame,marks(gameApp) || []); });
}
function uiQuestSay(app,line) {
return uiCastSay(app,typeof line === 'string' ? { text:line } :line);
}
function uiCopiedSheet(sheet) {
return { id:sheet.id,lines:sheet.lines.map(function (line) { return { ...line }; }),choices:sheet.choices.map(function (choice) { return { ...choice }; }) };
}
async function uiQuestAsk(app,sheet) {
const kit = uiQuestKit(app.game);
if (kit.busy) return null;
kit.busy = true;
try {
return await uiStoryChoice(app,uiCopiedSheet(sheet));
} finally {
kit.busy = false;
}
}
function uiWithin(cell,other,reach) {
return Math.max(Math.abs(cell.col - other.col),Math.abs(cell.row - other.row)) <= reach;
}

export { uiQuestKit,uiQuestLive,uiBeginQuest,uiPropGuard,uiQuestPaint,uiQuestMarks,uiQuestSay,uiQuestAsk,uiWithin };

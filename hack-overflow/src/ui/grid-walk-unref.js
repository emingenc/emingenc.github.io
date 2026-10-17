import { questState,withNpc } from '../game/ext/ops.js';
import { withoutTag } from '../game/ext/power-ops.js';
import { ownedPowers } from '../game/power/powers.js';
import { STAGE } from '../game/quest/quests.js';
import { TEXTS,UNREF,gcSweep,homeDue,inRoom,newSweep,nullSpot,roomLine,sweepAt } from '../game/walk/unreferenced.js';
import { uiCommitExt } from './ext-storage.js';
import { uiAddTagSpot,uiHooksOnce,uiPowerOf,uiPowerRefresh } from './grid-power.js';
import { uiBeginQuest,uiQuestLive,uiQuestMarks,uiQuestPaint,uiQuestSay } from './grid-quest-kit.js';
import { uiQuestEvent } from './quest-run.js';

function uiStateOf(app) {
return uiPowerOf(app.game).unref;
}
function uiLive(app) {
return uiQuestLive(app) && Boolean(uiStateOf(app));
}
function uiTagged(game) {
return Boolean(game.ext.tags && game.ext.tags[UNREF.tagId]);
}
function uiFacts(app) {
const game = app.game;
const state = uiStateOf(app);
return {
owns:ownedPowers(game.progress.won).includes('lookup'),stage:questState(game.ext,UNREF.quest),tagged:uiTagged(game),
swept:state.sweep.swept,home:Boolean(game.ext.npc && game.ext.npc.nullHome),told:state.told,hero:game.avatar.pos,
};
}
function uiSay(app,text,kind = 'info') {
uiQuestSay(app,{ text,kind }).catch(console.error);
}
function uiFreshSweep(game) {
return uiTagged(game) ? gcSweep(newSweep(),{ kind:'tag' }) :newSweep();
}
function uiSyncTag(app) {
const state = uiStateOf(app);
if (!uiTagged(app.game) || state.sweep.tagged) return;
state.sweep = gcSweep(state.sweep,{ kind:'tag' });
if (state.sweep.tagged) uiSay(app,TEXTS.tagged);
}
async function uiEnterRoom(app) {
const state = uiStateOf(app);
const facts = uiFacts(app);
state.sweep = uiFreshSweep(app.game);
const line = roomLine(facts);
if (line === 'flicker') state.told = true;
if (facts.owns && !facts.home && facts.stage !== STAGE.done) await uiBeginQuest(app,UNREF.quest);
if (line) uiSay(app,TEXTS[line]);
}
function uiRoomStep(app) {
const state = uiStateOf(app);
if (questState(app.game.ext,UNREF.quest) !== STAGE.active) return;
const next = gcSweep(state.sweep,{ kind:'step' });
const swept = next.swept && !state.sweep.swept;
state.sweep = next;
if (swept) uiSay(app,TEXTS.swept);
}
async function uiNullHome(app) {
const game = app.game;
const power = uiPowerOf(game);
uiCommitExt(app,withNpc(withoutTag(game.ext,UNREF.tagId),{ nullHome:true }));
delete power.tags[UNREF.tagId];
if (power.selected === UNREF.tagId) power.selected = Object.keys(power.tags).pop() || null;
uiPowerRefresh(app);
await uiQuestEvent(app,UNREF.quest,{ kind:'progress' });
uiSay(app,TEXTS.home,'reward');
}
function uiOnEnterCell(info) {
const app = info.app;
if (!uiLive(app) || app.game.opening) return;
uiSyncTag(app);
const was = inRoom(info.from || info.pos);
const now = inRoom(info.pos);
if (now && !was) uiEnterRoom(app).catch(console.error);
else if (now) uiRoomStep(app);
else if (was) uiStateOf(app).sweep = uiFreshSweep(app.game);
const facts = uiFacts(app);
if (homeDue(facts)) uiNullHome(app).catch(console.error);
}
function uiSpots(app) {
if (!uiLive(app)) return [];
const spot = nullSpot(uiFacts(app));
return spot ? [spot] :[];
}
function uiMarks(app) {
if (!uiLive(app) || uiFacts(app).home) return [];
const sweep = uiStateOf(app).sweep;
const gc = sweep.tagged ? null :sweepAt(sweep);
const marks = sweep.swept ? [] :[{ kind:'flicker',col:UNREF.tile.col,row:UNREF.tile.row }];
if (gc) marks.push({ kind:'sweep',col:gc.col,row:gc.row });
return marks;
}
function uiOnFrame(ctx,app) {
if (uiLive(app)) uiSyncTag(app);
}
const uiHook = uiHooksOnce({ 'enter-cell':uiOnEnterCell });
function uiInstallUnreferenced(app) {
const game = app.game;
uiPowerOf(game).unref = { sweep:uiFreshSweep(game),told:false };
uiAddTagSpot(game,uiSpots);
uiQuestMarks(app,uiMarks);
uiQuestPaint(app,uiOnFrame);
uiHook();
}

export { uiInstallUnreferenced };

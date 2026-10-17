import { questState } from '../game/ext/ops.js';
import { STAGE } from '../game/quest/quests.js';
import { QUEST_ID,TEXT,atBrace,offerDue,spillMarks,spillStep,undoSheet,wrongDue } from '../game/walk/undo.js';
import { uiCastUntil } from './grid-cast-act.js';
import { uiHooksOnce } from './grid-power.js';
import { uiBeginQuest,uiQuestAsk,uiQuestLive,uiQuestMarks } from './grid-quest-kit.js';
import { uiShowToast } from './grid-toast.js';
import { uiQuestEvent } from './quest-run.js';

const games = new WeakMap();

function uiStateOf(app) {
const state = games.get(app.game);
return state && state.gen === app.game.gen && uiQuestLive(app) ? state :null;
}
function uiActive(game) {
return questState(game.ext,QUEST_ID) === STAGE.active;
}
function uiTaken(game) {
const run = game.questRuns && game.questRuns[QUEST_ID];
return run && run.stage === STAGE.active ? run.n :0;
}
function uiMarks(app) {
return uiActive(app.game) ? spillMarks(uiTaken(app.game)) :[];
}
async function uiUndone(app,spill) {
const result = await uiQuestEvent(app,QUEST_ID,{ kind:'progress' });
if (!result.done) uiShowToast(app,{ text:TEXT.spill(spill),kind:'info' });
else uiShowDone(app);
}
function uiShowDone(app) {
uiCastUntil(app,() => !app.game.toast).then(() => uiShowToast(app,{ text:TEXT.done,kind:'info' })).catch(console.error);
}
function uiSlipped(app,state) {
uiQuestEvent(app,QUEST_ID,{ kind:'slip' }).catch(console.error);
const now = performance.now();
if (!wrongDue(state.wrongAt,now)) return;
state.wrongAt = now;
uiShowToast(app,{ text:TEXT.wrong,kind:'info' });
}
function uiOnEnterCell(info) {
const app = info.app;
const state = uiStateOf(app);
if (!state || !uiActive(app.game)) return;
const step = spillStep(uiTaken(app.game),info.pos);
if (step.kind === 'progress') uiUndone(app,step.n).catch(console.error);
else if (step.kind === 'slip') uiSlipped(app,state);
}
function uiQuiet(app) {
const game = app.game;
const volley = game.power && game.power.volley;
return !(volley && volley.talking) && !game.toast && !(game.toastQueue && game.toastQueue.length > 0);
}
function uiStillAsking(app) {
const game = app.game;
const volley = game.power && game.power.volley;
return !app.story && !(volley && volley.live) && atBrace(game.avatar.pos,game.avatar.facing) && offerDue(game.ext);
}
async function uiOffer(app) {
await Promise.resolve();
await uiCastUntil(app,() => uiQuiet(app));
if (!uiStillAsking(app)) return;
if (await uiQuestAsk(app,undoSheet()) === 'undo') await uiBeginQuest(app,QUEST_ID);
}
function uiOnBump(info) {
const app = info.app;
const state = uiStateOf(app);
if (!state || state.asking || (info.event && info.event.prop) || !uiStillAsking(app)) return;
state.asking = true;
uiOffer(app).catch(console.error).finally(() => { state.asking = false; });
}
const uiHook = uiHooksOnce({ 'enter-cell':uiOnEnterCell,bump:uiOnBump });

function uiInstallUndo(app) {
games.set(app.game,{ gen:app.game.gen,wrongAt:null,asking:false });
uiQuestMarks(app,uiMarks);
uiHook();
}

export { uiInstallUndo };

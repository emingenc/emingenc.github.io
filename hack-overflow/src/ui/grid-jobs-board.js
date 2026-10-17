import { TALLY_JOBS } from '../game/cast/tally.js';
import { abandonOps,boardRows,boardSheet,CHOICE,jobSheet } from '../game/quest/jobs-board.js';
import { uiCommitExt } from './ext-storage.js';
import { uiShowToast } from './grid-toast.js';
import { uiPinQuest } from './quest-run.js';
import { uiQuestTravel } from './quest-travel.js';
import { uiRefreshHud } from './rank-hud.js';
import { uiStoryChoice } from './story-dialogue.js';

const DROPPED = 'TALLY: Dropped. It stays open.';

async function uiAsk(app,sheet) {
if (sheet.choices.length > 1) return uiStoryChoice(app,sheet);
return (await import('./grid-ordeal-sheet.js')).uiOrdealSheet(app,sheet);
}

function uiSay(app,text) {
uiShowToast(app,{ text,kind:'info' });
}
function uiTakenLine(id) {
const job = TALLY_JOBS.find((row) => row.id === id);
return job ? job.taken :null;
}
async function uiTake(app,row) {
await uiPinQuest(app,row.id);
const line = uiTakenLine(row.id);
if (line) uiSay(app,line);
}
async function uiAbandon(app,row) {
const game = app.game;
const next = abandonOps(game.ext,row.id);
if (next === game.ext) return;
uiCommitExt(app,next);
if (game.power) delete game.power.anagram;
game.questRuns = { ...game.questRuns };
delete game.questRuns[row.id];
await uiRefreshHud(app);
uiSay(app,DROPPED);
}
async function uiAct(app,row,pick) {
if (pick === CHOICE.take || pick === CHOICE.takeGo) await uiTake(app,row);
if (pick === CHOICE.takeGo || pick === CHOICE.go) uiQuestTravel(app,row.where);
if (pick === CHOICE.abandon) await uiAbandon(app,row);
return pick === CHOICE.back;
}
async function uiBoardRound(app) {
const rows = boardRows(app.game.ext);
const pick = await uiAsk(app,boardSheet(rows));
const row = rows.find((one) => one.id === pick);
if (!row) return false;
return uiAct(app,row,await uiAsk(app,jobSheet(row)));
}
async function uiJobsBoard(app) {
const fork = app.game.fork;
if (fork.busy) return;
fork.busy = true;
try {
while (await uiBoardRound(app));
} finally {
fork.busy = false;
}
}

export { uiJobsBoard };

import { BEATS,FIND,GHOST_SHEET,TOASTS,answerThe8,hasOffered,isCleared } from '../game/cast/fork.js';
import { MEET_ID,RUN_ID,THANKS_RANK,THANKS_SOURCE,TOASTS as TALLY_TOASTS,offerSheet,tallyPlan } from '../game/cast/tally.js';
import { hasBeat,questState,withBeat,withFind,withMet,withQuest } from '../game/ext/ops.js';
import { STAGE } from '../game/quest/quests.js';
import { uiCommitExt } from './ext-storage.js';
import { uiShowToast } from './grid-toast.js';
import { uiStoryChoice } from './story-dialogue.js';

const PAIR_ID = 'patrol-pair';
const LATE_OFFER = 'the-8-late';

function uiSay(app,text,kind = 'info') {
uiShowToast(app,{ text,kind });
}
async function uiQuestRunner() {
return import('./quest-run.js');
}
function uiCopied(sheet) {
return { id:sheet.id,lines:sheet.lines.map((line) => ({ ...line })),choices:sheet.choices.map((choice) => ({ ...choice })) };
}
async function uiAsk(app,sheet) {
const fork = app.game.fork;
if (fork.busy) return null;
fork.busy = true;
try {
return await uiStoryChoice(app,uiCopied(sheet));
} finally {
fork.busy = false;
}
}
async function uiStartPair(app) {
const game = app.game;
if (questState(game.ext,PAIR_ID) >= STAGE.active) return;
if (game.ext.pin) {
uiCommitExt(app,withQuest(game.ext,PAIR_ID,STAGE.active));
return;
}
await (await uiQuestRunner()).uiPinQuest(app,PAIR_ID);
}
function uiAnswerThe8(app,pick) {
uiCommitExt(app,answerThe8(app.game.ext,pick));
if (pick === 'trust') {
uiSay(app,TOASTS.trust);
return;
}
uiSay(app,TOASTS.bit);
uiSay(app,TOASTS.verify);
}
function uiLateDue(ext) {
return hasBeat(ext,'ordeal') && !isCleared(ext) && !hasBeat(ext,LATE_OFFER);
}
async function uiLateOffer(app) {
const { uiGhostOffer } = await import('./finale-offer.js');
const answered = await uiGhostOffer(app,{ kind:'fork',once:LATE_OFFER });
if (answered && !hasOffered(app.game.ext)) uiCommitExt(app,withBeat(app.game.ext,BEATS.offer));
}
async function uiForkEnter(app) {
await uiStartPair(app);
if (app.game.cast && app.game.cast.run && uiLateDue(app.game.ext)) return false;
if (uiLateDue(app.game.ext)) {
await uiLateOffer(app);
return true;
}
if (hasOffered(app.game.ext)) return true;
if (app.game.cast && app.game.cast.run) return false;
const pick = await uiAsk(app,GHOST_SHEET);
if (pick && !hasOffered(app.game.ext)) uiAnswerThe8(app,pick);
return true;
}
async function uiSignBump(app) {
uiSay(app,TOASTS.sign);
await uiStartPair(app);
}
function uiTakeReceipt(app) {
uiCommitExt(app,withFind(app.game.ext,FIND.id));
uiSay(app,TOASTS.find,'reward');
}
async function uiPairFound(app) {
uiShowToast(app,{ text:TOASTS.pair,kind:'reward',replace:true });
await (await uiQuestRunner()).uiQuestEvent(app,PAIR_ID,{ kind:'progress' });
}
async function uiPairMiss(app) {
await (await uiQuestRunner()).uiQuestEvent(app,PAIR_ID,{ kind:'slip' });
}
async function uiTallyOffer(app,met) {
const game = app.game;
uiCommitExt(app,withMet(game.ext,MEET_ID));
const pick = await uiAsk(app,offerSheet(met));
if (pick !== 'take') return;
await (await uiQuestRunner()).uiPinQuest(app,RUN_ID);
uiSay(app,TALLY_TOASTS.taken);
}
async function uiTallyThanks(app,met) {
if (!met) uiCommitExt(app,withMet(app.game.ext,MEET_ID));
uiSay(app,TALLY_TOASTS.thanks,'reward');
const { uiPayRank } = await import('./rank-pay.js');
await uiPayRank(app,THANKS_SOURCE,THANKS_RANK);
}
async function uiTallyBump(app) {
const plan = tallyPlan(app.game.ext);
if (plan.kind === 'thanks') await uiTallyThanks(app,plan.met);
else if (plan.kind === 'offer') await uiTallyOffer(app,plan.met);
else uiSay(app,TALLY_TOASTS[plan.kind]);
}

export { uiForkEnter,uiSignBump,uiTakeReceipt,uiPairFound,uiPairMiss,uiTallyBump };

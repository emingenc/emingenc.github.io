import { WARP_CELL } from '../game/cast/patch.js';
import { hasBeat } from '../game/ext/ops.js';
import { BEATS } from '../game/finale/contract.js';
import {
AFTER_TOASTS,ORDEAL_TOASTS,TRACED_QUIP_TEXT,TRACED_TEXT,alarmSheet,choiceOf,ordealOutcome,stanceOf,verdictSheet,withPatchTaken,
} from '../game/finale/ordeal.js';
import { ordealSpec } from '../game/finale/ordeal-spec.js';
import { waveSheets } from '../game/finale/ordeal-waves.js';
import { uiRenderApp } from './app.js';
import { uiCommitExt } from './ext-storage.js';
import { uiCastCarry,uiCastSay } from './grid-cast-act.js';
import { uiCastSync } from './grid-cast-sync.js';
import { uiFloodDragOff,uiFloodHurt,uiFloodLive,uiFloodSay,uiFloodSeat,uiFloodStart,uiFloodStop,uiFloodWave } from './grid-ordeal-flood.js';
import { uiOnGrid,uiOrdealSheet } from './grid-ordeal-sheet.js';
import { uiPayRank } from './rank-pay.js';
import { uiOpenReview } from './review-loader.js';
import { uiOpenTraced } from './screen-traced.js';
import { uiStoryChoice } from './story-dialogue.js';

const TRACED_INFO = Object.freeze({ key:null,lockName:'ROOT',failed:0,revealed:false,visibleFails:0,maxStars:0,scene:TRACED_TEXT,quip:TRACED_QUIP_TEXT });
const BENCH = Object.freeze({ cell:WARP_CELL,facing:'left' });

async function uiOrdealTaken(app,fought) {
const game = app.game;
if (!hasBeat(game.ext,BEATS.home)) uiCommitExt(app,withPatchTaken(game.ext));
uiCastSync(app);
if (fought) await uiCastSay(app,{ text:ORDEAL_TOASTS.frozen,kind:'info' });
}
async function uiOrdealWaves(app) {
const game = app.game;
uiFloodStart(game);
const fought = uiFloodSeat(game);
const { hold,bubbles,deal } = waveSheets(game.ext.ghost);
if (fought) await uiFloodSay(app,{ who:hold.who,text:hold.text,at:'patch' });
await uiFloodWave(app,1);
await uiFloodWave(app,2);
if (fought) await uiFloodDragOff(app);
await uiOrdealTaken(app,fought);
for (const bubble of bubbles) if (fought || bubble.who !== 'PATCH') await uiFloodSay(app,bubble);
await uiOrdealSheet(app,deal);
uiFloodLive(game);
}
function uiOrdealResolve(app,result,decide) {
const game = app.game;
const choice = choiceOf(result);
const outcome = ordealOutcome(game.ext,choice);
uiCommitExt(app,outcome.ext);
if (outcome.overrun) uiFloodHurt(app,outcome.overrun);
decide({ choice,outcome });
}
async function uiOrdealJudge(app,stance) {
let decide = null;
const decided = new Promise(function (resolve) { decide = resolve; });
await uiOpenReview(app,ordealSpec((target,result) => uiOrdealResolve(target,result,decide),stance));
app.game.reviveAt = { ...BENCH.cell };
return decided;
}
async function uiOrdealAfter(app,decided) {
const { choice,outcome } = decided;
await uiOnGrid(app);
if (outcome.rank) await uiPayRank(app,outcome.rank.source,outcome.rank.amount);
await uiOrdealSheet(app,verdictSheet(choice));
if (outcome.tagged) await uiCastSay(app,{ text:ORDEAL_TOASTS.tagged,kind:'reward' });
uiOpenTraced(app,{ ...TRACED_INFO });
uiRenderApp(app);
await uiOnGrid(app);
uiFloodStop(app.game);
uiCastCarry(app,BENCH);
if (app.game.journey) app.game.journey.played = true;
for (const text of AFTER_TOASTS) await uiCastSay(app,{ text,kind:'info' });
}

async function uiStartOrdeal(app) {
const game = app.game;
try {
const stance = stanceOf(await uiStoryChoice(app,alarmSheet()));
await uiOrdealWaves(app);
await uiOrdealAfter(app,await uiOrdealJudge(app,stance));
} finally {
uiFloodStop(game);
}
}

export { uiStartOrdeal };

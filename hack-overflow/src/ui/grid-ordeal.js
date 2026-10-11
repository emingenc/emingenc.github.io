import {
AFTER_TOASTS,HOME,ORDEAL_TOASTS,TRACED_QUIP_TEXT,TRACED_TEXT,alarmSheet,choiceOf,dealSheet,ordealOutcome,verdictSheet,withHome,
} from '../game/finale/ordeal.js';
import { ordealSpec } from '../game/finale/ordeal-spec.js';
import { inSafehouse } from '../game/quest/journey.js';
import { uiRenderApp } from './app.js';
import { uiCommitExt } from './ext-storage.js';
import { uiCastCarry,uiCastSay,uiCastStill } from './grid-cast-act.js';
import { uiCastSync } from './grid-cast-sync.js';
import { uiFloodHurt,uiFloodStart,uiFloodStop,uiFloodWave } from './grid-ordeal-flood.js';
import { uiOnGrid,uiOrdealSheet } from './grid-ordeal-sheet.js';
import { uiPayRank } from './rank-pay.js';
import { uiOpenReview } from './review-loader.js';
import { uiOpenTraced } from './screen-traced.js';

const TRACED_INFO = Object.freeze({ key:null,lockName:'ROOT',failed:0,revealed:false,visibleFails:0,maxStars:0,scene:TRACED_TEXT,quip:TRACED_QUIP_TEXT });

async function uiOrdealHome(app) {
const game = app.game;
await uiOrdealSheet(app,alarmSheet(inSafehouse(game.avatar.pos)));
if (!inSafehouse(game.avatar.pos)) uiCastCarry(app,HOME);
uiCommitExt(app,withHome(game.ext));
await uiCastStill(app);
}
async function uiOrdealFreeze(app) {
uiCastSync(app);
await uiCastSay(app,{ text:ORDEAL_TOASTS.frozen,kind:'info' });
}
function uiOrdealResolve(app,result,decide) {
const game = app.game;
const choice = choiceOf(result);
const outcome = ordealOutcome(game.ext,choice);
uiCommitExt(app,outcome.ext);
if (game.journey) game.journey.played = true;
if (outcome.overrun) uiFloodHurt(app,outcome.overrun);
decide({ choice,outcome });
}
async function uiOrdealJudge(app) {
let decide = null;
const decided = new Promise(function (resolve) { decide = resolve; });
await uiOpenReview(app,ordealSpec((target,result) => uiOrdealResolve(target,result,decide)));
app.game.reviveAt = { ...HOME.cell };
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
for (const text of AFTER_TOASTS) await uiCastSay(app,{ text,kind:'info' });
}

async function uiStartOrdeal(app) {
const game = app.game;
try {
await uiOrdealHome(app);
uiFloodStart(game);
await uiFloodWave(app);
await uiOrdealFreeze(app);
await uiOrdealSheet(app,dealSheet(game.ext.ghost));
await uiOrdealAfter(app,await uiOrdealJudge(app));
} finally {
uiFloodStop(game);
}
}

export { uiStartOrdeal };

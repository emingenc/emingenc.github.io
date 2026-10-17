import { ORACLE_CELL } from '../game/cast/oracle.js';
import { TALLY_CELL } from '../game/cast/tally.js';
import { chainSteps } from '../game/ext/badge-ops.js';
import { cellToward } from '../game/move.js';
import { BRIDGE } from '../game/power/bridge.js';
import { SILL_CELL } from '../game/power/lane-map.js';
import { VOLLEY } from '../game/power/volley.js';
import { STEPS,activeSteps,caseOpen,chainOutcome,leadsOut,nextHint,payoff } from '../game/quest/first-bad-commit.js';
import { cellAt,isPassable } from '../game/world.js';
import { uiRenderApp } from './app.js';
import { uiCommitExt } from './ext-storage.js';
import { uiOrdealSheet } from './grid-ordeal-sheet.js';
import { uiHooksOnce } from './grid-power.js';
import { uiShowToast } from './grid-toast.js';
import { uiWalkReleaseAll } from './grid-walk.js';
import { uiLinkStyle } from './lazy-style.js';
import { uiPayRank } from './rank-pay.js';
import { uiStoryChoice } from './story-dialogue.js';

const STYLE_HREF = 'styles/lazy/grid-chain.css';
const STEP_RANK = 10;
const GIVER_CELLS = Object.freeze({
tally:[TALLY_CELL],
twins:BRIDGE.twins,
brace:[VOLLEY.brace],
oracle:[ORACLE_CELL],
sill:[SILL_CELL],
});

function uiChainCellsOf(step) {
return [].concat(GIVER_CELLS[step.id] || []);
}
function uiPlaced(game,step) {
return uiChainCellsOf(step).some((cell) => Boolean(cellAt(game.world,cell)) && !isPassable(game.world,game.progress,cell));
}
function uiChainActive(game) {
return activeSteps(STEPS.filter((step) => uiPlaced(game,step)).map((step) => step.giver));
}
function uiChainOwed(game) {
if (!caseOpen(game.ext,game.save)) return [];
const done = chainSteps(game.ext);
return uiChainActive(game).filter((step) => !done[step.bit]);
}
function uiChainOf(app) {
const chain = app.game.chain;
return chain && chain.gen === app.game.gen ? chain :null;
}
function uiFaced(game) {
return cellToward(game.avatar.pos,game.avatar.facing);
}
function uiStepFaced(game) {
const faced = uiFaced(game);
return uiChainOwed(game).find((step) => uiChainCellsOf(step).some((cell) => cell.col === faced.col && cell.row === faced.row)) || null;
}
function uiIntroSheet(step) {
return {
id:'chain-' + step.id,lines:step.intro.map((line) => ({ ...line })),
choices:[{ id:'open',label:'OPEN CASE FILE' },{ id:'later',label:'NOT NOW',default:true }],
};
}
function uiFoundSheet(step) {
return { id:'chain-found-' + step.id,lines:[{ ...step.found }],choices:[{ id:'ok',label:'FILE IT' }] };
}
function uiPayoffSheet() {
return { id:'chain-payoff',lines:payoff.lines.map((line) => ({ ...line })),choices:[{ id:'ok',label:'CASE CLOSED' }] };
}
async function uiRunPanel(app,state,step) {
const [ui] = await Promise.all([import('./grid-chain-panel.js'),uiLinkStyle(STYLE_HREF)]);
return new Promise(function (resolve) {
uiWalkReleaseAll(app);
app.game.walk.plan = null;
state.panel = { step,puzzle:step.puzzle.start(),said:'',done:false,ui,close:function (won) {
state.panel = null;
app.lastFocusKey = 'grid-stage';
uiRenderApp(app);
resolve(won);
} };
app.lastFocusKey = 'chain-cell-0';
uiRenderApp(app);
});
}
async function uiChainSolve(app,step) {
await uiPayRank(app,'fbc-' + step.id,STEP_RANK);
const outcome = () => chainOutcome(app.game.ext,step.bit);
const first = outcome();
if (first.payoff) await uiPayRank(app,payoff.rank.source,payoff.rank.amount);
const out = outcome();
if (out.ext !== app.game.ext) uiCommitExt(app,out.ext);
return { firstTime:first.firstTime,payoff:first.payoff };
}
async function uiChainDone(app,state,step) {
await uiOrdealSheet(app,uiFoundSheet(step));
if (app.game.chain !== state) return;
const result = await uiChainSolve(app,step);
if (!result.payoff) {
uiChainLeadsOut(app);
return;
}
uiShowToast(app,{ text:'BADGE: ' + payoff.badgeName + ' . BIT wears the ' + payoff.cosmeticName,kind:'reward',replace:true });
await uiOrdealSheet(app,uiPayoffSheet());
}
function uiChainLeadsOut(app) {
const line = leadsOut(app.game.ext);
if (line && !uiChainOwed(app.game).length) uiShowToast(app,{ text:line,kind:'info' });
}
function uiChainHint(app,state,step) {
if (state.hinted || app.game.chain !== state) return;
const hint = nextHint(app.game.ext,uiChainOwed(app.game).filter((item) => item.id !== step.id));
if (!hint) return;
state.hinted = true;
uiShowToast(app,{ text:hint,kind:'info' });
}
async function uiChainPlay(app,state,step) {
state.holding = true;
if (await uiRunPanel(app,state,step)) await uiChainDone(app,state,step);
}
async function uiChainCase(app,state,step) {
state.busy = true;
try {
const pick = await uiStoryChoice(app,uiIntroSheet(step));
if (app.game.chain === state && pick === 'open') await uiChainPlay(app,state,step);
} finally {
state.holding = false;
state.busy = false;
uiChainHint(app,state,step);
}
}
function uiChainBump(info) {
const app = info.app;
const state = uiChainOf(app);
if (!state || state.busy || app.screen !== 'grid' || app.story || (info.event && info.event.prop)) return;
const step = uiStepFaced(app.game);
if (step) uiChainCase(app,state,step).catch(console.error);
}
const uiHook = uiHooksOnce({ bump:uiChainBump });
function uiWrapPaint(game,state) {
const inner = game.drawCast;
if (inner && inner.isChain) return;
const paint = function (ctx,app,frame) {
if (inner) inner(ctx,app,frame);
if (state.draw) state.draw(ctx,app,frame);
};
paint.isChain = true;
game.drawCast = paint;
}
function uiIsHung(game) {
const own = Object.getOwnPropertyDescriptor(game,'drawPower');
return Boolean(own && own.get && own.get.isChainPanel);
}
function uiHangPanel(game) {
if (uiIsHung(game)) return;
const before = Object.getOwnPropertyDescriptor(game,'drawPower');
let plain = before && !before.get ? before.value :null;
const under = () => (before && before.get ? before.get.call(game) :plain);
const draw = function (app) {
const state = uiChainOf(app);
if (state && state.panel) return state.panel.ui.uiChainPanel(app,state.panel);
const inner = under();
return inner ? inner(app) :null;
};
const read = () => draw;
read.isChainPanel = true;
const write = function (next) {
if (before && before.set) before.set.call(game,next);
else plain = next;
};
Object.defineProperty(game,'drawPower',{ configurable:true,enumerable:true,get:read,set:write });
}
function uiInstallChain(app) {
const game = app.game;
const state = { gen:game.gen,busy:false,holding:false,panel:null,hinted:false,draw:null };
game.chain = state;
uiWrapPaint(game,state);
import('./grid-chain-draw.js').then(function (draw) { state.draw = draw.uiPaintChain; }).catch(console.error);
uiHook();
}
function uiChainEnter(app) {
const state = uiChainOf(app);
if (!state) return;
uiHangPanel(app.game);
if (state.panel) state.panel.close(false);
}

export { GIVER_CELLS,STEP_RANK,uiChainActive,uiChainCellsOf,uiChainEnter,uiChainOf,uiChainOwed,uiChainSolve,uiInstallChain };

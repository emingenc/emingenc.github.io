import { GAME_EVENT } from '../game/game-events.js';
import { rankFor, traceCapacity } from '../game/progress.js';
import { EXPLOITS } from '../game/exploits.js';
import { unlockText } from '../game/messages.js';
import { elapsedFromVar,levelLandMs,levelShownAt } from '../game/reward-motion.js';
import { uiEl, uiPointerIsCoarse, uiPrefersReducedMotion } from './dom.js';
import { uiLinkStyles } from './lazy-style.js';
import { uiEmit } from './bus.js';
import { uiEnterGrid } from './screen-grid.js';

function uiOpenLevelUp(app,levelUp) {
uiLinkStyles(['styles/lazy/levelup.css']);
app.game.levelUp = { ...levelUp,openedAt:performance.now() };
app.screen = 'levelup';
app.lastFocusKey = 'levelup-continue';
uiEmit(GAME_EVENT.LEVEL_UP,{ before:levelUp.before,after:levelUp.after,unlocks:levelUp.unlocks });
}
function uiUnlockExploitKey(exploit) {
return EXPLOITS[exploit === 'scanMk2' ? 'scan' :exploit].key;
}
function uiUnlockCardMeta(unlock) {
if (unlock.kind === 'trace') return '+' + (unlock.capacity - traceCapacity(unlock.level - 1));
if (unlock.kind === 'exploit' && !uiPointerIsCoarse()) return 'In a breach: press ' + uiUnlockExploitKey(unlock.exploit);
return '';
}
function uiUnlockCard(world,unlock,index) {
const meta = uiUnlockCardMeta(unlock);
const node = uiEl('li',{
className:'levelup-card levelup-card-' + unlock.kind,
children:[
uiEl('p',{ className:'levelup-card-text',text:unlockText(world,unlock) }),
meta ? uiEl('span',{ className:'levelup-card-meta',text:meta }) :null,
],
});
node.style.setProperty('--levelup-card-i',String(index));
return node;
}
function uiGroupByLevel(unlocks) {
const groups = [];
unlocks.forEach(function (unlock) {
const last = groups.at(-1);
if (last && last.level === unlock.level) last.unlocks.push(unlock);
else groups.push({ level:unlock.level,unlocks:[unlock] });
});
return groups;
}
function uiLevelLabel(level,index) {
const node = uiEl('p',{ className:'levelup-group-level',text:'LV ' + level });
node.style.setProperty('--levelup-card-i',String(index));
return node;
}
function uiUnlockGroup(world,group,allUnlocks) {
const cards = group.unlocks.map(function (unlock) { return uiUnlockCard(world,unlock,allUnlocks.indexOf(unlock)); });
return uiEl('ul',{ className:'levelup-cards',children:cards });
}
function uiUnlockGroups(world,levelUp) {
const unlocks = levelUp.unlocks;
const groups = uiGroupByLevel(unlocks);
const labelled = levelUp.after - levelUp.before > 1;
return groups.map(function (group) {
return uiEl('div',{ className:'levelup-group',children:[labelled ? uiLevelLabel(group.level,unlocks.indexOf(group.unlocks[0])) :null,uiUnlockGroup(world,group,unlocks)] });
});
}
const UI_LEVEL_WAIT_FRAMES = 30;
function uiTickLevelTitle(ctx) {
const node = ctx.node;
if (!node.isConnected) {
ctx.waited += 1;
if (ctx.waited < UI_LEVEL_WAIT_FRAMES) window.requestAnimationFrame(function () { uiTickLevelTitle(ctx); });
return;
}
if (ctx.startedAt === null) ctx.startedAt = performance.now() - elapsedFromVar(getComputedStyle(node).getPropertyValue('--levelup-elapsed'));
const elapsed = performance.now() - ctx.startedAt;
node.textContent = 'LV ' + levelShownAt(ctx.range,elapsed);
if (elapsed < levelLandMs(ctx.range)) window.requestAnimationFrame(function () { uiTickLevelTitle(ctx); });
}
function uiLevelTitle(levelUp) {
const node = uiEl('h1',{ className:'levelup-title',text:'LV ' + levelUp.after });
node.setAttribute('aria-label','LV ' + levelUp.after);
node.style.setProperty('--levelup-land',levelLandMs(levelUp) + 'ms');
if (uiPrefersReducedMotion() || levelUp.after <= levelUp.before || typeof window.requestAnimationFrame !== 'function') return node;
window.requestAnimationFrame(function () { uiTickLevelTitle({ node,range:levelUp,startedAt:null,waited:0 }); });
return node;
}
function uiLevelUpBody(world,levelUp) {
return [
uiEl('p',{ className:'levelup-kicker',text:'LEVEL UP' }),
uiLevelTitle(levelUp),
uiEl('p',{ className:'levelup-rank',text:'CALLSIGN: ' + rankFor(levelUp.after) }),
uiEl('div',{ className:'levelup-unlocks',attrs:{ role:'group','aria-label':'Unlocked' },children:uiUnlockGroups(world,levelUp) }),
];
}
function uiRenderLevelUp(app) {
const levelUp = app.game.levelUp;
const section = uiEl('section',{
className:'screen screen-card levelup-screen',
attrs:{ 'data-screen':'levelup' },
children:[
...uiLevelUpBody(app.game.world,levelUp),
uiEl('button',{
className:'btn btn-primary levelup-continue',
text:'CONTINUE',
attrs:{ type:'button','data-action':'levelup-continue','data-focus-key':'levelup-continue' },
}),
],
});
section.style.setProperty('--levelup-elapsed',(levelUp.openedAt - performance.now()) + 'ms');
return section;
}
function uiApplyLevelUpAction(app,actionId) {
if (actionId !== 'levelup-continue') return false;
uiEnterGrid(app);
return true;
}
function uiLevelUpSpeech(world,levelUp) {
const lines = levelUp.unlocks.map(function (unlock) { return unlockText(world,unlock); });
const unlocked = lines.length > 0 ? ' Unlocked: ' + lines.join('; ') + '.' :'';
return 'Callsign: ' + rankFor(levelUp.after) + '.' + unlocked;
}
function uiLevelUpAnnounce(app) {
return uiLevelUpSpeech(app.game.world,app.game.levelUp);
}
function uiLevelUpScreen() {
return {
id:'levelup',
render:uiRenderLevelUp,
focusKey:function () { return 'levelup-continue'; },
announce:uiLevelUpAnnounce,
applyAction:uiApplyLevelUpAction,
};
}

export { uiLevelUpScreen, uiOpenLevelUp, uiLevelUpBody, uiLevelUpSpeech };

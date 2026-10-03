import { GAME_EVENT } from '../game/game-events.js';
import { rankFor, traceCapacity } from '../game/progress.js';
import { EXPLOITS } from '../game/exploits.js';
import { unlockText } from '../game/messages.js';
import { uiEl, uiPointerIsCoarse } from './dom.js';
import { uiEmit } from './bus.js';
import { uiEnterGrid } from './screen-grid.js';

function uiOpenLevelUp(app,levelUp) {
app.game.levelUp = { ...levelUp,openedAt:performance.now() };
app.screen = 'levelup';
app.lastFocusKey = 'levelup-continue';
uiEmit(GAME_EVENT.LEVEL_UP,{ before:levelUp.before,after:levelUp.after,unlocks:levelUp.unlocks });
}
function uiUnlockLines(app) {
return app.game.levelUp.unlocks.map(function (unlock) { return unlockText(app.game.world,unlock); });
}
function uiUnlockExploitKey(exploit) {
return EXPLOITS[exploit === 'scanMk2' ? 'scan' :exploit].key;
}
function uiUnlockCardMeta(unlock) {
if (unlock.kind === 'trace') return '+' + (unlock.capacity - traceCapacity(unlock.level - 1));
if (unlock.kind === 'exploit' && !uiPointerIsCoarse()) return 'KEY ' + uiUnlockExploitKey(unlock.exploit);
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
function uiUnlockGroups(app) {
const unlocks = app.game.levelUp.unlocks;
const groups = uiGroupByLevel(unlocks);
const labelled = app.game.levelUp.after - app.game.levelUp.before > 1;
return groups.map(function (group) {
return uiEl('div',{ className:'levelup-group',children:[labelled ? uiLevelLabel(group.level,unlocks.indexOf(group.unlocks[0])) :null,uiUnlockGroup(app.game.world,group,unlocks)] });
});
}
function uiRenderLevelUp(app) {
const levelUp = app.game.levelUp;
const section = uiEl('section',{
className:'screen screen-card levelup-screen',
attrs:{ 'data-screen':'levelup' },
children:[
uiEl('p',{ className:'levelup-kicker',text:'LEVEL UP' }),
uiEl('h1',{ className:'levelup-title',text:'LV ' + levelUp.after }),
uiEl('p',{ className:'levelup-rank',text:rankFor(levelUp.after) }),
uiEl('div',{ className:'levelup-unlocks',attrs:{ role:'group','aria-label':'Unlocked' },children:uiUnlockGroups(app) }),
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
function uiLevelUpAnnounce(app) {
const lines = uiUnlockLines(app);
const unlocked = lines.length > 0 ? ' Unlocked: ' + lines.join('; ') + '.' :'';
return 'Rank: ' + rankFor(app.game.levelUp.after) + '.' + unlocked;
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

export { uiLevelUpScreen, uiOpenLevelUp };

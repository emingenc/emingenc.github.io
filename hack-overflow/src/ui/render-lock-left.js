import { uiEl } from './dom.js';
import { pyRepr } from '../py/repr.js';
import { uiInputAssignments } from './format.js';
import { lockName } from '../game/messages.js';
import { ui } from './app.js';
import { uiVerdictHeld } from './render-submit-panel.js';
import { uiDecryptScramble } from './breach-exploits.js';

function uiFamilyName(familyKey) {
const family = ui.content.families.find(function (item) { return item.key === familyKey; });
return family.name;
}
function uiProblemByKey(key) {
return ui.content.problems.find(function (problem) { return problem.key === key; });
}
const UI_LOCK_HEADING_KEY = 'lock-header';
const HUD_PILL_LABEL = { open:'FIRST TRY',won:'FIRST TRY ✓',lost:'FIRST TRY USED',shown:'ANSWER SHOWN' };
const HUD_PILL_SPOKEN = { open:'First try still open.',won:'First try won.',lost:'First try used.',shown:'Answer shown: this breach pays 0 stars.' };
const HUD_PILL_CLASS = { open:'hud-pill-open',won:'hud-pill-won',lost:'hud-pill-lost',shown:'hud-pill-lost' };

const uiPillFirstTry = new WeakMap();
function uiShownFirstTry(viewLock,app) {
const state = viewLock.revealed ? 'shown' :viewLock.firstTry;
const breach = app.game.breach;
if (!breach) return state;
if (!uiVerdictHeld(app)) uiPillFirstTry.set(breach,state);
return uiPillFirstTry.has(breach) ? uiPillFirstTry.get(breach) :state;
}
function uiFirstTryPill(viewLock,app) {
const shown = uiShownFirstTry(viewLock,app);
const attrs = { role:'img','aria-label':HUD_PILL_SPOKEN[shown] };
if (shown !== 'shown') attrs.title = viewLock.firstTryRule;
return uiEl('span',{ className:'hud-pill ' + HUD_PILL_CLASS[shown],text:HUD_PILL_LABEL[shown],attrs:attrs });
}
function uiHudSoundButton(app) {
return uiEl('button',{
className:'btn-icon',
text:app.soundOn ? '🔊' :'🔇',
attrs:{ type:'button','data-action':'toggle-sound','data-focus-key':'toggle-sound','aria-label':'Sound' },
});
}
function uiHudMenuButton() {
return uiEl('button',{
className:'btn-icon',
text:'☰',
attrs:{ type:'button','data-action':'open-menu','data-focus-key':'open-menu','aria-label':'Menu' },
});
}
function uiEarlyIdentityText(ctx) {
const breach = ctx.app.game.breach;
if (!breach.known && !breach.used.decrypt) return null;
const note = breach.used.decrypt ? 'revealed by DECRYPT' :'known: you already breached this lock';
return { id:ctx.problem.number + '. ' + ctx.problem.name,note,decrypted:Boolean(breach.used.decrypt) };
}
function uiTitleShown(lock,app) {
return 'number' in lock && (lock.revealed || !uiVerdictHeld(app));
}
function uiLockHeaderText(ctx) {
const lock = ctx.view.lock;
if (uiTitleShown(lock,ctx.app)) return { id:lock.number + '. ' + lock.name,note:lock.revealed ? 'revealed by SHOW LINE' :'breached: title decrypted' };
return uiEarlyIdentityText(ctx) || { id:lockName(ctx.problem.key),note:'title hidden until you breach it' };
}
function uiLockTitle(ctx,text) {
const attrs = { tabindex:'-1','data-focus-key':UI_LOCK_HEADING_KEY };
const scramble = text.decrypted ? uiDecryptScramble(ctx.app,text.id) :null;
return scramble ? uiEl('h1',{ className:'lock-id',attrs,children:scramble }) :uiEl('h1',{ className:'lock-id',text:text.id,attrs });
}
function uiLockHeader(ctx) {
const text = uiLockHeaderText(ctx);
return uiEl('div',{
className:'lock-header',
children:[uiLockTitle(ctx,text),uiEl('p',{ className:'lock-hidden-note',text:text.note })],
});
}
function uiConstraintsList(constraints) {
return uiEl('ul',{
className:'constraints-list',
children:constraints.map(function (line) { return uiEl('li',{ text:line }); }),
});
}
function uiStatementBlock(viewLock) {
return uiEl('div',{
className:'statement-block',
children:[
uiEl('p',{ className:'statement',text:viewLock.statement }),
uiConstraintsList(viewLock.constraints),
],
});
}
function uiExampleCases(problem) {
return problem.cases.filter(function (testCase) { return testCase.kind === 'example'; });
}
function uiExampleItem(problem,testCase,index) {
const inputs = uiInputAssignments(problem,testCase.args).join('; ');
const text = 'Example ' + (index + 1) + ': ' + inputs + ' → ' + pyRepr(testCase.expected);
return uiEl('li',{ className:'example-item',text:text });
}
function uiExamplesList(problem) {
const items = uiExampleCases(problem).map(function (testCase,index) {
return uiExampleItem(problem,testCase,index);
});
return uiEl('ul',{ className:'examples-list',children:items });
}
function uiLockLeftColumn(ctx) {
return uiEl('div',{ className:'lock-left',children:[uiLockHeader(ctx),uiStatementBlock(ctx.view.lock),uiExamplesList(ctx.problem)] });
}

export { UI_LOCK_HEADING_KEY, uiFamilyName, uiProblemByKey, uiFirstTryPill, uiHudSoundButton, uiHudMenuButton, uiLockLeftColumn };

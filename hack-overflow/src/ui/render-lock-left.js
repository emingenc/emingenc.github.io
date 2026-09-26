import { uiEl } from './dom.js';
import { pyRepr } from '../py/repr.js';
import { uiInputAssignments, uiLockIdText, uiDayLabel } from './format.js';
import { ui } from './app.js';

function uiFamilyName(familyKey) {
const family = ui.content.families.find(function (item) { return item.key === familyKey; });
return family.name;
}
function uiProblemByKey(key) {
return ui.content.problems.find(function (problem) { return problem.key === key; });
}
function uiDailyLabel(run) {
return 'DAILY #' + uiDayLabel(run.when.day);
}
const HUD_PILL_LABEL = { open:'OPEN',won:'WON',lost:'LOST' };
const HUD_PILL_CLASS = { open:'hud-pill-open',won:'hud-pill-won',lost:'hud-pill-lost' };

function uiFirstTryPill(viewLock) {
const label = HUD_PILL_LABEL[viewLock.firstTry];
return uiEl('span',{
className:'hud-pill ' + HUD_PILL_CLASS[viewLock.firstTry],
text:label,
attrs:{ title:viewLock.firstTryRule,'aria-label':'First try: ' + label + '. ' + viewLock.firstTryRule },
});
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
function uiLockHud(ctx) {
return uiEl('div',{
className:'hud',
children:[
uiEl('span',{ className:'hud-daily',text:uiDailyLabel(ctx.run) }),
uiEl('span',{ className:'hud-family hud-title',text:uiFamilyName(ctx.view.lock.family) }),
uiFirstTryPill(ctx.view.lock),
uiHudSoundButton(ctx.app),
uiHudMenuButton(),
],
});
}
function uiLockHeaderText(ctx) {
const lock = ctx.view.lock;
if ('number' in lock) return { id:lock.number + '. ' + lock.name,note:'revealed by SHOW LINE' };
const idText = uiLockIdText(ctx.problem.key,ctx.run.when);
return { id:'LOCK 0x' + idText,note:'title hidden until you breach it' };
}
function uiLockHeader(ctx) {
const text = uiLockHeaderText(ctx);
return uiEl('div',{
className:'lock-header',
children:[
uiEl('h1',{ className:'lock-id',text:text.id,attrs:{ tabindex:'-1','data-focus-key':'lock-header' } }),
uiEl('p',{ className:'lock-hidden-note',text:text.note }),
],
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
// Plain <ul>, not <ol>: each item's own text already spells out "Example N:",
// so a browser-numbered <ol> would double the numbering and hang its marker
// outside the column with no CSS claiming it.
function uiExamplesList(problem) {
const items = uiExampleCases(problem).map(function (testCase,index) {
return uiExampleItem(problem,testCase,index);
});
return uiEl('ul',{ className:'examples-list',children:items });
}
function uiDayTransitionBanner(app) {
if (!app.dayTransitionMessage) return null;
return uiEl('p',{ className:'day-transition-banner',text:app.dayTransitionMessage });
}
function uiLockLeftColumn(ctx) {
const children = [uiDayTransitionBanner(ctx.app),uiLockHeader(ctx),uiStatementBlock(ctx.view.lock),uiExamplesList(ctx.problem)];
return uiEl('div',{ className:'lock-left',children:children.filter(Boolean) });
}

export { uiFamilyName, uiProblemByKey, uiLockHud, uiLockLeftColumn };

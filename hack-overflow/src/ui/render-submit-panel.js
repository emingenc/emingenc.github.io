import { uiEl, uiQs, UI_ROOT_ID } from './dom.js';
import { pyRepr } from '../py/repr.js';
import { VERDICT_WORDS } from '../logic/index.js';
import { testCounts } from '../judge/counts.js';
import { uiInputAssignments, uiFormatNumber, uiFormatFraction, uiMaxTestExpression, uiCostModelText } from './format.js';
import { UI_BREACH_TRACE_CLAUSE, uiSyntaxBody, uiRunPanelBody, uiRunAnnounceText, uiRuntimeErrorText } from './render-run-panel.js';
import { ui, uiRenderApp } from './app.js';

const UI_SYNTAX_ERROR_VERDICT = 'SYNTAX ERROR';
const UI_BUDGET_N_EXPLAINER = 'n = total length of the list and string inputs';
function uiProbeBreachRuleText(problem) {
const counts = testCounts(problem.cases);
return 'PROBE checks the examples — free. BREACH runs ' + counts.total + ' tests (' + counts.examples + ' examples + ' + counts.hidden + ' hidden) + the max test; ' + UI_BREACH_TRACE_CLAUSE + '.';
}
function uiSubmitHeader(result) {
if (result.verdict === UI_SYNTAX_ERROR_VERDICT) return UI_SYNTAX_ERROR_VERDICT + '.';
if (result.verdict === VERDICT_WORDS.P) return uiFormatFraction(result.of,result.of) + ' tests + max test';
if (result.test === null) return result.verdict + ' on the max test';
return result.verdict + ' on test ' + result.test + ' of ' + result.of;
}
function uiVerdictRevealMs(anim) {
if (anim.kind === 'accepted') return anim.plan.shackleAtMs;
return anim.kind === 'fail' || anim.kind === 'traced' ? anim.plan.pins[anim.plan.jamIndex].atMs :0;
}
function uiVerdictWaitMs(anim,now) {
if (!anim) return 0;
return Math.max(0,uiVerdictRevealMs(anim) - (now - anim.startedAt));
}
const uiRevealTimers = new WeakMap();
function uiBookVerdictReveal(app,waitMs) {
const breach = app.game.breach;
const anim = breach.anim;
if (breach.timers.includes(uiRevealTimers.get(anim))) return;
const timer = window.setTimeout(function () {
uiRevealTimers.delete(anim);
app.pendingScrollToVerdict = true;
uiRenderApp(app);
},Math.ceil(waitMs));
uiRevealTimers.set(anim,timer);
breach.timers.push(timer);
}
function uiVerdictHeld(app) {
const breach = app.game ? app.game.breach :null;
const waitMs = breach ? uiVerdictWaitMs(breach.anim,performance.now()) :0;
if (waitMs > 0) uiBookVerdictReveal(app,waitMs);
return waitMs > 0;
}
function uiBreachInert(app) {
return Boolean(app.judging || (app.game && app.game.revealing) || uiVerdictHeld(app));
}
function uiSubmitWrongLines(ctx,result) {
const inputs = uiInputAssignments(ctx.problem,result.input).join('; ');
const text = inputs + ' → expected ' + pyRepr(result.expected) + '; got ' + pyRepr(result.got);
return [uiEl('p',{ className:'panel-detail',text:text })];
}
function uiSubmitRuntimeLines(ctx,result) {
const inputs = uiInputAssignments(ctx.problem,result.input).join('; ');
return [uiEl('p',{ className:'panel-detail',text:inputs + ' → raised ' + (result.errorText || uiRuntimeErrorText(result.error)) })];
}
function uiSubmitSmallTleLines(ctx,result) {
const inputs = uiInputAssignments(ctx.problem,result.input).join('; ');
const text = inputs + ' → stopped before finishing (budget ' + uiFormatNumber(result.budget) + ' ops).';
return [uiEl('p',{ className:'panel-detail',text:text })];
}
function uiSubmitSmallDetailNodes(ctx,result) {
if (result.verdict === VERDICT_WORDS.W) return uiSubmitWrongLines(ctx,result);
return result.verdict === VERDICT_WORDS.R ? uiSubmitRuntimeLines(ctx,result) :uiSubmitSmallTleLines(ctx,result);
}
function uiSlowNoteFor(ctx) {
const notes = ctx.problem.slow_notes;
const hit = ctx.view.lock.line.find(function (chipText) { return notes[chipText]; });
return hit ? notes[hit] :'The loop never finished within the budget.';
}
function uiSubmitAcceptedLines(ctx,result) {
const expr = uiMaxTestExpression(ctx.problem.max);
const label = ctx.problem.max.label;
const text = 'Max test: ' + expr + ' → ' + label + ', ops ' + uiFormatFraction(result.ops,result.budget) + '.';
return [uiEl('p',{ className:'panel-detail',text:text })];
}
function uiSubmitMaxTleLines(ctx,result) {
const label = ctx.problem.max.label;
const head = 'Too slow: stopped after ' + uiFormatNumber(result.ops) + ' ops (budget ' + uiFormatNumber(result.budget)
+ ') on the max test (' + label + ') before finishing (' + UI_BUDGET_N_EXPLAINER + ').';
return [uiEl('p',{ className:'panel-detail',text:head }),uiEl('p',{ className:'panel-detail',text:uiSlowNoteFor(ctx) })];
}
function uiSubmitMaxGenericLines(ctx,result) {
const expr = uiMaxTestExpression(ctx.problem.max);
const label = ctx.problem.max.label;
const head = 'Max test: ' + expr + ' → ' + label + ', ops ' + uiFormatFraction(result.ops,result.budget) + '.';
const lines = [uiEl('p',{ className:'panel-detail',text:head })];
if (result.error) lines.push(uiEl('p',{ className:'panel-detail',text:'raised ' + (result.errorText || uiRuntimeErrorText(result.error)) }));
return lines;
}
function uiSubmitDetailNodes(ctx,result) {
if (result.verdict === VERDICT_WORDS.P) return uiSubmitAcceptedLines(ctx,result);
if (result.test !== null) return uiSubmitSmallDetailNodes(ctx,result);
return result.verdict === VERDICT_WORDS.T ? uiSubmitMaxTleLines(ctx,result) :uiSubmitMaxGenericLines(ctx,result);
}
function uiSubmitPanelBody(ctx,result) {
if (result.verdict === UI_SYNTAX_ERROR_VERDICT) return uiEl('div',{ className:'test-panel-body',children:[uiSyntaxBody(ctx)] });
const header = uiEl('p',{ className:'panel-header',text:uiSubmitHeader(result) });
return uiEl('div',{ className:'test-panel-body',children:[header].concat(uiSubmitDetailNodes(ctx,result)) });
}
function uiPanelAnnounceText(kind,data) {
return kind === 'run' ? uiRunAnnounceText(data) :uiSubmitHeader(data);
}
function uiCostModelDetails(ctx) {
const attrs = {};
if (ctx.app.costModelOpen) attrs.open = 'open';
const details = uiEl('details',{
className:'cost-model',
attrs:attrs,
children:[uiEl('summary',{ text:'COST MODEL' }),uiEl('p',{ className:'cost-model-text',text:uiCostModelText(ui.content.budget) })],
});
details.addEventListener('toggle',function () { ctx.app.costModelOpen = details.open; });
return details;
}
function uiTestPanelData(ctx) {
const lock = ctx.view.lock;
const kind = ctx.app.lastPanelKind;
if (kind === 'submit' && lock.lastSubmit) return { kind:'submit',data:lock.lastSubmit };
if (kind === 'run' && lock.lastRun) return { kind:'run',data:lock.lastRun };
if (lock.lastSubmit) return { kind:'submit',data:lock.lastSubmit };
return lock.lastRun ? { kind:'run',data:lock.lastRun } :null;
}
function uiEmptyPanelBody(ctx) {
const text = uiProbeBreachRuleText(ctx.problem);
return uiEl('div',{ className:'test-panel-body test-panel-empty',children:[uiEl('p',{ className:'panel-detail',text:text })] });
}
function uiTestPanelBody(ctx,picked) {
if (!picked) return uiEmptyPanelBody(ctx);
return picked.kind === 'run' ? uiRunPanelBody(ctx,picked.data) :uiSubmitPanelBody(ctx,picked.data);
}
function uiMountedBodyHeight() {
const root = uiQs(UI_ROOT_ID);
const mounted = root ? root.querySelector('.test-panel-body') :null;
return mounted && typeof mounted.getBoundingClientRect === 'function' ? mounted.getBoundingClientRect().height :0;
}
function uiKeepMountedBodyHeight(body) {
const height = uiMountedBodyHeight();
if (height) body.style.minHeight = height + 'px';
return body;
}
function uiJudgingPanelBody() {
return uiKeepMountedBodyHeight(uiEl('div',{
className:'test-panel-body test-panel-judging',
children:[uiEl('p',{ className:'panel-detail',text:'Judging…' })],
}));
}
function uiBreachingPanelBody() {
return uiKeepMountedBodyHeight(uiEl('div',{
className:'test-panel-body test-panel-breaching',
children:[uiEl('p',{ className:'panel-header',text:'BREACHING…' })],
}));
}
function uiCurrentPanelBody(ctx) {
if (ctx.app.judging) return uiJudgingPanelBody();
return uiVerdictHeld(ctx.app) ? uiBreachingPanelBody() :uiTestPanelBody(ctx,uiTestPanelData(ctx));
}
function uiTestPanel(ctx) {
return uiEl('div',{
className:'test-panel',
attrs:{ role:'group','aria-label':'Test results' },
children:[uiCurrentPanelBody(ctx),uiCostModelDetails(ctx)],
});
}

export { UI_SYNTAX_ERROR_VERDICT, uiPanelAnnounceText, uiTestPanel, uiProbeBreachRuleText, uiVerdictWaitMs, uiVerdictHeld, uiBreachInert };

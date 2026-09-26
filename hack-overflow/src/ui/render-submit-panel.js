import { uiEl } from './dom.js';
import { pyRepr } from '../py/repr.js';
import { VERDICT_WORDS } from '../logic/index.js';
import { testCounts } from '../judge/counts.js';
import { uiInputAssignments, uiFormatNumber, uiFormatFraction, uiMaxTestExpression, uiCostModelText } from './format.js';
import { uiSyntaxBody, uiRunPanelBody, uiRunAnnounceText, uiRuntimeErrorText } from './render-run-panel.js';
import { ui } from './app.js';

// Mirrors logic/submit-view.js's SYNTAX_ERROR_VERDICT; that module does not
// export it, so the UI keeps its own copy of this display constant.
const UI_SYNTAX_ERROR_VERDICT = 'SYNTAX ERROR';
// n is never one hand-picked number: a problem's max test can size more than
// one list or string, so every budget line names what n actually counts
// instead of implying it is a single argument's length.
const UI_BUDGET_N_EXPLAINER = 'n = total length of the list and string inputs';
/**
 * "N tests (E examples + H hidden), then the max test", built from the one
 * {examples, hidden, total} count set every panel and the onboarding banner
 * read, so this string can never hardcode a count.
 * @param {object} problem - a merged content.gen.js problem
 * @returns {string} the test-count sentence
 */
function uiTestCountsText(problem) {
const counts = testCounts(problem.cases);
return counts.total + ' tests (' + counts.examples + ' examples + ' + counts.hidden + ' hidden), then the max test.';
}
function uiSubmitHeader(result) {
if (result.verdict === UI_SYNTAX_ERROR_VERDICT) return UI_SYNTAX_ERROR_VERDICT + '.';
if (result.verdict === VERDICT_WORDS.P) return uiFormatFraction(result.of,result.of) + ' tests + max test';
if (result.test === null) return result.verdict + ' on the max test';
return result.verdict + ' on test ' + result.test + ' of ' + result.of;
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
// States the cost only, never the fix: this is the sole TLE sentence, and
// the label and budget both come from the problem's own data so no
// problem's n or budget is ever a hand-picked number.
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
return uiEl('details',{
className:'cost-model',
attrs:attrs,
children:[uiEl('summary',{ text:'COST MODEL' }),uiEl('p',{ className:'cost-model-text',text:uiCostModelText(ui.content.budget) })],
});
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
const text = 'RUN checks the examples. SUBMIT runs the ' + uiTestCountsText(ctx.problem);
return uiEl('div',{ className:'test-panel-body test-panel-empty',children:[uiEl('p',{ className:'panel-detail',text:text })] });
}
function uiTestPanelBody(ctx,picked) {
if (!picked) return uiEmptyPanelBody(ctx);
return picked.kind === 'run' ? uiRunPanelBody(ctx,picked.data) :uiSubmitPanelBody(ctx,picked.data);
}
// Shown while the judge worker is computing a RUN/SUBMIT verdict
// (app.judging, set by dispatch-audit.js) so the page stays readable and
// responsive instead of appearing frozen for however long that judge run
// takes.
function uiJudgingPanelBody() {
return uiEl('div',{
className:'test-panel-body test-panel-judging',
children:[uiEl('p',{ className:'panel-detail',text:'Judging…' })],
});
}
function uiTestPanel(ctx) {
const body = ctx.app.judging ? uiJudgingPanelBody() :uiTestPanelBody(ctx,uiTestPanelData(ctx));
return uiEl('div',{
className:'test-panel',
attrs:{ role:'group','aria-label':'Test results' },
children:[body,uiCostModelDetails(ctx)],
});
}

export { UI_SYNTAX_ERROR_VERDICT, uiPanelAnnounceText, uiTestPanel, uiTestCountsText };

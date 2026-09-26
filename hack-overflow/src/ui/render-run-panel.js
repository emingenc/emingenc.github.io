import { uiEl } from './dom.js';
import { pyRepr } from '../py/repr.js';
import { lineTextFor, parseCandidate, VERDICT_WORDS } from '../logic/index.js';
import { uiInputAssignments } from './format.js';

function uiSyntaxCheck(ctx) {
const line = ctx.run.lock.line;
const text = lineTextFor(ctx.problem,line);
if (text === '') return { hasError:false,chip:null,message:null };
const result = parseCandidate(ctx.problem,text);
if (result.ok) return { hasError:false,chip:null,message:null };
const chip = result.chip === null ? line.length - 1 :result.chip;
return { hasError:true,chip:chip,message:result.message };
}
function uiSyntaxFallbackMessage(ctx) {
if (ctx.syntax.hasError) return ctx.syntax.message;
return 'You changed the line since this SYNTAX ERROR. Run or submit again.';
}
function uiSyntaxBody(ctx) {
return uiEl('p',{ className:'panel-detail panel-syntax',text:'SyntaxError (game parser): ' + uiSyntaxFallbackMessage(ctx) });
}
// A runtime error is a bare pyClass string until a CPython-style `message`
// is attached to it; this accepts both shapes so the display upgrades
// itself once that data lands, without another UI change.
function uiErrorClass(error) {
return typeof error === 'string' ? error :error.pyClass;
}
function uiRuntimeErrorText(error) {
const message = typeof error === 'string' ? null :error.message;
return message ? uiErrorClass(error) + ': ' + message :uiErrorClass(error);
}
function uiExampleVerdictWord(example) {
if (example.pass) return 'PASS';
if (example.error) return uiErrorClass(example.error);
return example.got === null ? VERDICT_WORDS.T :VERDICT_WORDS.W;
}
function uiExampleGotText(example) {
if (example.error) return 'raised ' + (example.errorText || uiRuntimeErrorText(example.error));
if (!example.pass && example.got === null) return 'timed out';
return 'got ' + pyRepr(example.got);
}
function uiExampleRow(problem,example,index) {
const mark = example.pass ? '✓' :'✗';
const inputs = uiInputAssignments(problem,example.input).join('; ');
const text = 'Example ' + (index + 1) + ': ' + mark + ' ' + uiExampleVerdictWord(example) + '. '
+ inputs + ' → expected ' + pyRepr(example.expected) + '; ' + uiExampleGotText(example);
return uiEl('li',{ className:example.pass ? 'example-result pass' :'example-result fail',text:text });
}
function uiRunSummary(panelData) {
return panelData.message ? uiEl('p',{ className:'panel-summary',text:panelData.message }) :null;
}
function uiRunResultsBody(ctx,panelData) {
const rows = panelData.examples.map(function (example,index) { return uiExampleRow(ctx.problem,example,index); });
const children = [uiEl('ol',{ className:'example-results-list',children:rows })];
const summary = uiRunSummary(panelData);
if (summary) children.push(summary);
return uiEl('div',{ className:'test-panel-body',children:children });
}
function uiRunPanelBody(ctx,panelData) {
if (!panelData.ok) return uiEl('div',{ className:'test-panel-body',children:[uiSyntaxBody(ctx)] });
return uiRunResultsBody(ctx,panelData);
}
function uiRunAnnounceText(data) {
if (!data.ok) return 'SYNTAX ERROR.';
if (data.message) return data.message;
const passCount = data.examples.filter(function (example) { return example.pass; }).length;
return passCount + ' of ' + data.examples.length + ' examples pass.';
}

export { uiSyntaxCheck, uiSyntaxBody, uiRunPanelBody, uiRunAnnounceText, uiRuntimeErrorText };

import { uiEl, uiLeetcodeLink, uiAnnounce } from './dom.js';
import { isFullPass, VERDICT_WORDS, MAX_STARS_PER_LOCK } from '../logic/index.js';
import { segmentIntoChips } from '../logic/line.js';
import { prettyLine, classForm } from '../logic/solution-form.js';
import { uiMaxTestExpression, uiFormatNumber, uiFormatFraction, uiStarGlyphs } from './format.js';
import { UI_SYNTAX_ERROR_VERDICT } from './render-submit-panel.js';
import { uiProblemByKey } from './render-lock-left.js';

const UI_COPIED_ANNOUNCE = 'Copied to clipboard.';
const UI_COPY_FALLBACK_ANNOUNCE = 'Copy failed. The class form is selected: press Ctrl/Cmd+C to copy.';

function uiSolveLink(slug) {
return uiLeetcodeLink(slug,'SOLVE IT FOR REAL ↗');
}
function uiResultHeader(view) {
const lock = view.lock;
const title = uiEl('h1',{ className:'result-title',text:lock.number + '. ' + lock.name,attrs:{ tabindex:'-1','data-focus-key':'result-header' } });
return uiEl('div',{ className:'result-header',children:[title,uiSolveLink(lock.slug)] });
}
function uiResultFamilyBlock(view,problem) {
return uiEl('div',{
className:'result-family',
children:[
uiEl('p',{ className:'result-idea',text:problem.idea }),
uiEl('p',{ className:'result-invariant',text:'Invariant: ' + view.lock.invariant }),
],
});
}
function uiResultComplexity(view) {
const text = 'Time ' + view.lock.time + ' | Space ' + view.lock.space;
return uiEl('p',{ className:'result-complexity',text:text });
}
function uiResultMaxTest(ctx) {
const result = ctx.run.lock.lastSubmit;
if (!result) return null;
const expr = uiMaxTestExpression(ctx.problem.max);
const text = 'Max test: ' + expr + ' → n=' + uiFormatNumber(result.n) + ', ops ' + uiFormatFraction(result.ops,result.budget) + '.';
return uiEl('p',{ className:'result-max-test',text:text });
}
function uiStarPips(stars) {
return uiEl('p',{
className:'result-stars',
text:uiStarGlyphs(stars),
attrs:{ 'aria-label':stars + ' of ' + MAX_STARS_PER_LOCK + ' stars' },
});
}
function uiJudgedVerdictWord(outcomes) {
if (outcomes === 'S') return UI_SYNTAX_ERROR_VERDICT;
if (isFullPass(outcomes)) return VERDICT_WORDS.P;
const wordByLetter = { W:VERDICT_WORDS.W,R:VERDICT_WORDS.R,T:VERDICT_WORDS.T };
const failLetter = outcomes.split('').find(function (letter) { return wordByLetter[letter]; });
return failLetter ? wordByLetter[failLetter] :VERDICT_WORDS.W;
}
// Each row names whether the candidate reached this state via RUN (examples
// only) or SUBMIT (the full hidden + max test run), so the evidence never
// implies more coverage than that action actually checked.
// A line first RUN and later SUBMITted is labelled SUBMIT: that SUBMIT is
// what counted against the first try.
function uiJudgedKindLabel(judgedEntry,submittedTexts) {
return judgedEntry.kind === 'submit' || submittedTexts.has(judgedEntry.text) ? 'SUBMIT' :'RUN';
}
function uiJudgedRow(judgedEntry,index,submittedTexts) {
const word = uiJudgedVerdictWord(judgedEntry.outcomes);
const text = (index + 1) + '. ' + uiJudgedKindLabel(judgedEntry,submittedTexts) + ': ' + judgedEntry.text + ' → ' + word;
return uiEl('li',{ className:word === VERDICT_WORDS.P ? 'judged-row pass' :'judged-row fail',text:text });
}
function uiResultEvidence(ctx) {
const submittedTexts = new Set((ctx.run.lock.submitted || []).map(function (entry) { return entry.text; }));
const rows = ctx.run.lock.judged.map(function (entry,index) { return uiJudgedRow(entry,index,submittedTexts); });
return uiEl('div',{
className:'result-evidence',
children:[
uiStarPips(ctx.view.lock.stars),
uiEl('h2',{ className:'evidence-heading',text:'First-try evidence' }),
uiEl('ol',{ className:'judged-list',children:rows }),
],
});
}
function uiClassFormTextFor(ctx) {
const chips = segmentIntoChips(ctx.run.lock.acceptedText,ctx.problem.palette);
return classForm(ctx.problem,prettyLine(chips));
}
function uiSelectNodeText(node) {
const selection = window.getSelection();
if (!selection) return;
const range = document.createRange();
range.selectNodeContents(node);
selection.removeAllRanges();
selection.addRange(range);
}
function uiHandleCopyFailure(codeNode) {
uiSelectNodeText(codeNode);
uiAnnounce(UI_COPY_FALLBACK_ANNOUNCE);
}
function uiHandleCopySuccess() {
uiAnnounce(UI_COPIED_ANNOUNCE);
}
function uiCopyClassForm(classText,codeNode) {
if (!navigator.clipboard || !navigator.clipboard.writeText) return uiHandleCopyFailure(codeNode);
navigator.clipboard.writeText(classText).then(uiHandleCopySuccess,function () { uiHandleCopyFailure(codeNode); });
}
function uiResultClassFormBlock(ctx) {
const classText = uiClassFormTextFor(ctx);
const codeNode = uiEl('code',{ className:'class-form-code',text:classText });
const copyButton = uiEl('button',{
className:'btn btn-ghost result-copy',
text:'COPY',
attrs:{ type:'button','data-focus-key':'copy' },
});
copyButton.addEventListener('click',function () { uiCopyClassForm(classText,codeNode); });
return uiEl('div',{
className:'result-class-form',
children:[
uiEl('h2',{ className:'class-form-heading',text:'LeetCode class Solution form' }),
uiEl('pre',{ className:'class-form-block',children:[codeNode] }),
copyButton,
],
});
}
function uiResultNextButton() {
return uiEl('button',{
className:'btn btn-primary result-next',
text:'NEXT LOCK',
attrs:{ type:'button','data-action':'next','data-focus-key':'next' },
});
}
function uiRenderResult(app,run,view) {
const problem = uiProblemByKey(run.lock.key);
const ctx = { app:app,run:run,view:view };
const children = [
uiResultHeader(view),
uiResultFamilyBlock(view,problem),
uiResultComplexity(view),
uiResultMaxTest({ run:run,problem:problem }),
uiResultClassFormBlock({ run:run,problem:problem }),
uiResultEvidence(ctx),
uiResultNextButton(),
];
return uiEl('section',{ className:'screen result-screen lock-burst',attrs:{ 'data-screen':'result' },children:children });
}

export { uiRenderResult };

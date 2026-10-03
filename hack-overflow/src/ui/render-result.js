import { uiEl, uiLeetcodeLink, uiAnnounce } from './dom.js';
import { classForm } from '../logic/solution-form.js';
import { uiMaxTestExpression, uiFormatNumber } from './format.js';

const UI_COPIED_ANNOUNCE = 'Copied to clipboard.';
const UI_COPY_FALLBACK_ANNOUNCE = 'Copy failed. The class form is selected: press Ctrl/Cmd+C to copy.';
const UI_EVIDENCE_FIRST_TRY = 'First try: every hidden test and the max test passed clean.';
const UI_EVIDENCE_SHOW_LINE = 'SHOW LINE revealed this line before the accepted BREACH.';

function uiSolveLink(slug) {
return uiLeetcodeLink(slug,'SOLVE IT FOR REAL ↗');
}
function uiResultFamilyBlock(idea,invariant) {
return uiEl('div',{
className:'result-family',
children:[
uiEl('p',{ className:'result-idea',text:idea }),
uiEl('p',{ className:'result-invariant',text:'Invariant: ' + invariant }),
],
});
}
function uiResultComplexity(time,space) {
return uiEl('p',{ className:'result-complexity',text:'Time ' + time + ' | Space ' + space });
}
function uiResultMaxTest(problem) {
const expr = uiMaxTestExpression(problem.max);
const text = 'Max test: ' + expr + ' (reference ' + uiFormatNumber(problem.max.answer_ops) + ' ops).';
return uiEl('p',{ className:'result-max-test',text:text });
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
function uiResultClassFormBlock(problem,lineText,heading) {
const classText = classForm(problem,lineText);
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
uiEl('h2',{ className:'class-form-heading',text:heading }),
uiEl('pre',{ className:'class-form-block',children:[codeNode] }),
copyButton,
],
});
}
function uiResultEvidence(note) {
return uiEl('div',{
className:'result-evidence',
children:[
uiEl('h2',{ className:'evidence-heading',text:'Evidence' }),
uiEl('p',{ className:'evidence-note',text:note }),
],
});
}

export {
uiSolveLink,
uiResultFamilyBlock,
uiResultComplexity,
uiResultMaxTest,
uiResultClassFormBlock,
uiResultEvidence,
UI_EVIDENCE_FIRST_TRY,
UI_EVIDENCE_SHOW_LINE,
};

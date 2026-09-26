import { uiEl } from './dom.js';

const UI_SLOT_MARKER = '{slot}';
function uiCodeLineIndent(line) {
return line.length - line.trimStart().length;
}
function uiPlainCodeLine(line,lineNumber) {
const indent = uiCodeLineIndent(line);
const textSpan = uiEl('span',{ className:'code-line-text',text:line.trimStart() });
textSpan.style.paddingLeft = indent + 'ch';
return uiEl('div',{
className:'code-line',
children:[uiEl('span',{ className:'code-line-num',text:String(lineNumber) }),textSpan],
});
}
function uiLineChip(text,position,hasError) {
return uiEl('button',{
className:'chip line-chip' + (hasError ? ' chip-error' :''),
text:text,
attrs:{
type:'button',
'data-action':'line-remove-' + position,
'data-focus-key':'line-chip-' + position,
'aria-label':'Remove ' + text + ' from the line',
},
});
}
function uiEditorChips(lineTexts,markIndex) {
return lineTexts.map(function (text,position) { return uiLineChip(text,position,position === markIndex); });
}
function uiSlotIndent(skeleton) {
const slotLine = skeleton.find(function (line) { return line.indexOf(UI_SLOT_MARKER) !== -1; });
return slotLine.indexOf(UI_SLOT_MARKER);
}
function uiEditorRow(ctx,lineNumber) {
const indent = uiSlotIndent(ctx.problem.skeleton);
const markIndex = ctx.syntax.hasError ? ctx.syntax.chip :null;
const chips = uiEditorChips(ctx.view.lock.line,markIndex);
const caret = uiEl('span',{ className:'caret',attrs:{ 'aria-hidden':'true' } });
const content = uiEl('span',{
className:'code-line-text editor-content',
children:chips.concat([caret]),
});
content.style.paddingLeft = indent + 'ch';
return uiEl('div',{
className:'code-line editor-row',
children:[uiEl('span',{ className:'code-line-num',text:String(lineNumber) }),content],
});
}
function uiCodePanelLine(ctx,line,index) {
const lineNumber = index + 1;
return line.indexOf(UI_SLOT_MARKER) !== -1 ? uiEditorRow(ctx,lineNumber) :uiPlainCodeLine(line,lineNumber);
}
function uiCodePanel(ctx) {
const lines = ctx.problem.skeleton.map(function (line,index) { return uiCodePanelLine(ctx,line,index); });
return uiEl('div',{ className:'code-panel',attrs:{ role:'group','aria-label':'Code' },children:lines });
}

export { UI_SLOT_MARKER, uiCodePanel };

import { uiEl } from './dom.js';

function uiHasOption(view,id) {
return view.options.some(function (option) { return option.id === id; });
}
function uiButtonAttrs(spec) {
const attrs = { type:'button','data-action':spec.id,'data-focus-key':spec.id };
if (spec.disabled) attrs.disabled = 'disabled';
if (spec.ariaLabel) attrs['aria-label'] = spec.ariaLabel;
return attrs;
}
function uiActionButton(spec) {
return uiEl('button',{ className:spec.className,text:spec.label,attrs:uiButtonAttrs(spec) });
}
// While the judge worker is computing a RUN/SUBMIT verdict (app.judging),
// every action in this screen is disabled so a chip, backspace or a second
// RUN/SUBMIT can never race the in-flight one (dispatch-audit.js already
// refuses a re-entrant action too; this keeps the buttons honest about it).
function uiPrimaryActions(ctx) {
const backspace = uiActionButton({
id:'backspace',label:'⌫',className:'btn btn-icon-lg action-backspace',
disabled:ctx.app.judging || !uiHasOption(ctx.view,'backspace'),ariaLabel:'Backspace',
});
const run = uiActionButton({
id:'run',label:'RUN',className:'btn btn-primary action-run',disabled:ctx.app.judging || !uiHasOption(ctx.view,'run'),
});
const submit = uiActionButton({
id:'submit',label:'SUBMIT',className:'btn btn-primary action-submit',disabled:ctx.app.judging || !uiHasOption(ctx.view,'submit'),
});
return uiEl('div',{
className:'action-row-primary',attrs:{ role:'group','aria-label':'Run and submit' },
children:[backspace,run,submit],
});
}
// Module-scoped: true once the first-try rule copy has been shown for the
// current page session (reset only by a fresh page load, same lifetime as
// app state); shown once, under the actions, on the first lock of a session.
let uiFirstTryRuleShownThisSession = false;
function uiFirstTryRuleNote(ctx) {
if (uiFirstTryRuleShownThisSession) return null;
uiFirstTryRuleShownThisSession = true;
return uiEl('p',{ className:'first-try-note',text:'FIRST TRY: ' + ctx.view.lock.firstTryRule });
}
function uiSecondaryActions(ctx) {
const clear = uiActionButton({ id:'clear',label:'CLEAR',className:'btn btn-ghost',disabled:ctx.app.judging || !uiHasOption(ctx.view,'clear') });
const children = [clear];
if (uiHasOption(ctx.view,'show-line')) {
children.push(uiActionButton({ id:'show-line',label:'SHOW LINE',className:'btn btn-ghost btn-warn',disabled:ctx.app.judging }));
}
const note = uiFirstTryRuleNote(ctx);
if (note) children.push(note);
return uiEl('div',{ className:'action-row-secondary',children:children });
}
function uiActionRows(ctx) {
return uiEl('div',{ className:'action-rows',children:[uiPrimaryActions(ctx),uiSecondaryActions(ctx)] });
}

export { uiHasOption, uiActionRows };

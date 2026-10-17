import { uiEl } from './dom.js';
import { SHOW_LINE_THRESHOLD } from '../logic/run-judge.js';
import { UI_BREACH_TRACE_CLAUSE } from './render-run-panel.js';
import { uiVerdictHeld, uiBreachInert } from './render-submit-panel.js';
import { uiProbePassedOnLine } from './onboarding.js';

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
function uiOfferedButton(ctx,spec) {
return uiActionButton({ ...spec,disabled:uiBreachInert(ctx.app) || !uiHasOption(ctx.view,spec.id) });
}
function uiPrimaryActions(ctx) {
const passed = uiProbePassedOnLine(ctx.app);
const backspace = uiOfferedButton(ctx,{ id:'backspace',label:'⌫',className:'btn btn-icon-lg action-backspace',ariaLabel:'Backspace' });
const probe = uiOfferedButton(ctx,{ id:'run',label:'PROBE',className:passed ? 'btn action-run' :'btn btn-primary action-run',ariaLabel:'PROBE: check the examples, free' });
const breach = uiOfferedButton(ctx,{ id:'submit',label:'BREACH',className:passed ? 'btn btn-primary action-submit' :'btn action-submit',ariaLabel:'BREACH: run every test and the max test; ' + UI_BREACH_TRACE_CLAUSE });
return uiEl('div',{
className:'action-row-primary',attrs:{ role:'group','aria-label':'Probe and breach' },
children:[backspace,probe,breach],
});
}
function uiShowLineShown(ctx) {
if (!uiVerdictHeld(ctx.app)) return uiHasOption(ctx.view,'show-line');
const lock = ctx.run.lock;
const breach = ctx.app.game.breach;
const thisBreach = breach.anim.kind === 'accepted' || breach.note === 'replay' ? 0 :1;
return !lock.revealed && lock.visibleFails - thisBreach >= SHOW_LINE_THRESHOLD;
}
function uiSecondaryActions(ctx) {
const children = [uiOfferedButton(ctx,{ id:'clear',label:'CLEAR',className:'btn btn-ghost' })];
if (uiShowLineShown(ctx)) {
children.push(uiOfferedButton(ctx,{ id:'show-line',label:'SHOW LINE',className:'btn btn-ghost btn-warn' }));
}
return uiEl('div',{ className:'action-row-secondary',children:children });
}
function uiActionRows(ctx) {
return uiEl('div',{ className:'action-rows',children:[uiPrimaryActions(ctx),uiSecondaryActions(ctx)] });
}

export { uiHasOption, uiActionRows };

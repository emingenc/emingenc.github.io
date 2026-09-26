import { uiEl } from './dom.js';
import { uiProblemByKey, uiLockHud, uiLockLeftColumn } from './render-lock-left.js';
import { uiSyntaxCheck } from './render-run-panel.js';
import { uiOnboardingBanner } from './onboarding.js';
import { uiCodePanel } from './render-code.js';
import { uiTraySection } from './render-tray.js';
import { uiActionRows } from './render-actions.js';
import { uiTestPanel } from './render-submit-panel.js';

function uiLockContext(app,run,view) {
const problem = uiProblemByKey(run.lock.key);
const ctx = { app:app,run:run,view:view,problem:problem };
ctx.syntax = uiSyntaxCheck(ctx);
return ctx;
}
function uiLockRightColumn(ctx) {
const onboarding = uiOnboardingBanner(ctx.app);
const children = [uiCodePanel(ctx),onboarding,uiTraySection(ctx),uiActionRows(ctx),uiTestPanel(ctx)];
return uiEl('div',{ className:'lock-right',children:children.filter(Boolean) });
}
function uiRenderLock(app,run,view) {
const ctx = uiLockContext(app,run,view);
const grid = uiEl('div',{ className:'lock-grid',children:[uiLockLeftColumn(ctx),uiLockRightColumn(ctx)] });
return uiEl('section',{ className:'screen lock-screen',attrs:{ 'data-screen':'lock' },children:[uiLockHud(ctx),grid] });
}

export { uiRenderLock };

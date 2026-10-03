import { uiEl } from './dom.js';
import { uiProblemByKey, uiLockLeftColumn } from './render-lock-left.js';
import { uiSyntaxCheck } from './render-run-panel.js';
import { uiOnboardingBanner } from './onboarding.js';
import { uiCodePanel, uiChipDropGhosts } from './render-code.js';
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
const children = [uiCodePanel(ctx),onboarding,uiTraySection(ctx),uiActionRows(ctx)].concat(uiChipDropGhosts(ctx));
return uiEl('div',{ className:'lock-right',children:children.filter(Boolean) });
}
function uiLockBody(app,run,view) {
const ctx = uiLockContext(app,run,view);
return uiEl('div',{ className:'lock-grid',children:[uiLockLeftColumn(ctx),uiLockRightColumn(ctx),uiTestPanel(ctx)] });
}

export { uiLockBody };

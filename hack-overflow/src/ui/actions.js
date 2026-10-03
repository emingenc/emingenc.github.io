import { uiIsAuditActionId, uiLineRemovePosition } from './line-actions.js';
import { uiApplyAuditAction } from './dispatch-audit.js';
import { uiIsNavActionId, uiApplyNavAction } from './dispatch-nav.js';
import { uiScreenFor } from './screens.js';

function uiIsBreachAuditId(actionId) {
return uiIsAuditActionId(actionId) || uiLineRemovePosition(actionId) !== null;
}
async function uiApplyAction(app,actionId) {
if (uiIsNavActionId(actionId)) {
await uiApplyNavAction(app,actionId);
return;
}
if (app.screen === 'breach' && uiIsBreachAuditId(actionId)) {
await uiApplyAuditAction(app,actionId);
return;
}
const screen = uiScreenFor(app);
if (screen.applyAction) screen.applyAction(app,actionId);
}

export { uiApplyAction };

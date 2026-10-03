import { uiIsAuditActionId, uiLineRemovePosition } from './line-actions.js';
import { uiApplyAuditAction } from './dispatch-audit.js';
import { uiIsNavActionId, uiApplyNavAction } from './dispatch-nav.js';
import { uiScreenFor } from './screens.js';

const UI_STORY_ACTIONS = ['story-next','story-skip','toggle-sound'];
function uiIsBreachAuditId(actionId) {
return uiIsAuditActionId(actionId) || uiLineRemovePosition(actionId) !== null;
}
async function uiApplyAction(app,actionId) {
if (app.story && !UI_STORY_ACTIONS.includes(actionId)) return;
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

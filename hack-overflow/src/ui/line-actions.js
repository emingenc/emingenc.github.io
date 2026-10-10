const UI_AUDIT_ACTION_IDS = {
backspace:1,clear:1,run:1,submit:1,'show-line':1,
};
function uiChipPosition(actionId) {
return actionId.indexOf('chip-') === 0 ? Number(actionId.slice('chip-'.length)) :null;
}
function uiIsAuditActionId(actionId) {
return Boolean(UI_AUDIT_ACTION_IDS[actionId]) || uiChipPosition(actionId) !== null;
}

export { uiChipPosition, uiIsAuditActionId };

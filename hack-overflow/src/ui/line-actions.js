import { ui } from './app.js';

const UI_AUDIT_ACTION_IDS = {
backspace:1,clear:1,run:1,submit:1,'show-line':1,next:1,practice:1,'next-day':1,
};
function uiChipPosition(actionId) {
return actionId.indexOf('chip-') === 0 ? Number(actionId.slice('chip-'.length)) :null;
}
function uiLineRemovePosition(actionId) {
const prefix = 'line-remove-';
return actionId.indexOf(prefix) === 0 ? Number(actionId.slice(prefix.length)) :null;
}
function uiIsAuditActionId(actionId) {
return Boolean(UI_AUDIT_ACTION_IDS[actionId]) || uiChipPosition(actionId) !== null;
}
function uiKeepIndices(line,position) {
return line.slice(0,position).concat(line.slice(position + 1));
}
function uiAddChipByPaletteIndex(run,paletteIndex) {
const trayPosition = run.lock.tray.order.indexOf(paletteIndex);
return ui.audit.act(run,'chip-' + trayPosition);
}
function uiRemoveLineChipAt(run,position) {
const line = run.lock.line;
if (position < 0 || position >= line.length) return run;
const keep = uiKeepIndices(line,position);
const cleared = ui.audit.act(run,'clear');
return keep.reduce(uiAddChipByPaletteIndex,cleared);
}

export { uiChipPosition, uiLineRemovePosition, uiIsAuditActionId, uiRemoveLineChipAt };

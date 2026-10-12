
const LAB_ID = 'beam';
const LAB_LEVEL = 'beam-1';
const BEAM_MODES = ['w1','w2'];

function uiBeamCleared(app) {
const labs = app.game.save.labs;
return Boolean(labs[LAB_ID] && labs[LAB_ID][LAB_LEVEL] && labs[LAB_ID][LAB_LEVEL].best > 0);
}
function uiBeamFirstMode(app) {
return uiBeamCleared(app) ? 'w2' :'w1';
}
function uiBeamOtherModes(app,mode) {
return uiBeamCleared(app) ? BEAM_MODES.filter((id) => id !== mode) :[];
}

export { BEAM_MODES,uiBeamCleared,uiBeamFirstMode,uiBeamOtherModes };

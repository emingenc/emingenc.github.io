import { uiEl, uiPointerIsCoarse } from './dom.js';


const UI_HINT_TOUCH = 'Tap the map to walk. Follow the pulsing arrow.';
const UI_HINT_KEYS = 'Arrow keys walk. Follow the pulsing arrow.';

function uiCreateHint() {
return uiEl('p',{
className:'grid-hint',
text:uiPointerIsCoarse() ? UI_HINT_TOUCH :UI_HINT_KEYS,
attrs:{ 'aria-hidden':'true' },
});
}
function uiHintWanted(game) {
const spawn = game.world.spawn;
const pos = game.avatar.pos;
return game.progress.breached.size === 0 && pos.col === spawn.col && pos.row === spawn.row;
}
function uiSyncHint(game) {
const node = game.stage.hint;
const hidden = !uiHintWanted(game);
if (node.hidden !== hidden) node.hidden = hidden;
}

export { uiCreateHint, uiHintWanted, uiSyncHint };

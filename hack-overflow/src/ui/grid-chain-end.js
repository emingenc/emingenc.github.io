import { hasBadge } from '../game/ext/badge-ops.js';
import { payoff } from '../game/quest/first-bad-commit.js';
import { uiRenderKeepingFocus } from './app.js';
import { uiCue } from './audio-wire.js';
import { uiEl } from './dom.js';

const BADGE_NAMES = Object.freeze({ 'reviewer-1':'REVIEWER I',[payoff.badge]:payoff.badgeName });
const BADGE_SEPARATOR = ' · ';

function uiBadgesLine(ext) {
const earned = (ext.badges || []).filter((id) => Object.hasOwn(BADGE_NAMES,id));
return earned.length > 0 ? 'BADGES: ' + earned.map((id) => BADGE_NAMES[id]).join(BADGE_SEPARATOR) :null;
}
function uiEndLine() {
const line = payoff.endingLine;
return uiEl('p',{ className:'ghost-quip',children:[uiEl('span',{ className:'ghost-quip-who',text:line.who }),' ' + line.text] });
}
function uiEndingExtras(app) {
uiCue(app,'ROOT_ACCESS');
const ending = app.game.ending;
const ext = app.game.ext || {};
const badges = uiBadgesLine(ext);
const line = hasBadge(ext,payoff.badge);
if (!ending || (!badges && !line)) return;
ending.extras = function () {
return [line && uiEndLine(),badges && uiEl('p',{ className:'ending-stat',text:badges }) ].filter(Boolean);
};
if (app.screen === 'ending') uiRenderKeepingFocus(app);
}

export { BADGE_NAMES,uiBadgesLine,uiEndingExtras };

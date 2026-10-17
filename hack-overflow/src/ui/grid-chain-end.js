import { hasBadge } from '../game/ext/badge-ops.js';
import { payoff } from '../game/quest/first-bad-commit.js';
import { uiRenderApp,uiRenderKeepingFocus } from './app.js';
import { uiCue } from './audio-wire.js';
import { UI_ROOT_ID,uiEl,uiQs } from './dom.js';
import { uiLinkStyle } from './lazy-style.js';
import { SKIP_KEY,uiCreditsDone,uiNewCredits,uiRenderCredits,uiSyncCredits } from './ending-credits.js';
import { uiRenderWall,uiSyncWall } from './ending-wall.js';
import { uiStoryClosed } from './story-dialogue.js';

const STYLE_HREF = 'styles/lazy/ending.css';

function uiEndLine() {
const line = payoff.endingLine;
return uiEl('p',{ className:'ghost-quip',children:[uiEl('span',{ className:'ghost-quip-who',text:line.who }),' ' + line.text] });
}
function uiRedraw(app,draw) {
if (typeof document !== 'undefined') draw(app);
}
function uiLand(credits) {
if (credits.landed) return;
credits.landed = true;
if (typeof window.scrollTo === 'function') window.scrollTo(0,0);
}
function uiStillEnding(app,ending) {
return app.screen === 'ending' && app.game.ending === ending;
}
function uiWalkFrame(app,ending,credits) {
if (!uiStillEnding(app,ending) || credits.done) {
credits.looping = false;
return;
}
if (uiSyncCredits(uiQs(UI_ROOT_ID),credits,performance.now())) {
credits.done = true;
credits.looping = false;
uiRedraw(app,uiRenderKeepingFocus);
return;
}
window.requestAnimationFrame(function () { uiWalkFrame(app,ending,credits); });
}
function uiKeepWalking(app,ending,credits) {
if (credits.looping || credits.startedAt === null || typeof window.requestAnimationFrame !== 'function') return;
credits.looping = true;
window.requestAnimationFrame(function () { uiWalkFrame(app,ending,credits); });
}
function uiStartClock(app,ending,credits) {
uiStoryClosed(app).then(function () {
if (!uiStillEnding(app,ending) || credits.startedAt !== null) return;
credits.startedAt = performance.now();
app.lastFocusKey = credits.done ? 'ending-return' :SKIP_KEY;
uiRedraw(app,uiRenderApp);
});
}
function uiHookEnding(app,ending,credits) {
const ext = app.game.ext || {};
ending.extras = function () {
credits.done = credits.done || uiCreditsDone(credits,performance.now());
return [
hasBadge(ext,payoff.badge) && uiEndLine(),
uiRenderCredits(credits),
credits.done && uiRenderWall({ ext,save:app.game.save }),
].filter(Boolean);
};
ending.rolling = function () { return !credits.done; };
ending.focusKey = function () { return credits.done ? 'ending-return' :SKIP_KEY; };
ending.skip = function () { credits.skipped = true; credits.done = true; };
ending.sync = function (root) {
uiSyncCredits(root,credits,performance.now());
if (!credits.done) return uiKeepWalking(app,ending,credits);
uiSyncWall(root,ext);
uiLand(credits);
};
}
async function uiEndingExtras(app) {
uiCue(app,'ROOT_ACCESS');
const ending = app.game.ending;
if (!ending) return;
await uiLinkStyle(STYLE_HREF);
if (!uiStillEnding(app,ending)) return;
const credits = uiNewCredits(app.game.ext || {},ending.stats);
uiHookEnding(app,ending,credits);
ending.styled = true;
uiStartClock(app,ending,credits);
uiRedraw(app,uiRenderKeepingFocus);
}

export { uiEndingExtras };

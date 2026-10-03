import { MAX_STARS_PER_LOCK } from '../logic/index.js';
import { prettyLine } from '../logic/solution-form.js';
import { segmentIntoChips } from '../logic/line.js';
import { GAME_EVENT } from '../game/game-events.js';
import { clamp01, countUpValue } from '../game/ease.js';
import { STAR_CAP_WITH_EXPLOIT } from '../game/breach.js';
import { uiEl, uiPrefersReducedMotion } from './dom.js';
import { uiEmit } from './bus.js';
import { uiEnterGrid } from './screen-grid.js';
import { uiOpenLevelUp } from './screen-levelup.js';
import { uiProblemByKey } from './render-lock-left.js';
import { uiResultFamilyBlock, uiResultComplexity, uiResultMaxTest, uiResultClassFormBlock, uiResultEvidence, uiSolveLink, UI_EVIDENCE_FIRST_TRY, UI_EVIDENCE_SHOW_LINE } from './render-result.js';

const TYPE_CHAR_MS = 22;
const TYPE_MAX_MS = 650;
const STAR_STEP_MS = 180;
const XP_COUNT_MS = 900;
const DEBRIEF_TICK_MS = 60;

function uiTitleTiming(text,reducedMotion) {
return reducedMotion ? 0 :Math.min(text.length * TYPE_CHAR_MS,TYPE_MAX_MS);
}
function uiStarAtMs(titleMs,starStep) {
return Array.from({ length:MAX_STARS_PER_LOCK },function (_,index) { return titleMs + index * starStep; });
}
function uiStarEvents(outcome,starAtMs) {
return starAtMs.slice(0,outcome.stars).map(function (atMs,index) {
return { type:GAME_EVENT.STAR,payload:{ index,of:MAX_STARS_PER_LOCK },atMs };
});
}
function uiXpEvent(outcome,atMs,durationMs) {
return { type:GAME_EVENT.XP,payload:{ gained:outcome.gained,xp:outcome.xpAfter,durationMs,source:'breach' },atMs };
}
function uiDebriefPlan(outcome,reducedMotion) {
const titleText = outcome.number + '. ' + outcome.name;
const titleMs = uiTitleTiming(titleText,reducedMotion);
const starStep = reducedMotion ? 0 :STAR_STEP_MS;
const starAtMs = uiStarAtMs(titleMs,starStep);
const starsEndMs = titleMs + MAX_STARS_PER_LOCK * starStep;
const xpDurationMs = reducedMotion || outcome.gained === 0 ? 0 :XP_COUNT_MS;
const events = [...uiStarEvents(outcome,starAtMs),uiXpEvent(outcome,starsEndMs,xpDurationMs)];
return { titleText,titleMs,starAtMs,xpAtMs:starsEndMs,xpDurationMs,events,totalMs:starsEndMs + xpDurationMs };
}
function uiScheduleDebriefEvent(event) {
return window.setTimeout(function () { uiEmit(event.type,event.payload); },event.atMs);
}
function uiStopDebriefInterval(debrief) {
if (debrief.intervalId === null) return;
window.clearInterval(debrief.intervalId);
debrief.intervalId = null;
}
function uiStopDebrief(debrief) {
debrief.timers.forEach(function (timer) { window.clearTimeout(timer); });
debrief.timers = [];
uiStopDebriefInterval(debrief);
}
function uiDebriefElapsed(debrief) {
return performance.now() - debrief.startedAt;
}
function uiDebriefTick(app) {
const debrief = app.game.debrief;
if (!debrief) return;
const elapsed = uiDebriefElapsed(debrief);
if (elapsed >= debrief.plan.totalMs) uiStopDebriefInterval(debrief);
const root = document.querySelector('[data-screen="debrief"]');
if (!root) return;
const shown = uiTitleShown(debrief.plan,elapsed);
root.querySelector('.debrief-title-shown').textContent = shown;
root.querySelector('.debrief-title-rest').textContent = debrief.plan.titleText.slice(shown.length);
root.querySelector('.debrief-xp').textContent = uiXpText(app.game.outcome,debrief.plan,elapsed);
}
function uiOpenDebrief(app) {
const outcome = app.game.outcome;
app.screen = 'debrief';
app.lastFocusKey = 'debrief-continue';
const plan = uiDebriefPlan(outcome,uiPrefersReducedMotion());
const debrief = { plan,startedAt:performance.now(),timers:plan.events.map(uiScheduleDebriefEvent),intervalId:null };
app.game.debrief = debrief;
if (plan.totalMs > 0) debrief.intervalId = window.setInterval(function () { uiDebriefTick(app); },DEBRIEF_TICK_MS);
}
function uiSyncDebrief(app,active) {
const debrief = app.game.debrief;
if (!debrief || active) return;
uiStopDebrief(debrief);
app.game.debrief = null;
}
function uiTitleShown(plan,elapsed) {
const progress = plan.titleMs > 0 ? elapsed / plan.titleMs :1;
return plan.titleText.slice(0,Math.round(clamp01(progress) * plan.titleText.length));
}
function uiStarNode(filled,delayMs) {
const node = uiEl('span',{
className:'debrief-star' + (filled ? ' debrief-star-filled' :''),
text:filled ? '★' :'☆',
attrs:{ 'aria-hidden':'true' },
});
node.style.animationDelay = delayMs + 'ms';
return node;
}
function uiStarsRow(outcome,plan,elapsed) {
const stars = plan.starAtMs.map(function (atMs,index) { return uiStarNode(index < outcome.stars,atMs - elapsed); });
return uiEl('div',{
className:'debrief-stars',
attrs:{ role:'img','aria-label':outcome.stars + ' of ' + MAX_STARS_PER_LOCK + ' stars' },
children:stars,
});
}
function uiXpShown(outcome,plan,elapsed) {
const progress = plan.xpDurationMs > 0 ? (elapsed - plan.xpAtMs) / plan.xpDurationMs :1;
return Math.round(countUpValue(0,outcome.gained,progress));
}
function uiXpText(outcome,plan,elapsed) {
const shown = uiXpShown(outcome,plan,elapsed);
if (!outcome.replay) return '+' + shown + ' XP';
if (outcome.gained > 0) return 'REPLAY +' + shown + ' XP (' + outcome.bestBefore + '★ → ' + outcome.stars + '★)';
return 'best already ' + outcome.bestBefore + '★ · +0 XP';
}
function uiDebriefNote(text) {
return uiEl('p',{ className:'debrief-note',text:text });
}
function uiExploitCapApplies(outcome) {
return Boolean(outcome.capped || outcome.exploitUsed);
}
function uiCapNote(outcome) {
if (!uiExploitCapApplies(outcome)) return null;
return uiDebriefNote('An exploit was in play: this breach is capped at ' + STAR_CAP_WITH_EXPLOIT + '★.');
}
function uiSectorNote(outcome) {
return outcome.sectorDone ? uiDebriefNote('Every lock in this sector is open: its CORE is ready.') :null;
}
function uiDebriefEvidenceNote(outcome) {
if (outcome.rawStars === 0) return UI_EVIDENCE_SHOW_LINE;
if (outcome.rawStars === MAX_STARS_PER_LOCK) {
const capNote = outcome.capped ? ' An exploit was in play, so it pays ' + outcome.stars + '★.' :'';
return UI_EVIDENCE_FIRST_TRY + capNote;
}
if (outcome.rawStars === 2) return 'Accepted against every hidden test and the max test after one or two different wrong lines.';
return 'Accepted against every hidden test and the max test after three or more different wrong lines.';
}
const UI_ACCEPTED_LINE_HEADING = 'Your accepted line as a LeetCode class Solution';
const UI_REFERENCE_LINE_HEADING = 'Reference line as a LeetCode class Solution';
function uiDebriefLineText(outcome,problem) {
if (!outcome.acceptedText) return prettyLine(problem.answer);
return prettyLine(segmentIntoChips(outcome.acceptedText,problem.palette));
}
function uiDebriefClassFormHeading(outcome) {
return outcome.acceptedText ? UI_ACCEPTED_LINE_HEADING :UI_REFERENCE_LINE_HEADING;
}
function uiDebriefIntel(outcome,plan,elapsed) {
const problem = uiProblemByKey(outcome.key);
const lineText = uiDebriefLineText(outcome,problem);
const node = uiEl('div',{
className:'debrief-intel',
children:[
uiResultFamilyBlock(problem.idea,problem.invariant),
uiResultComplexity(problem.time,problem.space),
uiResultMaxTest(problem),
uiResultClassFormBlock(problem,lineText,uiDebriefClassFormHeading(outcome)),
uiSolveLink(problem.slug),
uiResultEvidence(uiDebriefEvidenceNote(outcome)),
],
});
node.style.animationDelay = (plan.totalMs - elapsed) + 'ms';
return node;
}
function uiDebriefTitleNode(plan,elapsed) {
const shown = uiTitleShown(plan,elapsed);
return uiEl('h1',{
className:'debrief-title',
children:[
uiEl('span',{ className:'debrief-title-shown',text:shown }),
uiEl('span',{ className:'debrief-title-rest',attrs:{ 'aria-hidden':'true' },text:plan.titleText.slice(shown.length) }),
],
});
}
function uiDebriefContinueButton() {
return uiEl('button',{
className:'btn btn-primary debrief-continue',
text:'CONTINUE',
attrs:{ type:'button','data-action':'debrief-continue','data-focus-key':'debrief-continue' },
});
}
function uiDebriefChildren(outcome,plan,elapsed) {
return [
uiEl('p',{ className:'debrief-kicker',text:'BREACHED · ' + outcome.lockName }),
uiDebriefTitleNode(plan,elapsed),
uiStarsRow(outcome,plan,elapsed),
uiEl('p',{ className:'debrief-xp',text:uiXpText(outcome,plan,elapsed) }),
uiCapNote(outcome),
uiSectorNote(outcome),
uiDebriefContinueButton(),
uiDebriefIntel(outcome,plan,elapsed),
];
}
function uiRenderDebrief(app) {
const outcome = app.game.outcome;
const debrief = app.game.debrief;
const elapsed = uiDebriefElapsed(debrief);
return uiEl('section',{
className:'screen screen-card debrief-screen',
attrs:{ 'data-screen':'debrief' },
children:uiDebriefChildren(outcome,debrief.plan,elapsed).filter(Boolean),
});
}
function uiApplyDebriefAction(app,actionId) {
if (actionId !== 'debrief-continue') return false;
const outcome = app.game.outcome;
if (outcome.levelAfter > outcome.levelBefore) {
uiOpenLevelUp(app,{ before:outcome.levelBefore,after:outcome.levelAfter,unlocks:outcome.unlocks,source:'breach' });
} else {
uiEnterGrid(app);
}
return true;
}
function uiDebriefAnnounce(app) {
const outcome = app.game.outcome;
const cap = uiExploitCapApplies(outcome) ? ' Exploit used: capped at ' + STAR_CAP_WITH_EXPLOIT + ' stars.' :'';
return 'Breached ' + outcome.number + '. ' + outcome.name + ': ' + outcome.stars + ' of ' + MAX_STARS_PER_LOCK + ' stars, plus ' + outcome.gained + ' XP.' + cap;
}
function uiDebriefScreen() {
return {
id:'debrief',
render:uiRenderDebrief,
focusKey:function () { return 'debrief-continue'; },
announce:uiDebriefAnnounce,
applyAction:uiApplyDebriefAction,
sync:function (app,active) { uiSyncDebrief(app,active); },
};
}

export { uiDebriefScreen, uiOpenDebrief, uiDebriefPlan, uiXpText };

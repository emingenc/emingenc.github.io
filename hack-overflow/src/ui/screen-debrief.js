import { MAX_STARS_PER_LOCK } from '../logic/index.js';
import { prettyLine } from '../logic/solution-form.js';
import { segmentIntoChips } from '../logic/line.js';
import { GAME_EVENT } from '../game/game-events.js';
import { clamp01, countUpValue } from '../game/ease.js';
import { levelBand } from '../game/progress.js';
import { STAR_CAP_WITH_EXPLOIT } from '../game/breach.js';
import { uiEl, uiPrefersReducedMotion } from './dom.js';
import { uiEmit } from './bus.js';
import { uiEnterGrid } from './screen-grid.js';
import { uiLevelUpBody, uiLevelUpSpeech } from './screen-levelup.js';
import { uiBreachQuip } from './story-quip.js';
import { uiProblemByKey } from './render-lock-left.js';
import { uiResultFamilyBlock, uiResultComplexity, uiResultMaxTest, uiResultClassFormBlock, uiResultEvidence, uiSolveLink, UI_EVIDENCE_FIRST_TRY, UI_EVIDENCE_SHOW_LINE } from './render-result.js';

const TYPE_CHAR_MS = 22;
const TYPE_MAX_MS = 650;
const STAR_STEP_MS = 180;
const XP_COUNT_MS = 900;
const DEBRIEF_TICK_MS = 60;
const PERCENT = 100;
const XP_FLASH_MS = 500;

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
function uiLevelledUp(outcome) {
return outcome.levelAfter > outcome.levelBefore;
}
function uiOutcomeLevelUp(outcome) {
return { before:outcome.levelBefore,after:outcome.levelAfter,unlocks:outcome.unlocks };
}
function uiLevelUpEvents(outcome,atMs) {
return uiLevelledUp(outcome) ? [{ type:GAME_EVENT.LEVEL_UP,payload:uiOutcomeLevelUp(outcome),atMs }] :[];
}
function uiDebriefPlan(outcome,reducedMotion) {
const titleText = outcome.number + '. ' + outcome.name;
const titleMs = uiTitleTiming(titleText,reducedMotion);
const starStep = reducedMotion ? 0 :STAR_STEP_MS;
const starAtMs = uiStarAtMs(titleMs,starStep);
const starsEndMs = titleMs + MAX_STARS_PER_LOCK * starStep;
const xpDurationMs = reducedMotion || outcome.gained === 0 ? 0 :XP_COUNT_MS;
const totalMs = starsEndMs + xpDurationMs;
const events = [...uiStarEvents(outcome,starAtMs),uiXpEvent(outcome,starsEndMs,xpDurationMs),...uiLevelUpEvents(outcome,totalMs)];
return { titleText,titleMs,starAtMs,xpAtMs:starsEndMs,xpDurationMs,events,totalMs };
}
function uiScheduleDebriefEvent(debrief,event) {
const fire = event.type === GAME_EVENT.LEVEL_UP ? function () { uiFlushLevelUp(debrief); } :function () { uiEmit(event.type,event.payload); };
return window.setTimeout(fire,event.atMs);
}
function uiFlushLevelUp(debrief) {
const event = debrief.levelUp;
if (!event) return;
debrief.levelUp = null;
uiEmit(event.type,event.payload);
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
uiPatchXpMeter(root.querySelector('.debrief-xpmeter'),uiXpBarState(app.game.outcome,debrief.plan,elapsed));
}
function uiOpenDebrief(app) {
const outcome = app.game.outcome;
app.screen = 'debrief';
app.lastFocusKey = 'debrief-continue';
const plan = uiDebriefPlan(outcome,uiPrefersReducedMotion());
const levelUp = plan.events.find(function (event) { return event.type === GAME_EVENT.LEVEL_UP; }) ?? null;
const debrief = { plan,startedAt:performance.now(),timers:[],intervalId:null,levelUp };
debrief.timers = plan.events.map(function (event) { return uiScheduleDebriefEvent(debrief,event); });
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
function uiXpBarState(outcome,plan,elapsed) {
const band = levelBand(outcome.xpBefore + uiXpShown(outcome,plan,elapsed));
const fill = band.span > 0 ? band.into / band.span :1;
const label = band.next === null ? 'MAX LEVEL' :'LV ' + band.level + ' · ' + band.into + '/' + band.span + ' XP';
return { level:band.level,pct:Math.round(fill * PERCENT),label };
}
function uiFlashXpLabel(label) {
if (label.animate) label.animate({ color:['var(--amber)','inherit'],transform:['scale(1.3)','none'] },XP_FLASH_MS);
}
function uiPatchXpMeter(meter,state) {
const bar = meter.querySelector('.debrief-xpbar');
const fill = meter.querySelector('.debrief-xpbar-fill');
const label = meter.querySelector('.debrief-xpbar-label');
fill.style.transition = parseFloat(fill.style.width) > state.pct ? 'none' :'';
fill.style.width = state.pct + '%';
bar.setAttribute('aria-valuenow',state.pct);
bar.setAttribute('aria-valuetext',state.label);
label.textContent = state.label;
if (meter.getAttribute('data-level') === String(state.level)) return;
meter.setAttribute('data-level',state.level);
uiFlashXpLabel(label);
}
function uiXpMeter(outcome,plan,elapsed) {
const state = uiXpBarState(outcome,plan,elapsed);
const bar = uiEl('div',{
className:'debrief-xpbar',
attrs:{ role:'progressbar','aria-valuemin':'0','aria-valuemax':String(PERCENT) },
children:[uiEl('div',{ className:'debrief-xpbar-fill' })],
});
const label = uiEl('p',{ className:'debrief-xpbar-label' });
const meter = uiEl('div',{ className:'debrief-xpmeter',attrs:{ 'data-level':state.level },children:[bar,label] });
uiPatchXpMeter(meter,state);
return meter;
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
function uiDelayUntilSettled(node,timing) {
node.style.animationDelay = (timing.plan.totalMs - timing.elapsed) + 'ms';
return node;
}
function uiDebriefLesson(problem,timing) {
const children = [uiResultFamilyBlock(problem.idea,problem.invariant),uiResultComplexity(problem.time,problem.space)];
return uiDelayUntilSettled(uiEl('div',{ className:'debrief-lesson',children }),timing);
}
function uiDebriefIntel(outcome,problem,timing) {
const lineText = uiDebriefLineText(outcome,problem);
const node = uiEl('div',{
className:'debrief-intel',
children:[
uiResultMaxTest(problem),
uiResultClassFormBlock(problem,lineText,uiDebriefClassFormHeading(outcome)),
uiSolveLink(problem.slug),
uiResultEvidence(uiDebriefEvidenceNote(outcome)),
],
});
return uiDelayUntilSettled(node,timing);
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
function uiLevelUpBlock(app,timing) {
const outcome = app.game.outcome;
if (!uiLevelledUp(outcome)) return null;
const node = uiEl('div',{ className:'debrief-levelup',children:uiLevelUpBody(app.game.world,uiOutcomeLevelUp(outcome)) });
node.style.setProperty('--levelup-elapsed',(timing.plan.totalMs - timing.elapsed) + 'ms');
return node;
}
function uiDebriefChildren(app,timing) {
const outcome = app.game.outcome;
const { plan,elapsed } = timing;
const problem = uiProblemByKey(outcome.key);
return [
uiEl('p',{ className:'debrief-kicker',text:'BREACHED · ' + outcome.lockName }),
uiDebriefTitleNode(plan,elapsed),
uiStarsRow(outcome,plan,elapsed),
uiEl('p',{ className:'debrief-xp',text:uiXpText(outcome,plan,elapsed) }),
uiXpMeter(outcome,plan,elapsed),
uiLevelUpBlock(app,timing),
uiBreachQuip(outcome),
uiCapNote(outcome),
uiSectorNote(outcome),
uiDebriefLesson(problem,timing),
uiDebriefContinueButton(),
uiDebriefIntel(outcome,problem,timing),
];
}
function uiRenderDebrief(app) {
const debrief = app.game.debrief;
const elapsed = uiDebriefElapsed(debrief);
return uiEl('section',{
className:'screen screen-card debrief-screen',
attrs:{ 'data-screen':'debrief' },
children:uiDebriefChildren(app,{ plan:debrief.plan,elapsed }).filter(Boolean),
});
}
function uiApplyDebriefAction(app,actionId) {
if (actionId !== 'debrief-continue') return false;
uiFlushLevelUp(app.game.debrief);
uiEnterGrid(app);
return true;
}
function uiDebriefAnnounce(app) {
const outcome = app.game.outcome;
const cap = uiExploitCapApplies(outcome) ? ' Exploit used: capped at ' + STAR_CAP_WITH_EXPLOIT + ' stars.' :'';
const levelUp = uiLevelledUp(outcome) ? ' ' + uiLevelUpSpeech(app.game.world,uiOutcomeLevelUp(outcome)) :'';
return 'Breached ' + outcome.number + '. ' + outcome.name + ': ' + outcome.stars + ' of ' + MAX_STARS_PER_LOCK + ' stars, plus ' + outcome.gained + ' XP.' + cap + levelUp;
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

export { uiDebriefScreen, uiOpenDebrief, uiDebriefPlan, uiXpText, uiXpBarState };

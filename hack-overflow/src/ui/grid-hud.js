import { levelBand } from '../game/progress.js';
import { nextUnlock } from '../game/objective.js';
import { nextUnlockText } from '../game/messages.js';
import { countUpValue } from '../game/ease.js';
import { uiEl, uiPrefersReducedMotion } from './dom.js';
import { uiHudSoundButton, uiHudMenuButton } from './render-lock-left.js';
import { uiGridHearts } from './grid-actors.js';

const UI_PERCENT = 100;
const UI_XP_TWEEN_MS = 500;
function uiXpText(band,xp) {
return band.next === null ? 'XP ' + xp + ' · MAX' :'XP ' + xp + '/' + band.next;
}
function uiPercentAt(band,xp) {
return band.span === 0 ? UI_PERCENT :Math.round((xp - band.floor) / band.span * UI_PERCENT);
}
function uiSetBarPercent(bar,fill,percent) {
fill.style.width = percent + '%';
bar.setAttribute('aria-valuenow',String(percent));
}
function uiTickXpTween(ctx) {
if (!ctx.fill.isConnected) return;
const progress = (performance.now() - ctx.startedAt) / UI_XP_TWEEN_MS;
ctx.state.shown = countUpValue(ctx.from,ctx.target,progress);
uiSetBarPercent(ctx.bar,ctx.fill,uiPercentAt(ctx.band,ctx.state.shown));
if (progress < 1) window.requestAnimationFrame(function () { uiTickXpTween(ctx); });
}
function uiHudXpState(game) {
if (!game.hudXp) game.hudXp = { shown:game.progress.xp };
return game.hudXp;
}
function uiXpBar(game,band) {
const state = uiHudXpState(game);
const target = game.progress.xp;
if (uiPrefersReducedMotion() || target < state.shown || levelBand(state.shown).level !== band.level) state.shown = target;
const percent = uiPercentAt(band,state.shown);
const fill = uiEl('span',{ className:'grid-hud-fill' });
fill.style.width = percent + '%';
const bar = uiEl('span',{
className:'grid-hud-bar',
attrs:{ role:'progressbar','aria-label':'XP to next level','aria-valuemin':'0','aria-valuemax':'100','aria-valuenow':String(percent) },
children:[fill],
});
if (state.shown !== target) {
window.requestAnimationFrame(function () { uiTickXpTween({ bar,fill,band,state,from:state.shown,target,startedAt:performance.now() }); });
}
return bar;
}
function uiMapButton() {
return uiEl('button',{
className:'btn btn-ghost grid-hud-map',
text:'MAP',
attrs:{ type:'button','data-action':'map-open','data-focus-key':'map-open','aria-label':'Map' },
});
}
function uiHudTop(progress) {
return uiEl('div',{
className:'grid-hud-top',
children:[
uiEl('span',{ className:'grid-hud-rank',text:progress.rank }),
uiEl('span',{ className:'grid-hud-level',text:'LV ' + progress.level }),
],
});
}
function uiHudStats(game) {
const progress = game.progress;
const band = levelBand(progress.xp);
return uiEl('div',{
className:'grid-hud-stats',
children:[uiHudTop(progress),uiEl('span',{ className:'grid-hud-xp',text:uiXpText(band,progress.xp) }),uiXpBar(game,band)],
});
}
function uiHudHint(game) {
const text = nextUnlockText(game.world,nextUnlock(game.progress));
return text ? uiEl('p',{ className:'grid-hud-hint',text }) :null;
}
function uiGridHud(app) {
const children = [uiGridHearts(app),uiHudStats(app.game),uiMapButton(),uiHudSoundButton(app),uiHudMenuButton(),uiHudHint(app.game)];
return uiEl('header',{ className:'hud grid-hud',children:children.filter(Boolean) });
}

export { uiGridHud };

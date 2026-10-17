import { levelBand } from '../game/progress.js';
import { nextUnlock } from '../game/objective.js';
import { nextUnlockText } from '../game/messages.js';
import { countUpValue } from '../game/ease.js';
import { uiEl, uiPrefersReducedMotion } from './dom.js';
import { uiHudSoundButton, uiHudMenuButton } from './render-lock-left.js';

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
function uiTextNode(tag,className,text) {
return text ? uiEl(tag,{ className,text }) :null;
}
function uiRankButton(text) {
return text ? uiEl('button',{ className:'grid-hud-rank',text,attrs:{ type:'button','data-action':'rank-open','data-focus-key':'rank-open','aria-label':text + ', details' } }) :null;
}
function uiHudTop(game) {
const level = uiEl('span',{ className:'grid-hud-level',text:'LV ' + game.progress.level + ' · ' + game.progress.rank });
return uiEl('div',{ className:'grid-hud-top',children:[level,uiRankButton(game.hudRank)].filter(Boolean) });
}
function uiHudStats(game) {
const progress = game.progress;
const band = levelBand(progress.xp);
return uiEl('div',{
className:'grid-hud-stats',
children:[uiHudTop(game),uiEl('span',{ className:'grid-hud-xp',text:uiXpText(band,progress.xp) }),uiXpBar(game,band)],
});
}
function uiHudHint(game) {
const text = nextUnlockText(game.world,nextUnlock(game.progress));
return text ? uiEl('p',{ className:'grid-hud-hint',text }) :null;
}
function uiHudWantsRank(game) {
const ext = game.ext;
return Boolean(ext) && !game.hudLoad && !game.hudLoaded && ((ext.rank && ext.rank.r > 0) || Boolean(ext.pin));
}
function uiLoadHudRank(app) {
if (!uiHudWantsRank(app.game)) return;
app.game.hudLoad = import('./rank-hud.js')
.then(function (hud) { app.game.hudLoaded = true; return hud.uiRefreshHud(app); })
.catch(function () {})
.finally(function () { app.game.hudLoad = null; });
}
function uiGridHud(app) {
uiLoadHudRank(app);
const children = [uiHudStats(app.game),uiMapButton(),uiHudSoundButton(app),uiHudMenuButton(),uiHudHint(app.game),uiTextNode('p','grid-hud-pill',app.game.hudPill)];
return uiEl('header',{ className:'hud grid-hud',children:children.filter(Boolean) });
}

export { uiGridHud };

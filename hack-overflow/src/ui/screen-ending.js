import { GAME_EVENT } from '../game/game-events.js';
import { markEnded } from '../game/save.js';
import { endingStats, sectorStars } from '../game/ending.js';
import { FINAL_LINE } from '../game/story/story.js';
import { uiRenderKeepingFocus } from './app.js';
import { uiEl } from './dom.js';
import { uiEmit } from './bus.js';
import { uiCommitSave } from './game-state.js';
import { uiWalkReleaseAll } from './grid-walk.js';
import { uiEnterGrid } from './screen-grid.js';
import { uiStoryFinal } from './story-dialogue.js';
import { uiGhostQuip } from './story-quip.js';

const ENDING_TITLE = 'ROOT ACCESS GRANTED';
const SKIP_ACTION = 'ending-skip';

function uiOpenEnding(app) {
const game = app.game;
uiCommitSave(app,markEnded(game.save));
uiWalkReleaseAll(app);
game.walk.plan = null;
const ending = { stats:endingStats(game.world,game.save),sectors:sectorStars(game.world,game.save),startedAt:performance.now(),styled:false };
game.ending = ending;
app.screen = 'ending';
app.lastFocusKey = 'ending-return';
uiEmit(GAME_EVENT.ENDING,{});
uiStoryFinal(app);
import('./grid-chain-end.js').then(function (end) { return end.uiEndingExtras(app); }).catch(function () {
ending.styled = true;
if (typeof document !== 'undefined') uiRenderKeepingFocus(app);
});
}
function uiStatLine(label,value) {
return uiEl('li',{ className:'ending-stat',text:label + ' ' + value });
}
function uiEndingStatLines(stats) {
return [
uiStatLine('LOCKS',stats.locks + ' / ' + stats.placed),
uiStatLine('STARS',stats.stars + ' / ' + stats.maxStars),
uiStatLine('XP',String(stats.xp)),
uiStatLine('CALLSIGN','LV ' + stats.level + ' · ' + stats.rank),
uiStatLine('PERFECT LOCKS',stats.perfect + ' / ' + stats.placed),
uiStatLine('TRACED',String(stats.traced)),
uiStatLine('FAILS',String(stats.fails)),
uiStatLine('PROBES',String(stats.probes)),
];
}
function uiSectorLine(sector) {
return uiEl('li',{ className:'ending-sector',text:sector.name + ': ' + sector.stars + ' / ' + sector.maxStars + ' ★' });
}
function uiEndingTitle(ending) {
const title = uiEl('h1',{ className:'ending-title',text:ENDING_TITLE });
title.style.setProperty('--ending-chars',String(ENDING_TITLE.length));
title.style.animationDelay = -Math.round(performance.now() - ending.startedAt) + 'ms';
return title;
}
function uiEndingTables(ending) {
if (ending.rolling && ending.rolling()) return [];
return [
uiEl('ul',{ className:'ending-stats',attrs:{ 'aria-label':'Run stats' },children:uiEndingStatLines(ending.stats) }),
uiEl('ul',{ className:'ending-sectors',attrs:{ 'aria-label':'Sector stars' },children:ending.sectors.map(uiSectorLine) }),
];
}
function uiEndingBody(ending) {
return [
uiEl('p',{ className:'ending-kicker',text:'KERNEL BREACHED' }),
uiEndingTitle(ending),
uiGhostQuip(FINAL_LINE),
...(ending.extras ? ending.extras() :[]),
...uiEndingTables(ending),
...(ending.rolling && ending.rolling() ? [] :[uiEl('button',{
className:'btn btn-primary ending-return',
text:'RETURN TO GRID',
attrs:{ type:'button','data-action':'ending-return','data-focus-key':'ending-return' },
})]),
];
}
function uiRenderEnding(app) {
const ending = app.game.ending;
return uiEl('section',{
className:'screen screen-card ending-screen',
attrs:{ 'data-screen':'ending' },
children:ending.styled ? uiEndingBody(ending) :[],
});
}
function uiApplyEndingAction(app,actionId) {
if (actionId === SKIP_ACTION) {
if (app.game.ending.skip) app.game.ending.skip();
return true;
}
if (actionId !== 'ending-return') return false;
uiEnterGrid(app);
return true;
}
function uiSyncEnding(app,active,root) {
const ending = app.game.ending;
if (active && ending && ending.sync) ending.sync(root);
}
function uiEndingAnnounce(app) {
const stats = app.game.ending.stats;
return ENDING_TITLE + '. ' + stats.locks + ' of ' + stats.placed + ' locks, ' + stats.stars + ' of ' + stats.maxStars + ' stars, LV ' + stats.level + ', callsign ' + stats.rank + '.';
}
function uiEndingScreen() {
return {
id:'ending',
render:uiRenderEnding,
focusKey:function (app) { return app.game && app.game.ending && app.game.ending.focusKey ? app.game.ending.focusKey() :'ending-return'; },
announce:uiEndingAnnounce,
applyAction:uiApplyEndingAction,
sync:uiSyncEnding,
};
}

export { uiEndingScreen, uiOpenEnding };

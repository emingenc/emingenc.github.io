import { CONTEXT_STREAM,STREAM_XP } from '../game/labs/data/context-stream.js';
import { LANES } from '../game/labs/stream-sim.js';
import { uiEl,uiPointerIsCoarse,uiPrefersReducedMotion } from './dom.js';
import { uiStreamAct } from './stream-loop.js';
import { uiStreamPaint } from './stream-paint.js';

const STREAM_MAX_STARS = 3;
const STREAM_MS_PER_S = 1000;
const STREAM_SIM_TAG = 'ARCADE · SIMULATED MODEL · no real AI, no network';
const STREAM_INTRO = 'Chunks fall toward a small window. Catch the facts the answer needs, flick the junk away.';
const STREAM_DESKTOP_HINT = 'KEYS: 1 2 3 or ← ↓ → catch · SHIFT+key or Q W E flick · SPACE prune · P or ESC pause';
const STREAM_LANE_NAMES = ['left','middle','right'];

function uiStreamStars(count) {
return '★'.repeat(count) + '☆'.repeat(STREAM_MAX_STARS - count);
}
function uiStreamStageOf(app) {
return CONTEXT_STREAM.stages[app.stream.stageIndex];
}
function uiStreamRecordOf(app,stageId) {
const labs = app.game.save.labs;
const stages = Object.hasOwn(labs,CONTEXT_STREAM.id) ? labs[CONTEXT_STREAM.id] :{};
return Object.hasOwn(stages,stageId) ? stages[stageId] :null;
}
function uiStreamButton(action,label,spec) {
const attrs = { type:'button','data-action':action,'data-focus-key':action,...spec.extra };
return uiEl('button',{ className:'btn stream-btn ' + spec.kind,text:label,attrs });
}
function uiStreamHead(title,back) {
return uiEl('header',{
className:'stream-head',
children:[
uiStreamButton('stream-back','◄ BACK',{ kind:'btn-ghost stream-back',extra:{ 'aria-label':back } }),
uiEl('h1',{ className:'stream-title',text:title }),
],
});
}
function uiStreamShell(children,extraClass) {
return uiEl('section',{
className:'screen stream-screen' + (extraClass ? ' ' + extraClass :''),
attrs:{ 'data-screen':'stream' },
children:children.filter(Boolean),
});
}
function uiStreamHint() {
return uiPointerIsCoarse() ? null :uiEl('p',{ className:'stream-hint',text:STREAM_DESKTOP_HINT });
}
function uiStreamStageButton(app,stage,index) {
const record = uiStreamRecordOf(app,stage.id);
const best = record ? record.best :0;
const score = record && record.score ? record.score :0;
const bestText = best > 0 ? 'BEST ' + uiStreamStars(best) + ' · BEST SCORE ' + score :'NOT CLEARED';
const meta = stage.durationMs / STREAM_MS_PER_S + 's · window ' + stage.budget + ' TOK';
const label = stage.title + '. ' + stage.blurb + ' Best: ' + best + ' of ' + STREAM_MAX_STARS + ' stars. Best score ' + score + '.';
return uiEl('button',{
className:'btn stream-stage',
attrs:{ type:'button','data-action':'stream-stage-' + index,'data-focus-key':'stream-stage-' + index,'aria-label':label },
children:[
uiEl('span',{ className:'stream-stage-title',text:(index + 1) + '. ' + stage.title }),
uiEl('span',{ className:'stream-stage-blurb',text:stage.blurb }),
uiEl('span',{ className:'stream-stage-best',text:bestText + ' · ' + meta }),
],
});
}
function uiStreamRenderSelect(app) {
const stages = CONTEXT_STREAM.stages.map(function (stage,index) { return uiStreamStageButton(app,stage,index); });
return uiStreamShell([
uiStreamHead(CONTEXT_STREAM.title,'Back to the Grid'),
uiEl('p',{ className:'stream-sim',text:STREAM_SIM_TAG }),
uiEl('p',{ className:'stream-intro',text:STREAM_INTRO }),
uiEl('div',{ className:'stream-stages',children:stages }),
]);
}
function uiStreamStarLine(stage) {
const need = stage.stars.map(function (keys,index) { return '★'.repeat(index + 1) + ' ' + keys; });
return 'KEYS TO HOLD: ' + need.join(' · ') + ' of ' + stage.keyCount;
}
function uiStreamXpLine() {
const pays = Object.keys(STREAM_XP).map(function (stars) { return '★'.repeat(Number(stars)) + ' ' + STREAM_XP[stars]; });
return 'XP FOR A NEW BEST: ' + pays.join(' · ');
}
function uiStreamRenderReady(app) {
const stage = uiStreamStageOf(app);
const rules = stage.rules.map(function (rule) { return uiEl('li',{ text:rule }); });
const card = uiEl('section',{
className:'stream-card stream-rules',
children:[
uiEl('h2',{ className:'stream-card-title',text:stage.title }),
uiEl('p',{ className:'stream-card-text',text:stage.blurb }),
uiEl('ul',{ className:'stream-rules-list',children:rules }),
uiEl('p',{ className:'stream-needed',text:uiStreamStarLine(stage) }),
uiEl('p',{ className:'stream-meta',text:stage.durationMs / STREAM_MS_PER_S + 's · window ' + stage.budget + ' TOK · integrity ' + stage.lives }),
uiEl('p',{ className:'stream-meta',text:uiStreamXpLine() }),
],
});
const start = uiStreamButton('stream-start','START',{ kind:'btn-primary stream-start' });
return uiStreamShell([uiStreamHead(CONTEXT_STREAM.title,'Back to the stage list'),card,start,uiStreamHint()]);
}
function uiStreamClickAct(app,action) {
return function (event) {
if (event.detail === 0) uiStreamAct(app,action);
};
}
function uiStreamLane(app,index) {
const key = uiEl('span',{ className:'stream-lane-key',text:String(index + 1),attrs:{ 'aria-hidden':'true' } });
const label = 'Lane ' + (index + 1) + ', ' + STREAM_LANE_NAMES[index] + '. Tap to catch the lowest chunk, swipe up to flick it.';
const lane = uiEl('button',{
className:'stream-lane',
attrs:{ type:'button','data-lane':String(index),'data-hit':'lane','aria-label':label },
children:[key],
});
lane.addEventListener('click',uiStreamClickAct(app,{ type:'catch',lane:index }));
return lane;
}
function uiStreamWindowBar(app) {
const meter = uiEl('span',{ className:'stream-meter-text' });
const segs = uiEl('span',{ className:'stream-segs',attrs:{ 'aria-hidden':'true' } });
const head = uiEl('span',{
className:'stream-window-head',
children:[meter,uiEl('span',{ className:'stream-window-hint',text:'TAP: PRUNE OUTDATED' })],
});
const bar = uiEl('button',{ className:'stream-window',attrs:{ type:'button','data-hit':'window' },children:[head,segs] });
bar.addEventListener('click',uiStreamClickAct(app,{ type:'prune' }));
return { bar,meter,segs };
}
function uiStreamPips(stage) {
return Array.from({ length:stage.lives },function () { return uiEl('span',{ className:'stream-pip',attrs:{ 'aria-hidden':'true' } }); });
}
function uiStreamHud(stage) {
const pips = uiStreamPips(stage);
const parts = {
title:uiEl('span',{ className:'stream-stage-name',text:stage.title }),
pause:uiStreamButton('stream-pause','PAUSE',{ kind:'btn-ghost stream-pause',extra:{ 'aria-label':'Pause' } }),
time:uiEl('progress',{ className:'stream-time',attrs:{ max:String(stage.durationMs),value:String(stage.durationMs),'aria-label':'Time left' } }),
timeText:uiEl('span',{ className:'stream-time-text' }),
pipBox:uiEl('span',{ className:'stream-pips',attrs:{ role:'img' },children:pips }),
combo:uiEl('span',{ className:'stream-combo' }),
score:uiEl('span',{ className:'stream-score' }),
};
const rows = [[parts.title,parts.pause],[parts.time,parts.timeText],[parts.pipBox,parts.combo,parts.score]];
const children = rows.map(function (row,index) { return uiEl('div',{ className:'stream-hud-row stream-hud-row-' + index,children:row }); });
return { ...parts,pips,hud:uiEl('header',{ className:'stream-hud',children }) };
}
function uiStreamBuildNodes(app,stage) {
const hud = uiStreamHud(stage);
const lanes = Array.from({ length:LANES },function (unused,index) { return uiStreamLane(app,index); });
const bar = uiStreamWindowBar(app);
const field = uiEl('div',{ className:'stream-field',children:lanes });
const calm = uiPrefersReducedMotion() ? ' is-calm' :'';
const root = uiEl('section',{
className:'screen stream-screen stream-play' + calm,
attrs:{ 'data-screen':'stream' },
children:[hud.hud,field,bar.bar,uiStreamHint()].filter(Boolean),
});
return {
root,hud:hud.hud,lanes,hits:[...lanes,bar.bar],window:bar.bar,meter:bar.meter,segs:bar.segs,
time:hud.time,timeText:hud.timeText,pips:hud.pips,pipBox:hud.pipBox,combo:hud.combo,score:hud.score,
chunks:new Map(),free:[],front:lanes.map(function () { return -1; }),cache:{},texts:new Map(),attrs:new Map(),timers:{},
};
}
function uiStreamRenderPlay(app) {
const stream = app.stream;
const nodes = uiStreamBuildNodes(app,uiStreamStageOf(app));
stream.nodes = nodes;
uiStreamPaint(nodes,stream.sim);
return nodes.root;
}
function uiStreamStat(label,value) {
return uiEl('p',{ className:'stream-stat',children:[uiEl('span',{ className:'stream-stat-label',text:label }),uiEl('span',{ className:'stream-stat-value',text:value })] });
}
function uiStreamRenderPaused(app) {
const sim = app.stream.sim;
const left = Math.ceil((sim.stage.durationMs - sim.elapsedMs) / STREAM_MS_PER_S);
const card = uiEl('section',{
className:'stream-card stream-paused',
children:[
uiEl('h2',{ className:'stream-card-title',text:'PAUSED' }),
uiStreamStat('TIME LEFT',left + 's'),
uiStreamStat('SCORE',String(sim.score)),
uiStreamStat('INTEGRITY',sim.integrity + ' of ' + sim.maxIntegrity),
],
});
const actions = uiEl('div',{
className:'stream-actions',
children:[
uiStreamButton('stream-resume','RESUME',{ kind:'btn-primary stream-resume' }),
uiStreamButton('stream-replay','RESTART',{ kind:'stream-replay' }),
uiStreamButton('stream-stages','STAGES',{ kind:'btn-ghost stream-stages' }),
],
});
return uiStreamShell([uiEl('h1',{ className:'stream-title',text:CONTEXT_STREAM.title }),card,actions]);
}
function uiStreamXpText(xp) {
return xp.gained > 0 ? '+' + xp.gained + ' XP' :'NO NEW XP (best stays)';
}
function uiStreamNextStar(stage,result) {
if (result.stars >= STREAM_MAX_STARS) return 'Top rating.';
return 'Next star at ' + stage.stars[result.stars] + ' keys held.';
}
function uiStreamHasNext(app,result) {
return result.stars > 0 && app.stream.stageIndex < CONTEXT_STREAM.stages.length - 1;
}
function uiStreamResultActions(app,result) {
const hasNext = uiStreamHasNext(app,result);
const buttons = [
hasNext ? uiStreamButton('stream-next','NEXT STAGE',{ kind:'btn-primary stream-next' }) :null,
uiStreamButton('stream-replay','REPLAY',{ kind:hasNext ? 'stream-replay' :'btn-primary stream-replay' }),
uiStreamButton('stream-stages','STAGES',{ kind:'btn-ghost stream-stages' }),
];
return uiEl('div',{ className:'stream-actions',children:buttons.filter(Boolean) });
}
function uiStreamWinCard(app,result) {
const stage = uiStreamStageOf(app);
return uiEl('section',{
className:'stream-card stream-result is-win',
children:[
uiEl('h2',{ className:'stream-card-title',text:'STAGE CLEAR' }),
uiEl('p',{ className:'stream-stars',text:uiStreamStars(result.stars),attrs:{ 'aria-label':result.stars + ' of ' + STREAM_MAX_STARS + ' stars' } }),
uiStreamStat('SCORE',String(result.score)),
uiStreamStat('KEYS HELD',result.keysHeld + ' of ' + result.keysTotal),
uiStreamStat('BEST COMBO',String(result.bestCombo)),
uiStreamStat('XP',uiStreamXpText(app.stream.xp)),
uiEl('p',{ className:'stream-note',text:uiStreamNextStar(stage,result) }),
],
});
}
function uiStreamFailTitle(failure) {
return failure && failure.kind === 'short' ? 'RUN SHORT' :'STREAM FAILED';
}
function uiStreamFailCard(result) {
const failure = result.failure;
const bridge = failure && Object.hasOwn(CONTEXT_STREAM.bridges,failure.kind) ? CONTEXT_STREAM.bridges[failure.kind] :'';
return uiEl('section',{
className:'stream-card stream-result is-fail',
children:[
uiEl('h2',{ className:'stream-card-title',text:uiStreamFailTitle(failure) }),
uiEl('p',{ className:'stream-fail-text',text:failure ? failure.text :'' }),
uiEl('p',{ className:'stream-bridge',text:bridge ? 'IN PRACTICE: ' + bridge :'' }),
uiStreamStat('KEYS HELD',result.keysHeld + ' of ' + result.keysTotal),
uiStreamStat('SCORE',String(result.score)),
],
});
}
function uiStreamRenderResult(app) {
const result = app.stream.result;
const card = result.stars > 0 ? uiStreamWinCard(app,result) :uiStreamFailCard(result);
return uiStreamShell([uiEl('h1',{ className:'stream-title',text:CONTEXT_STREAM.title }),card,uiStreamResultActions(app,result)]);
}
function uiStreamRenderEmpty() {
return uiStreamShell([]);
}
const UI_STREAM_VIEWS = {
select:uiStreamRenderSelect,
ready:uiStreamRenderReady,
play:uiStreamRenderPlay,
paused:uiStreamRenderPaused,
result:uiStreamRenderResult,
};
function uiStreamRenderView(app) {
if (!app.stream || !Object.hasOwn(UI_STREAM_VIEWS,app.stream.view)) return uiStreamRenderEmpty();
return UI_STREAM_VIEWS[app.stream.view](app);
}
const UI_STREAM_FOCUS = { select:'stream-back',ready:'stream-start',play:'stream-play',paused:'stream-resume' };
function uiStreamFocusFor(app) {
if (!app.stream) return 'stream-back';
if (app.stream.view === 'result') return uiStreamHasNext(app,app.stream.result) ? 'stream-next' :'stream-replay';
return Object.hasOwn(UI_STREAM_FOCUS,app.stream.view) ? UI_STREAM_FOCUS[app.stream.view] :'stream-back';
}

export { uiStreamRenderView,uiStreamStageOf,uiStreamFocusFor,uiStreamStars };

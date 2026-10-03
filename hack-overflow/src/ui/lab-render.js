import { CONTEXT_WINDOW } from '../game/labs/data/context-window.js';
import { labelOf, movesUsed, read } from '../game/labs/context-reader.js';
import { labBest } from '../game/save.js';
import { uiEl } from './dom.js';

const LAB_MAX_STARS = 3;
const LAB_SIM_TAG = 'SIMULATED MODEL · no real AI, no network';
const LAB_STAR_RULE = '★ solved · ★★ nothing cut · ★★★ within par, no failed run';
const LAB_RULES = [
'The window is a list: the first chunk you tap is the top.',
'Over budget? Whole chunks are cut from the TOP until the rest fits.',
'The reader reads top to bottom. A later fact on a key overrides an earlier one.',
'SUM makes a chunk smaller but keeps only its summary facts.',
'You win when the reader holds every needed fact, exactly.',
];

function uiLabLevelOf(app) {
return CONTEXT_WINDOW.levels[app.lab.levelIndex];
}
function uiLabStars(count) {
return '★'.repeat(count) + '☆'.repeat(LAB_MAX_STARS - count);
}
function uiLabChunk(level,id) {
return level.chunks.find(function (chunk) { return chunk.id === id; });
}
function uiLabFactsOf(chunk,summarized) {
return summarized && chunk.summary ? chunk.summary.facts :chunk.facts;
}
function uiLabFactChips(facts) {
const chips = Object.keys(facts).map(function (key) {
return uiEl('span',{ className:'lab-fact',text:key + '=' + facts[key] });
});
return uiEl('span',{ className:'lab-facts',children:chips });
}
function uiLabButton(action,label,spec) {
const attrs = { type:'button','data-action':action,'data-focus-key':action,...spec.extra };
return uiEl('button',{ className:'btn lab-btn ' + spec.kind,text:label,attrs });
}
function uiLabHead(title) {
return uiEl('header',{
className:'lab-head',
children:[
uiLabButton('lab-back','◄ BACK',{ kind:'btn-ghost lab-back',extra:{ 'aria-label':'Back' } }),
uiEl('h1',{ className:'lab-title',text:title }),
],
});
}
function uiLabLevelButton(app,level,index) {
const best = labBest(app.game.save,CONTEXT_WINDOW.id,level.id);
const action = 'lab-level-' + index;
const bestText = best > 0 ? 'BEST ' + uiLabStars(best) :'NOT CLEARED';
const label = level.title + '. ' + level.task + ' Best: ' + best + ' of ' + LAB_MAX_STARS + ' stars.';
return uiEl('button',{
className:'btn lab-level',
attrs:{ type:'button','data-action':action,'data-focus-key':action,'aria-label':label },
children:[
uiEl('span',{ className:'lab-level-title',text:(index + 1) + '. ' + level.title }),
uiEl('span',{ className:'lab-level-task',text:level.task }),
uiEl('span',{ className:'lab-level-best',text:bestText + ' · budget ' + level.budget }),
],
});
}
function uiLabRenderSelect(app) {
const levels = CONTEXT_WINDOW.levels.map(function (level,index) { return uiLabLevelButton(app,level,index); });
return uiEl('section',{
className:'screen lab-screen',
attrs:{ 'data-screen':'lab' },
children:[
uiLabHead(CONTEXT_WINDOW.title),
uiEl('p',{ className:'lab-sim',text:LAB_SIM_TAG }),
uiEl('p',{ className:'lab-intro',text:'Pick what the model reads. It has a small window and a short memory.' }),
uiEl('div',{ className:'lab-levels',children:levels }),
],
});
}
function uiLabRenderEmpty() {
return uiEl('section',{ className:'screen lab-screen',attrs:{ 'data-screen':'lab' } });
}
function uiLabTaskCard(level) {
const needed = Object.keys(level.expect).join(' · ');
return uiEl('section',{
className:'lab-card lab-task',
children:[
uiEl('h2',{ className:'lab-card-title',text:level.title }),
uiEl('p',{ className:'lab-task-text',text:level.task }),
uiEl('p',{ className:'lab-needed',text:'READER MUST HOLD: ' + needed }),
],
});
}
function uiLabRulesCard() {
const items = LAB_RULES.map(function (rule) { return uiEl('li',{ text:rule }); });
return uiEl('section',{
className:'lab-card lab-rules',
children:[uiEl('h2',{ className:'lab-card-title',text:'HOW THE MODEL READS' }),uiEl('ol',{ className:'lab-rules-list',children:items })],
});
}
function uiLabMeter(reading) {
const over = reading.total > reading.budget;
const note = over ? 'OVER BUDGET: the oldest chunks will be cut' :'Within budget';
return uiEl('div',{
className:'lab-meter' + (over ? ' is-over' :''),
children:[
uiEl('p',{ className:'lab-meter-text',text:'TOKENS ' + reading.used + '/' + reading.budget }),
uiEl('progress',{
className:'lab-progress',
attrs:{ max:String(reading.budget),value:String(reading.used),'aria-label':'Tokens used' },
}),
uiEl('p',{ className:'lab-meter-note',text:note }),
],
});
}
function uiLabCutBadge(cut) {
return cut ? uiEl('span',{ className:'lab-badge',text:'CUT' }) :null;
}
function uiLabRowControls(entry,chunk,won) {
const controls = [];
const locked = won ? { disabled:'disabled' } :{};
if (chunk.summary) {
const label = entry.summarized ? 'FULL' :'SUM';
const verb = entry.summarized ? 'Expand ' :'Summarize ';
controls.push(uiLabButton('lab-sum-' + entry.id,label,{ kind:'btn-ghost lab-sum',extra:{ 'aria-pressed':String(entry.summarized),'aria-label':verb + entry.label,...locked } }));
}
controls.push(uiLabButton('lab-drop-' + entry.id,'✕',{ kind:'btn-ghost lab-drop',extra:{ 'aria-label':'Remove ' + entry.label,...locked } }));
return uiEl('span',{ className:'lab-row-controls',children:controls });
}
function uiLabRowClass(entry,flags) {
const cut = flags.cutIds.includes(entry.id) ? ' is-cut' :'';
return 'lab-row' + cut + (flags.culpritId === entry.id ? ' is-culprit' :'');
}
function uiLabRow(flags,entry,position) {
const chunk = uiLabChunk(flags.level,entry.id);
return uiEl('li',{
className:uiLabRowClass(entry,flags),
children:[
uiEl('span',{ className:'lab-pos',text:String(position + 1) }),
uiEl('span',{ className:'lab-row-label',text:entry.label }),
uiEl('span',{ className:'lab-tokens',text:entry.tokens + 't' }),
uiLabCutBadge(flags.cutIds.includes(entry.id)),
uiLabFactChips(uiLabFactsOf(chunk,entry.summarized)),
uiLabRowControls(entry,chunk,flags.won),
],
});
}
function uiLabCulpritId(run) {
return run.failure ? run.failure.culprit.id :null;
}
function uiLabWindow(app,reading) {
const { run,probe } = app.lab;
const level = uiLabLevelOf(app);
const flags = { level,cutIds:probe ? probe.cutIds :[],culpritId:uiLabCulpritId(run),won:run.status === 'won' };
const rows = reading.entries.map(function (entry,position) { return uiLabRow(flags,entry,position); });
const empty = uiEl('p',{ className:'lab-empty',text:'The window is empty. Tap a chunk below to add it.' });
return uiEl('section',{
className:'lab-window',
attrs:{ 'aria-label':'Window' },
children:[uiEl('h2',{ className:'lab-card-title',text:'WINDOW (top first)' }),rows.length ? uiEl('ol',{ className:'lab-rows',children:rows }) :empty],
});
}
function uiLabChip(ctx,id,index) {
const { level,run } = ctx;
const chunk = uiLabChunk(level,id);
const placed = run.window.some(function (entry) { return entry.id === id; });
const culprit = uiLabCulpritId(run) === id;
const attrs = { type:'button','data-action':'lab-add-' + id,'data-focus-key':'lab-add-' + id };
if (placed || run.status === 'won') attrs.disabled = 'disabled';
return uiEl('button',{
className:'lab-chip' + (placed ? ' is-placed' :'') + (culprit ? ' is-culprit' :''),
attrs,
children:[
uiEl('span',{ className:'lab-chip-head',text:(index + 1) + ' ' + chunk.label + ' · ' + chunk.tokens + 't' }),
uiLabFactChips(chunk.facts),
],
});
}
function uiLabTray(app) {
const { run } = app.lab;
const level = uiLabLevelOf(app);
const chips = run.tray.map(function (id,index) { return uiLabChip({ level,run },id,index); });
return uiEl('section',{
className:'lab-tray',
attrs:{ 'aria-label':'Chunks' },
children:[uiEl('h2',{ className:'lab-card-title',text:'CHUNKS' }),uiEl('div',{ className:'lab-chips',children:chips })],
});
}
function uiLabActionBar(run) {
const idle = run.window.length === 0 || run.status === 'won';
const extra = idle ? { disabled:'disabled' } :{};
return uiEl('div',{
className:'lab-bar',
attrs:{ role:'group','aria-label':'Actions' },
children:[
uiLabButton('lab-probe','PROBE',{ kind:'btn-ghost lab-probe',extra }),
uiLabButton('lab-run','RUN',{ kind:'btn-primary lab-run',extra }),
uiLabButton('lab-clear','CLEAR',{ kind:'btn-ghost lab-clear',extra }),
],
});
}
function uiLabFactRow(level,reading,key) {
const fact = reading.facts[key];
return uiEl('tr',{
children:[
uiEl('td',{ text:key }),
uiEl('td',{ text:fact ? fact.value :'none' }),
uiEl('td',{ text:fact ? labelOf(level,fact.from) :'not in the window' }),
],
});
}
function uiLabFactTable(level,reading) {
const keys = [...new Set([...Object.keys(level.expect),...Object.keys(reading.facts)])];
const head = uiEl('tr',{ children:[uiEl('th',{ text:'KEY' }),uiEl('th',{ text:'READER HOLDS' }),uiEl('th',{ text:'FROM' })] });
return uiEl('table',{
className:'lab-table',
children:[uiEl('caption',{ text:'What the reader holds' }),uiEl('thead',{ children:[head] }),uiEl('tbody',{ children:keys.map(function (key) { return uiLabFactRow(level,reading,key); }) })],
});
}
function uiLabOverrideText(level,item) {
return item.key + ': ' + item.wasValue + ' (' + labelOf(level,item.was) + ') replaced by ' + item.byValue + ' (' + labelOf(level,item.by) + ')';
}
function uiLabReadingNotes(level,reading) {
const cut = reading.cutIds.length ? 'CUT: ' + reading.cutIds.map(function (id) { return labelOf(level,id); }).join(', ') :'Nothing was cut.';
const notes = [uiEl('p',{ className:'lab-note',text:cut })];
reading.overridden.forEach(function (item) { notes.push(uiEl('p',{ className:'lab-note',text:'OVERRIDE ' + uiLabOverrideText(level,item) })); });
return notes;
}
function uiLabReadingPanel(level,reading) {
return [uiLabFactTable(level,reading),...uiLabReadingNotes(level,reading)];
}
function uiLabProbePanel(app) {
const level = uiLabLevelOf(app);
return uiEl('section',{
className:'lab-result lab-probe-result',
children:[uiEl('h2',{ className:'lab-card-title',text:'PROBE: a free dry read' }),...uiLabReadingPanel(level,app.lab.probe)],
});
}
function uiLabFailPanel(app) {
const { run,probe } = app.lab;
const level = uiLabLevelOf(app);
const failure = run.failure;
const reading = probe || read(level,run.window);
return uiEl('section',{
className:'lab-result lab-fail',
children:[
uiEl('h2',{ className:'lab-card-title',text:'RUN FAILED (' + run.fails + ')' }),
uiEl('p',{ className:'lab-fail-text',text:failure.text }),
uiEl('p',{ className:'lab-fail-move',text:'YOUR MOVE: ' + failure.move }),
uiEl('p',{ className:'lab-practice',text:'IN PRACTICE: ' + failure.practice }),
...uiLabReadingPanel(level,reading),
],
});
}
function uiLabWinButtons(app) {
const buttons = [uiLabButton('lab-replay','REPLAY',{ kind:'btn-ghost lab-replay' })];
if (app.lab.levelIndex < CONTEXT_WINDOW.levels.length - 1) buttons.push(uiLabButton('lab-next','NEXT LEVEL',{ kind:'btn-primary lab-next' }));
buttons.push(uiLabButton('lab-levels','LEVELS',{ kind:'btn-ghost lab-levels' }));
return uiEl('div',{ className:'lab-win-actions',children:buttons });
}
function uiLabWinPanel(app) {
const { run } = app.lab;
const level = uiLabLevelOf(app);
const summary = 'PAR ' + level.par + ' · YOU USED ' + movesUsed(run.window) + ' · FAILED RUNS ' + run.fails;
return uiEl('section',{
className:'lab-result lab-win',
children:[
uiEl('h2',{ className:'lab-card-title',text:'THE READER GOT IT' }),
uiEl('p',{ className:'lab-stars',text:uiLabStars(run.stars),attrs:{ role:'img','aria-label':run.stars + ' of ' + LAB_MAX_STARS + ' stars' } }),
uiEl('p',{ className:'lab-note',text:summary }),
uiEl('p',{ className:'lab-note',text:LAB_STAR_RULE }),
uiLabWinButtons(app),
],
});
}
function uiLabResult(app) {
const { run,probe } = app.lab;
if (run.status === 'won') return uiLabWinPanel(app);
if (run.failure) return uiLabFailPanel(app);
return probe ? uiLabProbePanel(app) :null;
}
function uiLabRenderPlay(app) {
const level = uiLabLevelOf(app);
const reading = read(level,app.lab.run.window);
const children = [
uiLabHead(CONTEXT_WINDOW.title),
uiEl('p',{ className:'lab-sim',text:LAB_SIM_TAG }),
uiLabTaskCard(level),
uiLabRulesCard(),
uiLabMeter(reading),
uiLabWindow(app,reading),
uiLabResult(app),
uiLabTray(app),
uiLabActionBar(app.lab.run),
];
return uiEl('section',{
className:'screen lab-screen lab-play',
attrs:{ 'data-screen':'lab' },
children:children.filter(Boolean),
});
}

export { uiLabLevelOf, uiLabStars, uiLabRenderSelect, uiLabRenderPlay, uiLabRenderEmpty };

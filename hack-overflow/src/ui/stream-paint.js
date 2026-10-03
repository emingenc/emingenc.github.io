import { lowestInLane,readWindow,stageSpeed } from '../game/labs/stream-sim.js';
import { uiEl } from './dom.js';


const MS_PER_S = 1000;
const SECONDS_PER_MINUTE = 60;
const SECOND_DIGITS = 2;
const LANE_COUNT = 3;
const LINE_Y = 1;
const Y_STEPS = 1000;
const TIME_STEP_MS = 100;
const FLASH_MS = 280;
const POP_MS = 750;
const SEG_TEXT_MAX = 5;
const FULL_RATIO = 0.85;
const NO_UID = -1;
const KIND_TAGS = { key:'KEY',noise:'NOISE',bulk:'BULK',stale:'OLD',summary:'SUM',inject:'INJECT' };

function uiStreamClass(node,name,on) {
const names = node.className.split(' ').filter(function (part) { return part && part !== name; });
if (on) names.push(name);
node.className = names.join(' ');
}
function uiStreamSetText(nodes,node,text) {
if (nodes.texts.get(node) === text) return;
nodes.texts.set(node,text);
node.textContent = text;
}
function uiStreamSetAttr(nodes,node,spec) {
const value = String(spec.value);
if (nodes.attrs.get(node) === value) return;
nodes.attrs.set(node,value);
node.setAttribute(spec.name,value);
}
function uiStreamClock(ms) {
const total = Math.ceil(Math.max(0,ms) / MS_PER_S);
const seconds = String(total % SECONDS_PER_MINUTE).padStart(SECOND_DIGITS,'0');
return Math.floor(total / SECONDS_PER_MINUTE) + ':' + seconds;
}
function uiStreamPaintHud(nodes,sim) {
const left = Math.max(0,sim.stage.durationMs - sim.elapsedMs);
const stepped = Math.round(left / TIME_STEP_MS) * TIME_STEP_MS;
uiStreamSetAttr(nodes,nodes.time,{ name:'value',value:stepped });
uiStreamSetText(nodes,nodes.timeText,uiStreamClock(left));
uiStreamSetText(nodes,nodes.combo,'COMBO ' + sim.combo + ' x' + sim.multiplier);
uiStreamSetText(nodes,nodes.score,'SCORE ' + sim.score);
uiStreamPaintPips(nodes,sim);
}
function uiStreamPaintPips(nodes,sim) {
if (nodes.cache.integrity === sim.integrity) return;
nodes.cache.integrity = sim.integrity;
nodes.pips.forEach(function (pip,index) {
const lost = index >= sim.integrity;
pip.textContent = lost ? '□' :'■';
uiStreamClass(pip,'is-lost',lost);
});
nodes.pipBox.setAttribute('aria-label','Integrity ' + sim.integrity + ' of ' + sim.maxIntegrity);
}
function uiStreamClearNode(node) {
while (node.firstChild) node.removeChild(node.firstChild);
}
function uiStreamShort(label) {
return label.replace(/[^A-Za-z0-9]/g,'').slice(0,SEG_TEXT_MAX);
}
function uiStreamSegment(entry,dead) {
const seg = uiEl('span',{ className:'stream-seg is-' + entry.kind + (dead ? ' is-dead' :''),text:uiStreamShort(entry.label) });
seg.style.setProperty('flex-grow',String(entry.tokens));
return seg;
}
function uiStreamFreeSegment(free) {
const seg = uiEl('span',{ className:'stream-seg stream-seg-free' });
seg.style.setProperty('flex-grow',String(free));
return seg;
}
function uiStreamWindowLabel(sim,dead) {
const outdated = dead.length ? ' ' + dead.length + ' outdated.' :'';
return 'Window ' + sim.used + ' of ' + sim.budget + ' tokens. ' + readWindow(sim).keysHeld + ' of ' + sim.keysTotal + ' keys held.' + outdated + ' Tap to prune.';
}
function uiStreamPaintWindow(nodes,sim) {
const dead = readWindow(sim).dead;
const signature = sim.window.map(function (entry) { return entry.uid; }).join(',') + '|' + dead.join(',');
if (nodes.cache.windowSig === signature) return;
nodes.cache.windowSig = signature;
uiStreamClearNode(nodes.segs);
sim.window.forEach(function (entry) { nodes.segs.appendChild(uiStreamSegment(entry,dead.includes(entry.uid))); });
nodes.segs.appendChild(uiStreamFreeSegment(Math.max(0,sim.budget - sim.used)));
uiStreamSetText(nodes,nodes.meter,'WINDOW ' + sim.used + '/' + sim.budget + ' TOK');
uiStreamClass(nodes.window,'is-full',sim.used >= sim.budget * FULL_RATIO);
nodes.window.setAttribute('aria-label',uiStreamWindowLabel(sim,dead));
}
function uiStreamNewChunk() {
const tag = uiEl('span',{ className:'stream-chunk-tag' });
const label = uiEl('span',{ className:'stream-chunk-label' });
const tok = uiEl('span',{ className:'stream-chunk-tok' });
const top = uiEl('span',{ className:'stream-chunk-top',children:[tag,tok] });
const el = uiEl('div',{ className:'stream-chunk',children:[top,label],attrs:{ 'aria-hidden':'true' } });
return { el,tag,label,tok,uid:NO_UID,lane:0,y:'' };
}
function uiStreamBindChunk(nodes,record,chunk) {
record.uid = chunk.uid;
record.lane = chunk.lane;
record.y = '';
record.el.className = 'stream-chunk is-' + chunk.kind;
record.tag.textContent = KIND_TAGS[chunk.kind];
record.label.textContent = chunk.label;
record.tok.textContent = chunk.tokens + ' TOK';
nodes.lanes[chunk.lane].appendChild(record.el);
}
function uiStreamChunkRecord(nodes,chunk) {
if (nodes.chunks.has(chunk.uid)) return nodes.chunks.get(chunk.uid);
const record = nodes.free.pop() || uiStreamNewChunk();
uiStreamBindChunk(nodes,record,chunk);
nodes.chunks.set(chunk.uid,record);
return record;
}
function uiStreamRecycle(nodes,record) {
nodes.lanes[record.lane].removeChild(record.el);
nodes.chunks.delete(record.uid);
record.uid = NO_UID;
nodes.free.push(record);
}
function uiStreamDrawnY(sim,chunk) {
const shift = stageSpeed(sim.stage,sim.elapsedMs) * sim.acc / MS_PER_S;
return Math.min(LINE_Y,chunk.y + shift);
}
function uiStreamPlace(record,depth) {
const text = String(Math.round(depth * Y_STEPS) / Y_STEPS);
if (record.y === text) return;
record.y = text;
record.el.style.setProperty('--y',text);
}
function uiStreamPaintFront(nodes,sim) {
for (let lane = 0; lane < LANE_COUNT; lane += 1) {
const front = lowestInLane(sim,lane);
const uid = front ? front.uid :NO_UID;
if (nodes.front[lane] === uid) continue;
const before = nodes.chunks.get(nodes.front[lane]);
if (before) uiStreamClass(before.el,'is-front',false);
const after = nodes.chunks.get(uid);
if (after) uiStreamClass(after.el,'is-front',true);
nodes.front[lane] = uid;
}
}
function uiStreamPaintChunks(nodes,sim) {
const live = new Set();
sim.chunks.forEach(function (chunk) {
uiStreamPlace(uiStreamChunkRecord(nodes,chunk),uiStreamDrawnY(sim,chunk));
live.add(chunk.uid);
});
nodes.chunks.forEach(function (record,uid) {
if (!live.has(uid)) uiStreamRecycle(nodes,record);
});
uiStreamPaintFront(nodes,sim);
}
function uiStreamPaint(nodes,sim) {
if (!nodes || !sim) return;
uiStreamPaintHud(nodes,sim);
uiStreamPaintWindow(nodes,sim);
uiStreamPaintChunks(nodes,sim);
}

function uiStreamFlash(nodes,key,spec) {
const timerKey = key + spec.name;
window.clearTimeout(nodes.timers[timerKey]);
uiStreamClass(spec.node,spec.name,true);
nodes.timers[timerKey] = window.setTimeout(function () {
uiStreamClass(spec.node,spec.name,false);
},FLASH_MS);
}
function uiStreamPop(parent,text,tone) {
const pop = uiEl('span',{ className:'stream-pop is-' + tone,text,attrs:{ 'aria-hidden':'true' } });
parent.appendChild(pop);
window.setTimeout(function () { parent.removeChild(pop); },POP_MS);
}
function uiStreamAtLane(nodes,event,spec) {
const lane = nodes.lanes[event.lane];
if (!lane) return;
uiStreamFlash(nodes,'lane' + event.lane,{ node:lane,name:spec.flash });
uiStreamPop(lane,spec.text,spec.tone);
}
function uiStreamAtWindow(nodes,spec) {
uiStreamFlash(nodes,'window',{ node:nodes.window,name:spec.flash });
uiStreamPop(nodes.window,spec.text,spec.tone);
}
function uiStreamAtHud(nodes,spec) {
uiStreamFlash(nodes,'hud',{ node:nodes.hud,name:spec.flash });
if (spec.text) uiStreamPop(nodes.hud,spec.text,spec.tone);
}
function uiStreamGain(ctx) {
return '+' + ctx.gain;
}
function uiStreamCueCatch(nodes,event,ctx) {
if (event.tone === 'good') uiStreamAtLane(nodes,event,{ flash:'is-good',text:uiStreamGain(ctx),tone:'good' });
else uiStreamAtLane(nodes,event,{ flash:'is-bad',text:'JUNK',tone:'bad' });
}
function uiStreamCueFlick(nodes,event,ctx) {
if (event.tone === 'good') uiStreamAtLane(nodes,event,{ flash:'is-flick',text:uiStreamGain(ctx),tone:'good' });
else uiStreamAtLane(nodes,event,{ flash:'is-bad',text:'LOST KEY',tone:'bad' });
}
function uiStreamCueWhiff(nodes,event) {
if (event.lane === undefined) uiStreamAtWindow(nodes,{ flash:'is-bad',text:'WHIFF',tone:'bad' });
else uiStreamAtLane(nodes,event,{ flash:'is-bad',text:'WHIFF',tone:'bad' });
}
function uiStreamCuePrune(nodes,event,ctx) {
uiStreamAtWindow(nodes,{ flash:'is-good',text:uiStreamGain(ctx),tone:'good' });
}
const UI_STREAM_CUES = {
catch:uiStreamCueCatch,
flick:uiStreamCueFlick,
whiff:uiStreamCueWhiff,
prune:uiStreamCuePrune,
cut:function (nodes) { uiStreamAtWindow(nodes,{ flash:'is-cut',text:'CUT!',tone:'bad' }); },
summarize:function (nodes) { uiStreamAtWindow(nodes,{ flash:'is-good',text:'CLEAN',tone:'good' }); },
miss:function (nodes,event) { uiStreamAtLane(nodes,event,{ flash:'is-bad',text:'MISS',tone:'bad' }); },
inject:function (nodes,event) { uiStreamAtLane(nodes,event,{ flash:'is-bad',text:'INJECT!',tone:'bad' }); },
integrity:function (nodes) { uiStreamAtHud(nodes,{ flash:'is-hurt',text:'',tone:'bad' }); },
combo:function (nodes,event) { uiStreamAtHud(nodes,{ flash:'is-combo',text:event.text,tone:'good' }); },
};
function uiStreamCue(nodes,events,ctx) {
if (!nodes) return;
events.forEach(function (event) {
if (Object.hasOwn(UI_STREAM_CUES,event.type)) UI_STREAM_CUES[event.type](nodes,event,ctx);
});
}

export { uiStreamPaint,uiStreamCue,uiStreamClass };

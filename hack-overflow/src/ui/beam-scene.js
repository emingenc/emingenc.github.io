import { SHARD } from '../game/rooms/data/beam-wave.js';
import { BEAM_TEXTS } from '../game/rooms/data/beam-texts.js';
import { fillText } from '../game/rooms/data/turret-texts.js';
import { beamBudget } from '../game/rooms/beam.js';
import { uiBeamMarkClasses,uiBeamVar } from './beam-marks.js';
import { uiBeamNoping,uiBeamShooting,uiBeamTime } from './beam-flow.js';
import { uiEl } from './dom.js';


const PERCENT = 100;
const HALF = 0.5;
const MITE_WORDS = 'MITE bites in ';
const SHARD_WORDS = '◆ SHARD +';
const QUARRY = '◎';

function uiBeamPct(cell,count) {
return ((cell + HALF) / count) * PERCENT;
}
function uiBeamEdge(cell,count) {
return (cell / count) * PERCENT;
}
function uiBeamSpan(lo,hi,count) {
return ((hi - lo + 1) / count) * PERCENT;
}
function uiBeamDying(last,cell) {
const inside = cell >= last.from.lo && cell <= last.from.hi;
return inside && (cell < last.to.lo || cell > last.to.hi);
}
function uiBeamDeadClass(state,cell,shooting) {
const falling = shooting && state.last.kind === 'shot' && uiBeamDying(state.last,cell);
return falling ? 'is-falling' :'is-dead';
}
function uiBeamColClasses(state,cell,shooting) {
const live = cell >= state.lo && cell <= state.hi;
const names = ['beam-col',live ? 'is-live' :uiBeamDeadClass(state,cell,shooting),...uiBeamMarkClasses(state,cell)];
return names.join(' ');
}
function uiBeamLane(state,shooting) {
const cols = Array.from({ length:state.n },(unused,cell) => uiEl('span',{ className:uiBeamColClasses(state,cell,shooting),attrs:{ 'aria-hidden':'true' } }));
const quarry = uiBeamQuarry(state,shooting);
const shot = shooting && state.last.kind === 'shot' ? uiBeamShot(state) :null;
const words = 'Lane of ' + state.n + ' cells. Live: ' + state.lo + ' to ' + state.hi + '.';
return uiEl('div',{ className:'beam-lane',attrs:{ role:'img','aria-label':words },children:[...cols,quarry,shot,...uiBeamThreats(state)] });
}
function uiBeamQuarry(state,shooting) {
const quarry = uiEl('span',{ className:'beam-quarry' + (shooting ? ' is-fleeing' :''),text:QUARRY,attrs:{ 'aria-hidden':'true' } });
uiBeamVar(quarry,'--at',uiBeamEdge(state.lo,state.n));
uiBeamVar(quarry,'--span',uiBeamSpan(state.lo,state.hi,state.n));
if (shooting && state.last.kind === 'shot') {
const from = state.last.from;
uiBeamVar(quarry,'--from-at',uiBeamEdge(from.lo,state.n));
uiBeamVar(quarry,'--from-span',uiBeamSpan(from.lo,from.hi,state.n));
}
return quarry;
}
function uiBeamShot(state) {
const shot = uiEl('span',{ className:'beam-shot',text:'▲',attrs:{ 'aria-hidden':'true' } });
uiBeamVar(shot,'--at',uiBeamPct(state.last.cell,state.n));
return shot;
}
function uiBeamMite(mite) {
return uiEl('span',{ className:'beam-mite',text:MITE_WORDS + mite.bitesIn,attrs:{ role:'img','aria-label':'Mite: bites in ' + mite.bitesIn + ' shots' } });
}
function uiBeamThreats(state) {
const shard = state.shard ? uiEl('span',{ className:'beam-shard',text:SHARD_WORDS + SHARD.score }) :null;
return [shard,...state.mites.map(uiBeamMite)].filter(Boolean);
}
function uiBeamChips(state) {
const shots = fillText(BEAM_TEXTS.coach.chip,{ k:state.probes,budget:beamBudget(state.wave),lo:state.lo,hi:state.hi });
const said = state.last && state.last.kind === 'shot' ? state.last.answer :'';
const answer = uiEl('span',{ className:'beam-chip beam-answer' + (said ? ' is-said' :''),text:said ? '→ ' + said :'',attrs:{ 'aria-label':said ? 'ORACLE-7 said ' + said :'' } });
return uiEl('p',{ className:'beam-top',children:[uiEl('span',{ className:'beam-chip beam-shots',text:shots }),answer] });
}

function uiBeamScene(app) {
const arena = app.rig.arena;
const now = uiBeamTime();
const shooting = uiBeamShooting(arena,now);
const names = 'beam-scene' + (shooting ? ' is-shooting' :'') + (uiBeamNoping(arena,now) ? ' is-nope' :'');
return uiEl('div',{ className:names,attrs:{ 'data-beam-scene':'field' },children:[uiBeamChips(arena.state),uiBeamLane(arena.state,shooting)] });
}

export { uiBeamScene };

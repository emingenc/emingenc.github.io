import { BEAM_TEXTS } from '../game/rooms/data/beam-texts.js';
import { fillText } from '../game/rooms/data/turret-texts.js';
import { roundBudget } from '../game/rooms/beam.js';
import { uiBeamNoping,uiBeamTime } from './beam-flow.js';
import { uiBeamW3Reads } from './beam-w3-values.js';
import { uiEl } from './dom.js';


const READS = [['lo','a[lo]'],['mid','a[mid]'],['hi','a[hi]']];

function uiBeamChips(state) {
const shots = fillText(BEAM_TEXTS.coach.chip,{ k:state.roundShots,budget:roundBudget(state.n),lo:state.lo,hi:state.hi });
const target = 'FIND ' + state.stream.target;
const chips = [uiEl('span',{ className:'beam-chip beam-shots',text:shots }),uiEl('span',{ className:'beam-chip beam-target',text:target })];
return uiEl('p',{ className:'beam-top',children:chips });
}
function uiBeamRead(state,reads,[name,label]) {
const open = name !== 'mid' || Boolean(state.pending);
const children = [uiEl('span',{ className:'beam-read-key',text:label }),uiEl('span',{ className:'beam-read-val',text:reads[name] })];
return uiEl('p',{ className:'beam-read beam-read-' + name + (open ? ' is-open' :''),children });
}
function uiBeamReads(state) {
const reads = uiBeamW3Reads(state);
return uiEl('div',{ className:'beam-reads',attrs:{ role:'group','aria-label':'Values you can read' },children:READS.map((read) => uiBeamRead(state,reads,read)) });
}

function uiBeamW3Scene(app) {
const arena = app.rig.arena;
const names = 'beam-scene' + (uiBeamNoping(arena,uiBeamTime()) ? ' is-nope' :'');
return uiEl('div',{ className:names,attrs:{ 'data-beam-scene':'field' },children:[uiBeamChips(arena.state),uiBeamReads(arena.state)] });
}

export { uiBeamW3Scene };

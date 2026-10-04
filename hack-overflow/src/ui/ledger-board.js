import { moves, view } from '../game/rigs/ledger.js';
import { uiEl } from './dom.js';

const LG_INTEGRITY = 3;
const LG_COUNT_TOP = 4;
const LG_PERCENT = 100;
const LG_PAD_SLOTS = 9;
const LG_SLOT_KEYS = { 10:'0',11:'-' };
const LG_VERBS = {
store:{ action:'ledger-store',label:'STORE',code:'seen[x] += 1',key:'S' },
drop:{ action:'ledger-drop',label:'DROP',code:'continue',key:'D' },
evict:{ action:'ledger-evict',label:'EVICT',code:'del seen[k]',key:'E' },
};

function uiLedgerCoachTarget(rig) {
return rig.coach ? rig.coach.target :null;
}
function uiLedgerFx(rig,kind) {
return rig.fx && rig.fx.kind === kind ? rig.fx :null;
}


function uiLedgerIntegrity(integrity) {
const segments = Array.from({ length:LG_INTEGRITY },(_,index) => uiEl('span',{ className:'lg-seg ' + (index < integrity ? 'is-on' :'is-off') }));
return uiEl('div',{ className:'lg-integrity' + (integrity === 1 ? ' is-low' :''),attrs:{ role:'img','aria-label':'Integrity ' + integrity + ' of ' + LG_INTEGRITY },children:[
uiEl('span',{ className:'lg-integrity-label',text:'INTEGRITY',attrs:{ 'aria-hidden':'true' } }),
uiEl('span',{ className:'lg-segs',children:segments }),
] });
}
function uiLedgerLevelTag(app) {
return uiEl('span',{ className:'rig-level-tag',text:'L' + (app.rig.levelIndex + 1) });
}
function uiLedgerStat(className,label,value) {
return uiEl('div',{ className:'lg-stat ' + className,children:[uiEl('span',{ className:'lg-stat-label',text:label }),uiEl('span',{ className:'lg-stat-value',text:value })] });
}
function uiLedgerPercent(value,top) {
return Math.min(LG_PERCENT,Math.round(value * LG_PERCENT / top)) + '%';
}
function uiLedgerScoreBar(board) {
const top = Math.max(board.best,board.marks[1]);
const fill = uiEl('span',{ className:'lg-bar-fill' });
fill.style.setProperty('--lg-fill',uiLedgerPercent(board.score,top));
const ticks = board.marks.map(function (mark,index) {
const tick = uiEl('span',{ className:'lg-tick' + (board.score >= mark ? ' is-on' :''),text:'★'.repeat(index + 2) });
tick.style.setProperty('--lg-at',uiLedgerPercent(mark,top));
return tick;
});
const label = 'Score ' + board.score + '. Two stars at ' + board.marks[0] + ', three at ' + board.marks[1] + '.';
return uiEl('div',{ className:'lg-bar',attrs:{ role:'img','aria-label':label },children:[fill,...ticks] });
}
function uiLedgerChain(board,fx) {
const hot = board.multiplier >= 2 ? ' is-hot' :'';
return uiEl('div',{ className:'lg-chain' + hot + (fx ? ' is-bump' :''),attrs:{ 'aria-label':'Chain times ' + Math.max(1,board.multiplier) + '. Next pair plus ' + board.nextPoints },children:[
uiEl('span',{ className:'lg-chain-mult',text:'CHAIN ×' + Math.max(1,board.multiplier) }),
uiEl('span',{ className:'lg-chain-next',text:'next +' + board.nextPoints }),
] });
}
function uiLedgerHud(app,board) {
const scored = uiLedgerFx(app.rig,'pair');
return uiEl('div',{ className:'lg-hud',children:[
uiLedgerStat('lg-target','TARGET',String(app.rig.state.target)),
uiEl('div',{ className:'lg-score' + (scored ? ' is-bump' :''),children:[uiLedgerStat('lg-score-stat','SCORE',String(board.score)),uiLedgerScoreBar(board)] }),
uiLedgerChain(board,scored),
uiLedgerStat('lg-packets','PACKET',board.packetNo + '/' + board.total),
] });
}
function uiLedgerLinesView(lines) {
if (!lines.length) return null;
return uiEl('div',{ className:'lg-coach',attrs:{ 'aria-hidden':'true' },children:lines.map((line) => uiEl('p',{ className:'lg-coach-line',text:line })) });
}


function uiLedgerHint(app,packet) {
const hint = app.rig.state.level.hint;
if (hint === 'none') return null;
const need = hint === 'full' ? String(packet.need) :'?';
return uiEl('span',{ className:'lg-hint',text:'need = ' + app.rig.state.target + ' - ' + packet.x + ' = ' + need });
}
function uiLedgerGold(bounty) {
return bounty ? uiEl('span',{ className:'lg-gold-badge',text:'×3',attrs:{ 'aria-hidden':'true' } }) :null;
}
function uiLedgerNow(app,packet) {
if (!packet) return uiEl('div',{ className:'lg-now is-empty',children:[uiEl('span',{ className:'lg-now-value',text:'·' })] });
const label = 'Packet ' + packet.x + (packet.bounty ? ', gold' :'');
return uiEl('div',{ className:'lg-now' + (packet.bounty ? ' is-gold' :''),attrs:{ 'aria-label':label },children:[
uiEl('span',{ className:'lg-now-value',text:String(packet.x) }),uiLedgerGold(packet.bounty),uiLedgerHint(app,packet),
] });
}
function uiLedgerQueue(board) {
const chips = board.preview.map((packet) => uiEl('span',{ className:'lg-next' + (packet.bounty ? ' is-gold' :''),text:String(packet.x) }));
const end = board.packetNo + board.preview.length >= board.total ? uiEl('span',{ className:'lg-end',text:'END' }) :null;
const label = board.preview.length ? 'Next ' + board.preview.map((packet) => packet.x + (packet.bounty ? ' gold' :'')).join(', ') :'No more packets';
return uiEl('div',{ className:'lg-queue',attrs:{ 'aria-label':label + (end ? ', then the end' :'') },children:[...chips,end] });
}
function uiLedgerGhost(fx) {
const kinds = { drop:'is-drop',wrong:'is-lost',overflow:'is-spill' };
if (!fx || !kinds[fx.kind] || (fx.kind === 'wrong' && !fx.lost)) return null;
return uiEl('span',{ className:'lg-ghost ' + kinds[fx.kind],text:String(fx.value),attrs:{ 'aria-hidden':'true' } });
}
function uiLedgerBelt(app,board) {
const fx = app.rig.fx;
const moved = fx && fx.kind !== 'wrong' ? ' is-advance' :'';
return uiEl('div',{ className:'lg-belt' + moved,children:[
uiLedgerNow(app,board.packet),uiEl('span',{ className:'lg-arrow',text:'◄',attrs:{ 'aria-hidden':'true' } }),uiLedgerQueue(board),uiLedgerGhost(fx),
] });
}
function uiLedgerToast(app) {
const toast = app.rig.toast;
return uiEl('p',{ className:'lg-toast' + (toast ? ' is-' + toast.kind :''),text:toast ? toast.text :'',attrs:{ 'aria-hidden':'true' } });
}


function uiLedgerTtl(state,slot) {
if (!state.ttl || slot.left === null) return null;
const pips = Array.from({ length:state.ttl },(_,index) => uiEl('span',{ className:'lg-age ' + (index < slot.left ? 'is-on' :'is-off') }));
return uiEl('span',{ className:'lg-ttl' + (slot.left <= 1 ? ' is-last' :''),attrs:{ 'aria-hidden':'true' },children:pips });
}
function uiLedgerSlotFx(rig,slot) {
const fx = rig.fx;
if (fx && fx.stale && fx.stale.includes(slot)) return { className:' is-stale',child:uiEl('span',{ className:'lg-stale-tag',text:'STALE' }) };
if (!fx || fx.slot !== slot) return { className:'',child:null };
const gold = fx.bounty ? ' is-gold' :'';
const effects = {
pair:{ className:' is-burst' + gold,child:uiEl('span',{ className:'lg-float' + gold,text:'+' + fx.points }) },
store:{ className:' is-in',child:uiEl('span',{ className:'lg-fly' + gold,text:String(fx.value) }) },
evict:{ className:' is-out',child:uiEl('span',{ className:'lg-fly is-out',text:String(slot) }) },
wrong:{ className:' is-miss',child:null },
};
return effects[fx.kind] || { className:'',child:null };
}
function uiLedgerSlotLabel(state,slot) {
if (slot.count === 0) return 'Slot ' + slot.k + ', empty';
const ttl = slot.left === null ? '' :', ' + slot.left + ' to go';
return 'Slot ' + slot.k + ', ' + slot.count + ' stored' + (slot.bounty ? ', gold' :'') + ttl;
}
function uiLedgerSlotAttrs(rig,slot,action) {
const attrs = { type:'button','data-action':action,'data-focus-key':'ledger-slot-' + slot.k,'aria-label':uiLedgerSlotLabel(rig.state,slot) };
if (Object.hasOwn(LG_SLOT_KEYS,slot.k)) attrs['data-key'] = LG_SLOT_KEYS[slot.k];
if (rig.armed && slot.count === 0) attrs['aria-disabled'] = 'true';
return attrs;
}
function uiLedgerSlot(rig,slot) {
const action = (rig.armed ? 'ledger-evict-' :'ledger-pair-') + slot.k;
const fx = uiLedgerSlotFx(rig,slot.k);
const coach = uiLedgerCoachTarget(rig) === 'ledger-slot-' + slot.k ? ' is-coach' :'';
const marks = (slot.bounty ? ' is-gold' :'') + (rig.armed && slot.count > 0 ? ' is-armed' :'') + coach + fx.className;
return uiEl('button',{ className:'btn lg-slot lg-count-' + Math.min(slot.count,LG_COUNT_TOP) + marks,attrs:uiLedgerSlotAttrs(rig,slot,action),children:[
uiEl('span',{ className:'lg-slot-key',text:String(slot.k) }),
uiEl('span',{ className:'lg-slot-count',text:slot.count > 0 ? '×' + slot.count :'' }),
uiLedgerTtl(rig.state,slot),fx.child,
] });
}
function uiLedgerStoredPips(board) {
const pips = Array.from({ length:board.cap },(_,index) => uiEl('span',{ className:'lg-pip ' + (index < board.stored ? 'is-on' :'is-off') }));
const full = board.stored >= board.cap ? ' is-full' :'';
const ttl = board.ttl ? uiEl('span',{ className:'lg-ttl-rule',text:'STALE after ' + board.ttl }) :null;
return uiEl('div',{ className:'lg-ledger-head' + full,children:[
uiEl('span',{ className:'lg-ledger-title',text:'LEDGER' }),ttl,
uiEl('span',{ className:'lg-stored',attrs:{ 'aria-label':'Stored ' + board.stored + ' of ' + board.cap },children:[uiEl('span',{ className:'lg-pips',children:pips }),uiEl('span',{ className:'lg-stat-value',text:board.stored + '/' + board.cap })] }),
] });
}
function uiLedgerBoardFx(rig) {
const fx = rig.fx;
if (!fx) return '';
return ({ wrong:' is-shake',overflow:' is-spill' }[fx.kind] || '') + (fx.end === 'won' ? ' is-balanced' :'');
}
function uiLedgerBoard(app,board) {
const rig = app.rig;
const wide = board.slots.length > LG_PAD_SLOTS ? ' is-wide' :'';
const armed = rig.armed ? ' is-armed' :'';
return uiEl('div',{ className:'lg-board' + wide + armed + uiLedgerBoardFx(rig),attrs:{ role:'group','aria-label':'Ledger slots' },children:board.slots.map((slot) => uiLedgerSlot(rig,slot)) });
}


function uiLedgerEvictCode(rig) {
const target = uiLedgerCoachTarget(rig) || '';
const slot = target.startsWith('ledger-slot-') ? target.slice('ledger-slot-'.length) :null;
const move = moves(rig.state).find((item) => item.id === 'evict:' + slot);
return move ? move.code :LG_VERBS.evict.code;
}
function uiLedgerVerbAttrs(rig,verb) {
const spec = LG_VERBS[verb];
const attrs = { type:'button','data-action':spec.action,'data-focus-key':spec.action,'data-key':spec.key };
if (verb !== 'evict') return attrs;
attrs['aria-pressed'] = String(Boolean(rig.armed));
if (!rig.armed && rig.state.stored < rig.state.cap) attrs['aria-disabled'] = 'true';
return attrs;
}
function uiLedgerVerb(rig,verb) {
const spec = LG_VERBS[verb];
const coach = uiLedgerCoachTarget(rig) === spec.action ? ' is-coach' :'';
const code = verb === 'evict' ? uiLedgerEvictCode(rig) :spec.code;
return uiEl('button',{ className:'btn lg-verb lg-verb-' + verb + coach,attrs:uiLedgerVerbAttrs(rig,verb),children:[
uiEl('span',{ className:'lg-verb-label',text:spec.label }),
uiEl('span',{ className:'lg-verb-code',text:code }),
] });
}
function uiLedgerVerbs(app) {
const verbs = Object.keys(LG_VERBS).filter((verb) => app.rig.state.level.verbs.includes(verb));
return uiEl('div',{ className:'lg-verbs lg-verbs-' + verbs.length,attrs:{ role:'group','aria-label':'Moves' },children:verbs.map((verb) => uiLedgerVerb(app.rig,verb)) });
}

function uiLedgerPlayView(app,header,lines) {
const board = view(app.rig.state);
return uiEl('section',{ className:'screen rig-screen lg-screen lg-play' + (app.rig.ending ? ' is-ending' :''),attrs:{ 'data-screen':'rig' },children:[
header,uiLedgerHud(app,board),uiLedgerLinesView(lines),uiLedgerBelt(app,board),uiLedgerToast(app),
uiEl('div',{ className:'lg-deck',children:[uiLedgerStoredPips(board),uiLedgerBoard(app,board),uiLedgerVerbs(app)] }),
] });
}

export { uiLedgerPlayView, uiLedgerIntegrity, uiLedgerLevelTag };

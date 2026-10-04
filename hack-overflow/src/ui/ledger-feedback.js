import { GAME_EVENT } from '../game/game-events.js';
import { view } from '../game/rigs/ledger.js';
import { uiEmit } from './bus.js';

const LG_RIG_ID = 'ledger';

function uiLedgerPlace(verb) {
uiEmit(GAME_EVENT.RIG_PLACE,{ rigId:LG_RIG_ID,verb });
}
function uiLedgerPaired(state,entry) {
uiEmit(GAME_EVENT.RIG_GOOD,{ rigId:LG_RIG_ID,chain:state.chain });
if (entry.bounty) uiLedgerPlace('bounty-pair');
const gold = entry.bounty ? ' GOLD' :'';
const chain = entry.mult > 1 ? ' Chain ×' + entry.mult + '.' :'';
return { kind:'good',text:'PAIR ' + entry.x + ' + ' + entry.k + ' = ' + state.target + '  +' + entry.points + gold,
spoken:'Paired ' + entry.x + ' with ' + entry.k + '. Plus ' + entry.points + '.' + chain + ' Score ' + state.score + '.',
fx:{ kind:'pair',slot:entry.k,points:entry.points,bounty:entry.bounty } };
}
function uiLedgerWrong(state,entry) {
uiEmit(GAME_EVENT.RIG_BAD,{ rigId:LG_RIG_ID,reason:entry.reason });
const lost = entry.lost ? ' Packet lost.' :'';
return { kind:'bad',text:'WRONG PAIR: ' + entry.note + lost,spoken:'Wrong pair: ' + entry.note + ' Integrity ' + state.integrity + '.' + lost,
fx:{ kind:'wrong',slot:entry.k,lost:entry.lost,value:entry.x } };
}
function uiLedgerStoredSpoken(state) {
return 'Stored ' + state.stored + ' of ' + state.cap + '.';
}
function uiLedgerPlaced(state,entry) {
uiLedgerPlace(entry.verb);
const lines = {
store:{ text:'STORED ' + entry.x + '  ' + entry.code,spoken:'Stored ' + entry.x + '.',fx:{ kind:'store',slot:entry.x,value:entry.x,bounty:entry.bounty } },
drop:{ text:'DROPPED ' + entry.x + '  continue',spoken:'Dropped ' + entry.x + '.',fx:{ kind:'drop',value:entry.x } },
evict:{ text:'EVICTED ' + entry.k + '  ' + entry.code,spoken:'Evicted ' + entry.k + '. ' + uiLedgerStoredSpoken(state),fx:{ kind:'evict',slot:entry.k } },
}[entry.verb];
return { kind:'info',...lines };
}
function uiLedgerStale(state,feedback) {
const stale = view(state).stale;
if (!stale.length) return feedback;
uiLedgerPlace('stale');
const which = stale.join(' and ');
const text = 'STALE: the ' + which + ' sat ' + state.ttl + ' packets and left the ledger.';
return { ...feedback,kind:feedback.kind === 'bad' ? 'bad' :'stale',text:feedback.text + '  ' + text,spoken:feedback.spoken + ' ' + text,fx:{ ...feedback.fx,stale } };
}
function uiLedgerFeedback(state,entry) {
if (entry.verb !== 'pair') return uiLedgerStale(state,uiLedgerPlaced(state,entry));
return uiLedgerStale(state,entry.ok ? uiLedgerPaired(state,entry) :uiLedgerWrong(state,entry));
}
function uiLedgerOverflow(entry) {
return { kind:'bad',text:'OVERFLOW: no room for the ' + entry.x + '.',spoken:'',fx:{ kind:'overflow',value:entry.x } };
}

export { uiLedgerFeedback, uiLedgerOverflow, uiLedgerPlace, uiLedgerStoredSpoken, LG_RIG_ID };

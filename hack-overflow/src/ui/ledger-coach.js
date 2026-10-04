import { LEDGER } from '../game/rigs/data/ledger-levels.js';
import { apply, bestScoreFrom, moves } from '../game/rigs/ledger.js';

const LG_COACH_OPENING = 2;
const LG_COACH_DONE = 'Your call now.';
const LG_PREFER = ['pair','store-ahead','lesson','drop','store','evict'];

function uiLedgerSlotKey(slot) {
return 'ledger-slot-' + slot;
}
function uiLedgerLesson(levelIndex) {
if (levelIndex === 0) return 'pair';
const before = LEDGER.levels[levelIndex - 1].verbs;
return LEDGER.levels[levelIndex].verbs.find((verb) => !before.includes(verb));
}
function uiLedgerNow(state) {
const value = state.stream[state.i];
return { value,need:state.target - value,ahead:state.stream.slice(state.i + 1,state.i + 1 + state.level.preview) };
}
function uiLedgerEndInView(state) {
return state.i + 1 + state.level.preview >= state.stream.length;
}


function uiLedgerSensible(state,move) {
const [verb,arg] = move.id.split(':');
if (verb !== 'pair') return true;
const need = uiLedgerNow(state).need;
return Number(arg) === need && (state.seen[need] || 0) > 0;
}
function uiLedgerRank(state,id,lesson) {
const verb = id.split(':')[0];
if (verb === 'store' && uiLedgerNow(state).ahead.includes(uiLedgerNow(state).need)) return LG_PREFER.indexOf('store-ahead');
if (verb === lesson && verb !== 'pair') return LG_PREFER.indexOf('lesson');
return LG_PREFER.indexOf(verb);
}
function uiLedgerBetter(line,pick) {
return line.reach > pick.reach || (line.reach === pick.reach && line.rank < pick.rank);
}
function uiLedgerBestMove(state,lesson) {
const lines = moves(state).filter((move) => uiLedgerSensible(state,move)).map(function (move) {
const next = apply(state,move.id);
return { id:move.id,reach:next.score + bestScoreFrom(next),rank:uiLedgerRank(state,move.id,lesson) };
});
const best = lines.reduce((pick,line) => uiLedgerBetter(line,pick) ? line :pick,{ id:null,reach:-Infinity,rank:LG_PREFER.length });
return best.id;
}


function uiLedgerA(value) {
return (/^(8|11|18)$/.test(String(value)) ? 'an ' :'a ') + value;
}
function uiLedgerSum(state) {
const { value,need } = uiLedgerNow(state);
return 'Need = ' + state.target + ' - ' + value + ' = ' + need + '. ';
}
function uiLedgerWhyPair(state) {
const { value,need } = uiLedgerNow(state);
const gold = state.bounty.includes(state.i) ? ' GOLD: ×3!' :'';
return 'Slot ' + need + ' holds ' + uiLedgerA(need) + '. Tap slot ' + need + ' to PAIR the ' + value + '.' + gold;
}
function uiLedgerWhyStore(state) {
const { value,need,ahead } = uiLedgerNow(state);
if (ahead.includes(need)) return 'There is ' + uiLedgerA(need) + ' in the preview. STORE the ' + value + ' so it can pair.';
return 'Slot ' + need + ' is empty. STORE the ' + value + ', so a later ' + need + ' can find it.';
}
function uiLedgerWhyDrop(state) {
const { value,need,ahead } = uiLedgerNow(state);
if (ahead.includes(need)) return 'DROP the ' + value + ': its slot is worth more to a bigger pair.';
if (uiLedgerEndInView(state)) return 'No ' + need + ' is coming: only what the preview shows is left. DROP the ' + value + '.';
return 'No ' + need + ' in the preview. DROP the ' + value + ' and keep the slot free.';
}
function uiLedgerWhyEvict(state,slot,armed) {
if (armed) return 'EVICT armed. Tap slot ' + slot + ' to free it.';
const partner = state.target - slot;
const why = uiLedgerNow(state).ahead.includes(partner) ? 'Ledger full.' :'Ledger full, and no ' + partner + ' in the preview for the ' + slot + '.';
return why + ' Tap EVICT, then slot ' + slot + '.';
}
function uiLedgerCoachMove(state,id,armed) {
const [verb,arg] = id.split(':');
const slot = Number(arg);
if (verb === 'pair') return { line:uiLedgerWhyPair(state),target:uiLedgerSlotKey(slot) };
if (verb === 'evict') return { line:uiLedgerWhyEvict(state,slot,armed),target:armed ? uiLedgerSlotKey(slot) :'ledger-evict' };
return { line:verb === 'drop' ? uiLedgerWhyDrop(state) :uiLedgerWhyStore(state),target:'ledger-' + verb };
}


function uiLedgerPlayed(state,lesson) {
return state.log.findIndex((entry) => entry.verb === lesson && entry.ok);
}
function uiLedgerFirstPairsCoach(state) {
const { need } = uiLedgerNow(state);
const id = (state.seen[need] || 0) > 0 ? 'pair:' + need :'store';
const move = uiLedgerCoachMove(state,id,false);
return { line:uiLedgerSum(state) + move.line,target:move.target };
}
function uiLedgerSpeaks(state,lesson,id) {
const evictOpen = lesson === 'evict' && state.stored >= state.cap;
return state.log.length < LG_COACH_OPENING || id.split(':')[0] === lesson || evictOpen;
}
function uiLedgerLessonCoach(state,lesson,armed) {
const id = uiLedgerBestMove(state,lesson);
if (!id || !uiLedgerSpeaks(state,lesson,id)) return null;
return uiLedgerCoachMove(state,id,armed);
}
function uiLedgerCoachNow(state,levelIndex,armed) {
if (state.status !== 'play') return null;
const lesson = uiLedgerLesson(levelIndex);
const played = uiLedgerPlayed(state,lesson);
if (played >= 0) return played === state.log.length - 1 ? { line:LG_COACH_DONE,target:null } :null;
return levelIndex === 0 ? uiLedgerFirstPairsCoach(state) :uiLedgerLessonCoach(state,lesson,armed);
}


const LG_GOALS = [
(state) => 'Pair them all. ' + state.integrity + ' wrong pairs and you are traced.',
() => 'New: DROP lets a packet go by. A wrong pair now loses the packet.',
(state) => 'New: stored packets go STALE after ' + state.ttl + ' packets. EVICT frees a slot.',
];
function uiLedgerGoldInView(state) {
return state.bounty.some((at) => at >= state.i && at <= state.i + state.level.preview);
}
function uiLedgerGoldNote(state,levelIndex) {
const paidGold = state.log.some((entry) => entry.verb === 'pair' && entry.ok && entry.bounty);
if (levelIndex !== 0 || paidGold || !uiLedgerGoldInView(state)) return null;
return 'GOLD packet: a pair with it scores ×3.';
}
function uiLedgerLines(state,levelIndex,coach) {
const goal = state.log.length === 0 && state.status === 'play' ? LG_GOALS[levelIndex](state) :null;
return [goal,coach ? coach.line :null,uiLedgerGoldNote(state,levelIndex)].filter(Boolean).slice(0,LG_COACH_OPENING);
}

export { uiLedgerCoachNow, uiLedgerLines, uiLedgerBestMove, uiLedgerLesson };

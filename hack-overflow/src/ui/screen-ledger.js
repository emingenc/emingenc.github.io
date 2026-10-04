import { GAME_EVENT } from '../game/game-events.js';
import { rigOf } from '../game/rig-catalog.js';
import { labBest } from '../game/save.js';
import { LEDGER } from '../game/rigs/data/ledger-levels.js';
import { apply, create, moves, status } from '../game/rigs/ledger.js';
import { uiEl } from './dom.js';
import { uiEmit } from './bus.js';
import { uiLedgerCoachNow, uiLedgerLines } from './ledger-coach.js';
import { uiLedgerIntegrity, uiLedgerLevelTag, uiLedgerPlayView } from './ledger-board.js';
import { LG_RIG_ID, uiLedgerFeedback, uiLedgerOverflow, uiLedgerPlace } from './ledger-feedback.js';
import { uiLedgerCard, uiLedgerEnding } from './ledger-result.js';
import { uiRigEnd, uiRigFocusKey, uiRigHeader, uiRigResult, uiRigSelect, uiRigShellAction, uiRigShellOpen, uiRigShellSync, uiRigVariant } from './rig-shell.js';

const LG_STORE = 'ledger-store';
const LG_DROP = 'ledger-drop';
const LG_EVICT = 'ledger-evict';
const LG_SLOT_ACTION = /^ledger-(pair|evict)-(\d+)$/;
const LG_VERB_KEYS = { s:LG_STORE,d:LG_DROP,e:LG_EVICT };
const LG_VERB_OF = { [LG_STORE]:'store',[LG_DROP]:'drop',[LG_EVICT]:'evict' };
const LG_SLOT_KEYS = { 1:1,2:2,3:3,4:4,5:5,6:6,7:7,8:8,9:9,0:10,'-':11 };
const LG_REPEAT_TAP_MS = 150;
const LG_ARMED_AGAIN = 'EVICT still armed: tap a stored slot.';
const LG_MACHINE = { rig:rigOf(LG_RIG_ID),titles:LEDGER.levels.map((level) => level.title),start:uiLedgerStart };

function uiLedgerLevel(app) {
return LEDGER.levels[app.rig.levelIndex];
}
function uiLedgerHas(app,verb) {
return uiLedgerLevel(app).verbs.includes(verb);
}


function uiLedgerCoachDue(app) {
const rig = app.rig;
const levelId = LG_MACHINE.rig.levels[rig.levelIndex];
return rig.tries[rig.levelIndex] === 0 && labBest(app.game.save,LG_MACHINE.rig.labId,levelId) === 0;
}
function uiLedgerCoachUpdate(rig) {
rig.coach = rig.coaching ? uiLedgerCoachNow(rig.state,rig.levelIndex,Boolean(rig.armed)) :null;
rig.lines = uiLedgerLines(rig.state,rig.levelIndex,rig.coach);
}
function uiLedgerFocusAfter(app,used) {
const target = app.rig.coach ? app.rig.coach.target :null;
app.lastFocusKey = target || used;
}


function uiLedgerPacketSpoken(rig) {
const packet = rig.state.stream[rig.state.i];
const gold = rig.state.bounty.includes(rig.state.i) ? ', gold' :'';
return 'Packet ' + packet + gold + '.' + (rig.lines.length ? ' ' + rig.lines.join(' ') :'');
}
function uiLedgerOpening(app) {
const rig = app.rig;
const board = 'Target ' + rig.state.target + '. Packet 1 of ' + rig.state.stream.length + '. ';
return LG_MACHINE.rig.title + ', level ' + (rig.levelIndex + 1) + '. ' + board + uiLedgerPacketSpoken(rig);
}
function uiLedgerStart(app) {
const rig = app.rig;
rig.state = create(uiLedgerLevel(app),uiRigVariant(app,LG_MACHINE));
Object.assign(rig,{ view:'play',armed:false,fx:null,toast:null,coaching:uiLedgerCoachDue(app),lastTap:null,repeatTap:null });
uiLedgerCoachUpdate(rig);
uiLedgerFocusAfter(app,LG_STORE);
app.pendingAnnounce = uiLedgerOpening(app);
}


function uiLedgerRefuse(app,text) {
uiEmit(GAME_EVENT.RIG_BAD,{ rigId:LG_RIG_ID,reason:'refused' });
app.rig.toast = { kind:'bad',text };
app.pendingAnnounce = text;
}
function uiLedgerRefusal(rig,moveId) {
const [verb,slot] = moveId.split(':');
if (verb === 'evict') return rig.armed ? 'Slot ' + slot + ' is empty. ' + LG_ARMED_AGAIN :'EVICT works on a full ledger only.';
return 'That move is not open here.';
}
function uiLedgerSpokenAfter(rig,entry,spoken) {
const samePacket = entry.verb === 'evict' || (!entry.ok && !entry.lost);
return samePacket ? spoken + (rig.lines.length ? ' ' + rig.lines.join(' ') :'') :spoken + ' ' + uiLedgerPacketSpoken(rig);
}
function uiLedgerEnd(app,feedback) {
const rig = app.rig;
Object.assign(rig,{ toast:{ kind:feedback.kind,text:feedback.text },fx:{ ...feedback.fx,end:rig.state.status },coach:null,lines:[] });
uiRigEnd(app,LG_MACHINE,uiLedgerEnding(rig.state));
}
function uiLedgerMove(app,moveId) {
const rig = app.rig;
const before = rig.state;
rig.state = apply(before,moveId);
if (rig.state === before) return uiLedgerRefuse(app,uiLedgerRefusal(rig,moveId));
rig.armed = false;
const entry = rig.state.log[rig.state.log.length - 1];
if (!entry.ok && entry.verb === 'store') return uiLedgerEnd(app,uiLedgerOverflow(entry));
const feedback = uiLedgerFeedback(rig.state,entry);
if (status(rig.state) !== 'play') return uiLedgerEnd(app,feedback);
Object.assign(rig,{ toast:{ kind:feedback.kind,text:feedback.text },fx:feedback.fx });
uiLedgerCoachUpdate(rig);
app.pendingAnnounce = uiLedgerSpokenAfter(rig,entry,feedback.spoken);
}
function uiLedgerToggleEvict(app) {
const rig = app.rig;
if (!rig.armed && !moves(rig.state).some((move) => move.id.startsWith('evict:'))) return uiLedgerRefuse(app,'EVICT works on a full ledger only.');
rig.armed = !rig.armed;
uiLedgerPlace(rig.armed ? 'arm' :'disarm');
rig.toast = { kind:'info',text:rig.armed ? 'EVICT armed: tap a stored slot to free it.' :'EVICT off.' };
uiLedgerCoachUpdate(rig);
app.pendingAnnounce = rig.toast.text;
}
function uiLedgerSlotAction(app,actionId) {
const match = LG_SLOT_ACTION.exec(actionId);
if (!match) return false;
uiLedgerMove(app,match[1] + ':' + match[2]);
uiLedgerFocusAfter(app,'ledger-slot-' + match[2]);
return true;
}
function uiLedgerVerbAction(app,actionId) {
const verb = LG_VERB_OF[actionId];
if (!verb || !uiLedgerHas(app,verb)) return false;
if (verb === 'evict') uiLedgerToggleEvict(app);
else uiLedgerMove(app,verb);
uiLedgerFocusAfter(app,actionId);
return true;
}
function uiLedgerBounced(rig,actionId) {
const bounced = rig.repeatTap === actionId;
rig.repeatTap = null;
return bounced;
}
function uiLedgerApplyAction(app,actionId) {
if (!app.rig) return false;
if (uiLedgerBounced(app.rig,actionId)) return true;
if (uiRigShellAction(app,LG_MACHINE,actionId)) return true;
if (app.rig.view !== 'play') return actionId.startsWith('ledger-');
app.rig.fx = null;
return uiLedgerVerbAction(app,actionId) || uiLedgerSlotAction(app,actionId);
}
function uiLedgerTapId(event) {
const el = event && event.target && event.target.closest ? event.target.closest('[data-action]') :null;
return el ? el.getAttribute('data-action') :null;
}
function uiLedgerPointerDown(event,app) {
if (!app.rig) return false;
const id = uiLedgerTapId(event);
const last = app.rig.lastTap;
const bounced = Boolean(id && last && last.id === id && event.timeStamp - last.at < LG_REPEAT_TAP_MS);
app.rig.repeatTap = bounced ? id :null;
app.rig.lastTap = { id,at:event.timeStamp };
return false;
}


function uiLedgerPlayKey(app,key) {
const verbAction = LG_VERB_KEYS[key.toLowerCase()];
if (verbAction) return uiLedgerHas(app,LG_VERB_OF[verbAction]) ? verbAction :null;
const slot = Object.hasOwn(LG_SLOT_KEYS,key) ? LG_SLOT_KEYS[key] :0;
if (slot === 0 || slot >= app.rig.state.target) return null;
return (app.rig.armed ? 'ledger-evict-' :'ledger-pair-') + slot;
}
function uiLedgerSelectKey(key) {
const index = Number(key) - 1;
return /^[1-9]$/.test(key) && index < LEDGER.levels.length ? 'rig-level-' + index :null;
}
function uiLedgerKeyId(event,app) {
if (event.key === 'Escape') return app.rig.armed && app.rig.view === 'play' ? LG_EVICT :'rig-back';
if (app.rig.view === 'select') return uiLedgerSelectKey(event.key);
return app.rig.view === 'play' ? uiLedgerPlayKey(app,event.key) :null;
}
function uiLedgerKeyAction(event,app) {
if (!app.rig) return null;
app.rig.repeatTap = null;
const id = uiLedgerKeyId(event,app);
if (!id) return null;
event.preventDefault();
return event.repeat ? { type:'handled' } :{ type:'action',id };
}


function uiLedgerRenderPlay(app) {
const header = uiRigHeader(LG_MACHINE,[uiLedgerLevelTag(app),uiLedgerIntegrity(app.rig.state.integrity)]);
return uiLedgerPlayView(app,header,app.rig.lines || []);
}
const LG_VIEWS = {
play:uiLedgerRenderPlay,
result:(app) => uiRigResult(app,LG_MACHINE,uiLedgerCard(app.rig.state)),
select:(app) => uiRigSelect(app,LG_MACHINE,'lg-screen'),
};
function uiLedgerRender(app) {
if (!app.rig) return uiEl('section',{ className:'screen rig-screen',attrs:{ 'data-screen':'rig' } });
return LG_VIEWS[app.rig.view](app);
}
function uiLedgerAnnounce(app) {
if (app.rig && app.rig.view === 'play') return uiLedgerOpening(app);
return LG_MACHINE.rig.title + '. Pick a level.';
}
function uiLedgerFocusKey(app) {
if (!app.rig || app.rig.view !== 'play') return uiRigFocusKey(app);
return app.rig.coach && app.rig.coach.target ? app.rig.coach.target :LG_STORE;
}
function uiLedgerAimFlight(root) {
const fly = root && root.querySelector ? root.querySelector('.lg-fly') :null;
const from = fly && root.querySelector('.lg-now');
if (!from || !fly.getBoundingClientRect) return;
const start = from.getBoundingClientRect();
const end = fly.getBoundingClientRect();
fly.style.setProperty('--lg-fly-x',Math.round(start.left - end.left) + 'px');
fly.style.setProperty('--lg-fly-y',Math.round(start.top - end.top) + 'px');
}
function uiLedgerSync(app,active,root) {
uiRigShellSync(app,active);
if (!active || !app.rig) return;
if (app.rig.fx && app.rig.fx.kind === 'store') uiLedgerAimFlight(root);
app.rig.fx = null;
}
function uiRigOpen(app) {
uiRigShellOpen(app,LG_MACHINE);
app.pendingAnnounce = null;
}
function uiRigScreen() {
return {
id:'rig',render:uiLedgerRender,focusKey:uiLedgerFocusKey,announce:uiLedgerAnnounce,
keyAction:uiLedgerKeyAction,applyAction:uiLedgerApplyAction,pointerDown:uiLedgerPointerDown,sync:uiLedgerSync,
};
}

export { uiRigScreen, uiRigOpen };

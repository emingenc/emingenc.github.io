import { hasBeat,withBeat } from '../ext/ops.js';
import { tagsOf } from '../ext/power-ops.js';
import { BEATS,flagOf } from './contract.js';

const REWARD_BEAT_PREFIX = 'reward-';
const PATCH_TAG = 'patch-0';
const RANK_PER_LINE = 5;
const RANK_SOURCE = 'reward-lines';
const SYSTEM = 'SYSTEM';
const BIT = 'BIT';
const BANK = 'MEMORY BANK';
const COMMIT = 'COMMIT';
const COMMIT_LINES = Object.freeze([
"I approved his helper without reading. Don't be me.",
'Green checks are not a review.',
'Open the diff. Every time.',
'Measure twice. Commit once.',
'The bench is yours now.',
]);
const REWARD_SETUP = Object.freeze([
'SYSTEM: process patch: unreferenced -> GC eligible.',
"BIT: He's not gone. He's unreferenced.",
]);
const OPEN_ASK = Object.freeze({
tagged:'Reference his commit before the GC sweeps it. It is tagged: RECALL patch-0.',
untagged:'Reference his commit before the GC sweeps it. It is not tagged: scan. The GC takes one block a turn.',
});
const MOVE_TEXTS = Object.freeze({
recall:'LOOKUP patch-0: O(1) get. Every block referenced.',
scan:(step,total) => 'BIT: Not in your map. Scan ' + step + ' of ' + total + '.',
swept:(block) => 'GC: swept block ' + block + '.',
});

function stateCount(reward,state) {
return reward.blocks.filter((block) => block.state === state).length;
}
function liveBlocks(reward) {
return reward.blocks.filter((block) => block.state === 'live');
}
function setState(reward,block,state) {
return { ...reward,blocks:reward.blocks.map((one) => (one.n === block.n ? { ...one,state } :one)) };
}
function taken(ext) {
return hasBeat(ext,BEATS.home) || (hasBeat(ext,BEATS.ordeal) && flagOf(ext) !== null);
}

function rewardSaved(ext) {
const kept = COMMIT_LINES.map((_,at) => at + 1).filter((lines) => hasBeat(ext,REWARD_BEAT_PREFIX + lines));
return kept.length > 0 ? Math.max(...kept) :0;
}
function rewardDone(ext) {
return rewardSaved(ext) > 0;
}
function rewardDue(ext,save) {
const ended = Boolean(save) && save.ended === true;
return hasBeat(ext,BEATS.m4) && taken(ext) && !hasBeat(ext,BEATS.roadback) && !rewardDone(ext) && !ended;
}
function commitTagged(ext) {
const told = flagOf(ext) !== null && hasBeat(ext,BEATS.m5);
return Object.hasOwn(tagsOf(ext),PATCH_TAG) || told || flagOf(ext) === 'reviewed';
}
function createReward(ext) {
return { tagged:commitTagged(ext),turn:0,blocks:COMMIT_LINES.map((text,at) => ({ n:at + 1,text,state:'live' })) };
}
function scanTotal(reward) {
return Math.ceil(reward.blocks.length / 2);
}
function rewardStep(reward) {
if (liveBlocks(reward).length === 0) return { reward,texts:[],done:true };
const turn = reward.turn + 1;
if (reward.tagged) {
const all = { ...reward,turn,blocks:reward.blocks.map((block) => ({ ...block,state:'ref' })) };
return { reward:all,texts:[MOVE_TEXTS.recall],done:true };
}
const scanned = setState({ ...reward,turn },liveBlocks(reward)[0],'ref');
const texts = [MOVE_TEXTS.scan(turn,scanTotal(reward))];
const left = liveBlocks(scanned);
if (left.length === 0) return { reward:scanned,texts,done:true };
const last = left.at(-1);
texts.push(MOVE_TEXTS.swept(last.n));
const swept = setState(scanned,last,'swept');
return { reward:swept,texts,done:liveBlocks(swept).length === 0 };
}
function rewardOutcome(reward) {
const kept = reward.blocks.filter((block) => block.state === 'ref');
return {
swept:stateCount(reward,'swept'),lines:kept.map((block) => block.text),
rank:kept.length * RANK_PER_LINE,beat:REWARD_BEAT_PREFIX + kept.length,source:RANK_SOURCE,
};
}
function withReward(ext,outcome) {
return withBeat(ext,outcome.beat);
}
function rewardView(reward) {
const next = liveBlocks(reward).at(-1);
const total = scanTotal(reward);
const label = reward.tagged ? 'RECALL patch-0' :'SCAN ' + (reward.turn + 1) + '/' + total;
const aria = reward.tagged ? 'Recall patch-0, one lookup references every block' :'Scan block ' + (reward.turn + 1) + ' of ' + total;
return {
n:0,head:'GC SWEEP',count:'SAVED ' + stateCount(reward,'ref') + '/' + reward.blocks.length + ' . SWEPT ' + stateCount(reward,'swept'),
ask:reward.tagged ? 'patch-0 TAGGED: ONE GET' :'NOT TAGGED: SCAN',tele:next ? 'GC takes block ' + next.n + ' next' :'',note:'',fiction:'',
chips:[{ id:'step',label,aria }],
};
}
function openingSheet(tagged) {
const [system,bit] = REWARD_SETUP.map((line) => line.slice(line.indexOf(':') + 2));
return {
id:'reward-open',
lines:[{ who:SYSTEM,text:system },{ who:BIT,text:bit },{ who:BIT,text:tagged ? OPEN_ASK.tagged :OPEN_ASK.untagged }],
choices:[{ id:'go',label:'REFERENCE IT' },{ id:'later',label:'NOT NOW',default:true }],
};
}
function restoreSheet(outcome) {
const lines = [{ who:BANK,text:'restore ' + PATCH_TAG },...outcome.lines.map((text) => ({ who:COMMIT,text }))];
if (outcome.swept > 0) lines.push({ who:SYSTEM,text:'gc: ' + outcome.swept + (outcome.swept === 1 ? ' block' :' blocks') + ' swept. Gone.' });
return { id:'reward-restore',lines,choices:[{ id:'on',label:'KEEP GOING',default:true },{ id:'again',label:'READ IT AGAIN' }] };
}

export {
REWARD_BEAT_PREFIX,PATCH_TAG,RANK_PER_LINE,RANK_SOURCE,COMMIT_LINES,REWARD_SETUP,
rewardSaved,rewardDone,rewardDue,commitTagged,createReward,scanTotal,rewardStep,rewardOutcome,withReward,rewardView,openingSheet,restoreSheet,
};

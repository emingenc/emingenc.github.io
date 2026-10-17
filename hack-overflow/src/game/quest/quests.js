const STAGE = { unseen:0,offered:1,active:2,done:3 };
const PILL_MAX = 32;
const PILL_SEP = ' . ';
const BAD_MAX = 99;
const APOSTROPHES = /['’]/;

function quest({ id,name,giver,goal,reward }) {
return Object.freeze({ id,name,giver,need:goal.need,goal:goal.label,slip:goal.slip,pill:goal.pill || null,reward:Object.freeze({ label:null,...reward }) });
}
const FIRST_COMMIT = quest({
id:'first-commit',name:'FIRST COMMIT',giver:'PATCH',goal:{ need:3,label:'crates',slip:null },reward:{ rank:10,find:null },
});
const PATROL_PAIR = quest({
id:'patrol-pair',name:'PATROL PAIR',giver:'SIGN',goal:{ need:1,label:'pair',slip:'misses' },reward:{ rank:0,find:'receipt-4470' },
});
const RECEIPT_RUN = quest({
id:'receipt-run',name:'RECEIPT RUN',giver:'TALLY',reward:{ rank:30,find:null },
goal:{ need:3,label:'pairs',slip:'rescans',pill:'clear the turret' },
});
const MEET_IN_THE_MIDDLE = quest({
id:'meet-in-the-middle',name:'MEET IN THE MIDDLE',giver:'TWINS',goal:{ need:1,label:'sum',slip:'over par' },reward:{ rank:30,find:null },
});
const DISH_RUSH = quest({
id:'dish-rush',name:'DISH RUSH',giver:'BRACE',goal:{ need:1,label:'orders',slip:'cracks' },reward:{ rank:30,find:null },
});
const LOST_BYTES = quest({
id:'lost-bytes',name:'LOST BYTES',giver:'BIT',goal:{ need:3,label:'bytes',slip:'steps' },reward:{ rank:0,find:'name-tag',label:'name tag' },
});
const DOUBLE_BILLED = quest({
id:'double-billed',name:'DOUBLE BILLED',giver:'TALLY',goal:{ need:1,label:'repeat',slip:null },reward:{ rank:0,find:'dup-receipt',label:'dup receipt' },
});
const ANAGRAM_BINS = quest({
id:'anagram-bins',name:'ANAGRAM BINS',giver:'TALLY',goal:{ need:3,label:'bins',slip:'misfiles' },reward:{ rank:0,find:'freq-key',label:'frequency key' },
});
const MIRROR_SIGN = quest({
id:'mirror-sign',name:'MIRROR SIGN',giver:'TWINS',goal:{ need:1,label:'pair',slip:'taps' },reward:{ rank:0,find:'twin-pin',label:'twin pin' },
});
const UNDO = quest({
id:'undo',name:'UNDO',giver:'BRACE',goal:{ need:4,label:'spills',slip:'wrong' },reward:{ rank:0,find:'undo-log',label:'undo log' },
});
const UNREFERENCED = quest({
id:'unreferenced',name:'THE UNREFERENCED',giver:'NULL',goal:{ need:1,label:'ref',slip:null,pill:'tag it, walk it home' },reward:{ rank:0,find:'gc-note',label:'GC note' },
});
const COUNTERSIGN = quest({
id:'countersign',name:'COUNTERSIGN',giver:'BRUTE',goal:{ need:1,label:'answer',slip:'wrong',pill:'two thousand codes?' },reward:{ rank:0,find:null },
});
const MOST_WATER = quest({
id:'most-water',name:'MOST WATER',giver:'TWINS',goal:{ need:1,label:'dam',slip:'moves' },reward:{ rank:0,find:'dam-gauge',label:'dam gauge' },
});
const NEXT_TALLER = quest({
id:'next-taller',name:'NEXT TALLER',giver:'BRACE',goal:{ need:4,label:'rounds',slip:'misses' },reward:{ rank:0,find:'apron',label:'apron' },
});
const CLEAR_STRETCH = quest({
id:'clear-stretch',name:'CLEAR STRETCH',giver:'SILL',goal:{ need:1,label:'net',slip:'over par' },reward:{ rank:30,find:null },
});
const CLEAR_STRETCH_W3 = quest({
id:'clear-stretch-w3',name:'CLEAR STRETCH',giver:'SILL',goal:{ need:1,label:'net',slip:'shrinks' },reward:{ rank:0,find:'stretch-tape',label:'stretch tape' },
});
const HALVING_BEAM = quest({
id:'halving-beam',name:'HALVING BEAM',giver:'ORACLE-7',goal:{ need:1,label:'shots',slip:'wasted' },reward:{ rank:30,find:null },
});
const QUESTS = {
[FIRST_COMMIT.id]:FIRST_COMMIT,[PATROL_PAIR.id]:PATROL_PAIR,[RECEIPT_RUN.id]:RECEIPT_RUN,
[MEET_IN_THE_MIDDLE.id]:MEET_IN_THE_MIDDLE,[DISH_RUSH.id]:DISH_RUSH,
[LOST_BYTES.id]:LOST_BYTES,[DOUBLE_BILLED.id]:DOUBLE_BILLED,[ANAGRAM_BINS.id]:ANAGRAM_BINS,[MIRROR_SIGN.id]:MIRROR_SIGN,
[UNDO.id]:UNDO,[UNREFERENCED.id]:UNREFERENCED,[COUNTERSIGN.id]:COUNTERSIGN,
[MOST_WATER.id]:MOST_WATER,[NEXT_TALLER.id]:NEXT_TALLER,[HALVING_BEAM.id]:HALVING_BEAM,[CLEAR_STRETCH.id]:CLEAR_STRETCH,
[CLEAR_STRETCH_W3.id]:CLEAR_STRETCH_W3,
};

function stateAt(id,stage) {
if (!Object.hasOwn(QUESTS,id)) throw new RangeError('unknown quest ' + id);
return { id,stage,n:0,bad:0 };
}
function offerQuest(id) {
return stateAt(id,STAGE.offered);
}
function startQuest(id) {
return stateAt(id,STAGE.active);
}
function stepsOf(event) {
return Number.isInteger(event.by) && event.by > 0 ? event.by :1;
}
function progressQuest(state,event) {
if (state.stage !== STAGE.active) return state;
if (event.kind === 'slip') return { ...state,bad:Math.min(BAD_MAX,state.bad + stepsOf(event)) };
if (event.kind !== 'progress') return state;
const count = Math.min(QUESTS[state.id].need,state.n + stepsOf(event));
return { ...state,n:count,stage:count >= QUESTS[state.id].need ? STAGE.done :STAGE.active };
}
function abandonQuest(state) {
return state.stage === STAGE.active ? stateAt(state.id,STAGE.offered) :state;
}
function isDone(state) {
return state.stage === STAGE.done;
}
function rewardOf(def) {
return { rank:def.reward.rank,find:def.reward.find,source:def.id };
}
function pillText(def,state) {
if (def.pill) return (def.giver + PILL_SEP + def.pill).slice(0,PILL_MAX);
const parts = [def.giver,def.goal + ' ' + state.n + '/' + def.need];
if (def.slip) parts.push(def.slip + ' ' + state.bad);
return parts.join(PILL_SEP).slice(0,PILL_MAX);
}
function noApostrophes(lines) {
return !lines.some((line) => APOSTROPHES.test(line));
}

export {
STAGE,PILL_MAX,QUESTS,FIRST_COMMIT,PATROL_PAIR,RECEIPT_RUN,MEET_IN_THE_MIDDLE,DISH_RUSH,
LOST_BYTES,DOUBLE_BILLED,ANAGRAM_BINS,MIRROR_SIGN,UNDO,UNREFERENCED,COUNTERSIGN,MOST_WATER,NEXT_TALLER,HALVING_BEAM,CLEAR_STRETCH,CLEAR_STRETCH_W3,
offerQuest,startQuest,progressQuest,abandonQuest,isDone,rewardOf,pillText,noApostrophes,
};

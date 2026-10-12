const STAGE = { unseen:0,offered:1,active:2,done:3 };
const PILL_MAX = 32;
const PILL_SEP = ' . ';
const APOSTROPHES = /['’]/;

function quest({ id,name,giver,goal,reward }) {
return Object.freeze({ id,name,giver,need:goal.need,goal:goal.label,slip:goal.slip,pill:goal.pill || null,reward:Object.freeze(reward) });
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
const MOST_WATER = quest({
id:'most-water',name:'MOST WATER',giver:'TWINS',goal:{ need:1,label:'dam',slip:'moves' },reward:{ rank:0,find:'dam-gauge',label:'dam gauge' },
});
const NEXT_TALLER = quest({
id:'next-taller',name:'NEXT TALLER',giver:'BRACE',goal:{ need:4,label:'rounds',slip:'misses' },reward:{ rank:0,find:'apron',label:'apron' },
});
const CLEAR_STRETCH = quest({
id:'clear-stretch',name:'CLEAR STRETCH',giver:'SILL',goal:{ need:1,label:'net',slip:'over par' },reward:{ rank:30,find:null },
});
const HALVING_BEAM = quest({
id:'halving-beam',name:'HALVING BEAM',giver:'ORACLE-7',goal:{ need:1,label:'shots',slip:'wasted' },reward:{ rank:30,find:null },
});
const QUESTS = {
[FIRST_COMMIT.id]:FIRST_COMMIT,[PATROL_PAIR.id]:PATROL_PAIR,[RECEIPT_RUN.id]:RECEIPT_RUN,
[MEET_IN_THE_MIDDLE.id]:MEET_IN_THE_MIDDLE,[DISH_RUSH.id]:DISH_RUSH,
[MOST_WATER.id]:MOST_WATER,[NEXT_TALLER.id]:NEXT_TALLER,[HALVING_BEAM.id]:HALVING_BEAM,[CLEAR_STRETCH.id]:CLEAR_STRETCH,
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
function progressQuest(state,event) {
if (state.stage !== STAGE.active) return state;
if (event.kind === 'slip') return { ...state,bad:state.bad + 1 };
if (event.kind !== 'progress') return state;
const count = Math.min(QUESTS[state.id].need,state.n + 1);
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
STAGE,PILL_MAX,QUESTS,FIRST_COMMIT,PATROL_PAIR,RECEIPT_RUN,MEET_IN_THE_MIDDLE,DISH_RUSH,MOST_WATER,NEXT_TALLER,HALVING_BEAM,CLEAR_STRETCH,
offerQuest,startQuest,progressQuest,abandonQuest,isDone,rewardOf,pillText,noApostrophes,
};
